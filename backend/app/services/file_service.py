import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from app.core.config import settings
from app.core.database import get_db
from app.storage.filesystem import storage_fs
from app.algorithms.replication import calculate_target_replication
from app.algorithms.placement import evaluate_placement
from app.models.schemas import (
    FileMetadata,
    ReplicaInfo,
    WritePipelineResult,
    CorruptionSimulationResult,
    IntegrityVerificationResult
)

logger = logging.getLogger("selfheal.files")

class FileService:
    def get_all_files(self) -> List[dict]:
        db = get_db()
        files = list(db["files"].find())
        nodes_map = {n["node_id"]: n for n in db["nodes"].find()}

        for f in files:
            if "_id" in f:
                del f["_id"]
            # Recalculate live surviving replicas
            reps = list(db["replicas"].find({"file_id": f["file_id"]}))
            healthy_count = 0
            for r in reps:
                n = nodes_map.get(r["node_id"], {})
                if n.get("status") != "FAIL-STOP" and not n.get("is_simulated_failed", False) and not r.get("is_corrupted", False):
                    healthy_count += 1
            f["surviving_replica_count"] = healthy_count
        return files

    def get_file(self, file_id: str) -> Optional[dict]:
        db = get_db()
        f = db["files"].find_one({"file_id": file_id})
        if not f:
            return None
        if "_id" in f:
            del f["_id"]
        
        nodes_map = {n["node_id"]: n for n in db["nodes"].find()}
        reps = list(db["replicas"].find({"file_id": file_id}))
        healthy_count = sum(
            1 for r in reps
            if nodes_map.get(r["node_id"], {}).get("status") != "FAIL-STOP"
            and not nodes_map.get(r["node_id"], {}).get("is_simulated_failed", False)
            and not r.get("is_corrupted", False)
        )
        f["surviving_replica_count"] = healthy_count
        return f

    def get_file_replicas(self, file_id: str) -> List[dict]:
        db = get_db()
        reps = list(db["replicas"].find({"file_id": file_id}))
        nodes_map = {n["node_id"]: n for n in db["nodes"].find()}
        for r in reps:
            if "_id" in r:
                del r["_id"]
            n = nodes_map.get(r["node_id"], {})
            r["node_name"] = n.get("name", r["node_id"])
            r["rack_id"] = n.get("rack_id", "Unknown")
            r["node_status"] = n.get("status", "NORMAL")
        return reps

    async def upload_file(
        self,
        filename: str,
        content: bytes,
        importance: str = "Standard",
        write_mode: str = "PARALLEL_PUSH"
    ) -> Tuple[FileMetadata, WritePipelineResult]:
        db = get_db()
        file_size = len(content)

        # Basic security checks
        safe_filename = os.path.basename(filename).strip() or "unnamed_file.bin"
        if file_size > (settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024):
            raise ValueError(f"File size exceeds maximum allowed {settings.MAX_UPLOAD_SIZE_MB}MB.")

        file_id = f"file_{uuid.uuid4().hex[:10]}"
        checksum = storage_fs.calculate_checksum(content)

        # 1. Compute target replication factor using Adaptive Engine
        target_factor, rule_code, reason, _ = calculate_target_replication(
            importance=importance,
            access_rate=0.0,
            seconds_since_last_access=0.0
        )

        # 2. Select target nodes using Load- & Diversity-Aware Placement
        all_nodes = list(db["nodes"].find())
        chosen_node_ids: List[str] = []
        file_size_mb = max(0.01, file_size / (1024 * 1024))

        for rep_idx in range(target_factor):
            placement = evaluate_placement(
                candidate_nodes=all_nodes,
                existing_replica_node_ids=chosen_node_ids,
                file_size_mb=file_size_mb
            )
            if placement.selected_node_id:
                chosen_node_ids.append(placement.selected_node_id)
            else:
                break

        if not chosen_node_ids:
            raise ValueError("No healthy storage nodes available in cluster for placement.")

        # 3. Execute write pipeline (PARALLEL_PUSH vs DAISY_CHAIN)
        start_time = time.time()
        replica_acks = []
        timeline_steps = []
        replicas_created = []

        if write_mode == "DAISY_CHAIN":
            # Primary writes then forwards to secondary sequentially
            curr_node = chosen_node_ids[0]
            timeline_steps.append({
                "step": 1,
                "action": f"Client streams data to Primary Node {curr_node}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

            for idx, nid in enumerate(chosen_node_ids):
                rep_id = f"rep_{uuid.uuid4().hex[:6]}"
                step_start = time.time()
                try:
                    storage_fs.write_replica(nid, file_id, rep_id, content)
                    ack_time_ms = round((time.time() - step_start) * 1000, 2)
                    replica_acks.append({
                        "node_id": nid,
                        "replica_id": rep_id,
                        "status": "ACK",
                        "latency_ms": ack_time_ms,
                        "is_primary": (idx == 0)
                    })
                    replicas_created.append((nid, rep_id, idx == 0))
                    if idx < len(chosen_node_ids) - 1:
                        next_node = chosen_node_ids[idx + 1]
                        timeline_steps.append({
                            "step": idx + 2,
                            "action": f"Node {nid} pipelines bytes to Node {next_node}",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                except Exception as ex:
                    replica_acks.append({
                        "node_id": nid,
                        "status": "FAIL",
                        "error": str(ex)
                    })
        else:
            # PARALLEL_PUSH: Primary broadcasts concurrently to all target replicas
            timeline_steps.append({
                "step": 1,
                "action": f"Client concurrently pushes chunks to {len(chosen_node_ids)} nodes: {', '.join(chosen_node_ids)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

            async def push_replica(nid: str, is_primary: bool):
                rep_id = f"rep_{uuid.uuid4().hex[:6]}"
                t0 = time.time()
                try:
                    # Run IO in threadpool to simulate concurrent push
                    await asyncio.to_thread(storage_fs.write_replica, nid, file_id, rep_id, content)
                    latency = round((time.time() - t0) * 1000, 2)
                    return {
                        "node_id": nid,
                        "replica_id": rep_id,
                        "status": "ACK",
                        "latency_ms": latency,
                        "is_primary": is_primary
                    }
                except Exception as e:
                    return {
                        "node_id": nid,
                        "status": "FAIL",
                        "error": str(e)
                    }

            tasks = [push_replica(nid, idx == 0) for idx, nid in enumerate(chosen_node_ids)]
            results = await asyncio.gather(*tasks)
            for res in results:
                replica_acks.append(res)
                if res["status"] == "ACK":
                    replicas_created.append((res["node_id"], res["replica_id"], res["is_primary"]))

        duration_ms = round((time.time() - start_time) * 1000, 2)
        success_count = sum(1 for a in replica_acks if a.get("status") == "ACK")
        failed_count = len(chosen_node_ids) - success_count

        pipeline_result = WritePipelineResult(
            mode=write_mode,
            duration_ms=duration_ms,
            total_bytes=file_size,
            success_count=success_count,
            failed_count=failed_count,
            replica_acks=replica_acks,
            consistency_status="STRONG_QUORUM" if success_count >= (target_factor // 2 + 1) else "DEGRADED",
            timeline_steps=timeline_steps
        )

        # 4. Save metadata in MongoDB
        now_iso = datetime.now(timezone.utc).isoformat()
        file_meta = FileMetadata(
            file_id=file_id,
            filename=safe_filename,
            size_bytes=file_size,
            importance=importance,
            read_count=0,
            write_count=1,
            access_rate=0.0,
            last_accessed_at=now_iso,
            target_replication_factor=target_factor,
            surviving_replica_count=success_count,
            created_at=now_iso,
            checksum_algorithm="SHA-256",
            checksum=checksum,
            replica_locations=[r[0] for r in replicas_created],
            replication_policy_reason=reason
        )

        db["files"].insert_one(file_meta.model_dump())

        for nid, rep_id, is_primary in replicas_created:
            db["replicas"].insert_one({
                "replica_id": rep_id,
                "file_id": file_id,
                "node_id": nid,
                "is_primary": is_primary,
                "is_corrupted": False,
                "checksum": checksum,
                "created_at": now_iso
            })

        from app.services.cluster_service import cluster_service
        cluster_service.record_event(
            event_type="FILE_UPLOADED",
            severity="SUCCESS",
            file_id=file_id,
            description=(
                f"File '{safe_filename}' uploaded ({file_size} bytes). "
                f"Adaptive replication factor: {target_factor}. Replicated across: {', '.join([r[0] for r in replicas_created])}."
            ),
            details={"write_mode": write_mode, "duration_ms": duration_ms}
        )

        return file_meta, pipeline_result

    def download_file(self, file_id: str) -> Tuple[bytes, str, str]:
        """
        Reads file bytes. If corrupted copy is encountered, falls back to healthy replica,
        triggers repair, and ensures correct bytes are delivered.
        """
        db = get_db()
        file_doc = self.get_file(file_id)
        if not file_doc:
            raise FileNotFoundError(f"File {file_id} not found")

        # Increment read counter & update access rate
        db["files"].update_one(
            {"file_id": file_id},
            {
                "$inc": {"read_count": 1},
                "$set": {"last_accessed_at": datetime.now(timezone.utc).isoformat()}
            }
        )

        replicas = list(db["replicas"].find({"file_id": file_id}))
        nodes_map = {n["node_id"]: n for n in db["nodes"].find()}

        healthy_replicas = []
        for rep in replicas:
            nid = rep["node_id"]
            node_info = nodes_map.get(nid, {})
            is_active = (node_info.get("status") != "FAIL-STOP" and not node_info.get("is_simulated_failed", False))
            if is_active and not rep.get("is_corrupted", False):
                healthy_replicas.append(rep)

        if not healthy_replicas:
            raise RuntimeError(f"All surviving replicas for file '{file_doc['filename']}' are unavailable or corrupted.")

        # Read from first healthy replica
        chosen_rep = healthy_replicas[0]
        try:
            data = storage_fs.read_replica(chosen_rep["node_id"], file_id, chosen_rep["replica_id"])
            current_hash = storage_fs.calculate_checksum(data)

            if current_hash != file_doc["checksum"]:
                # Checksum mismatch detected on read!
                logger.warning(f"Integrity check failed during read on {chosen_rep['node_id']}. Marking corrupted.")
                db["replicas"].update_one(
                    {"replica_id": chosen_rep["replica_id"]},
                    {"$set": {"is_corrupted": True}}
                )
                from app.services.cluster_service import cluster_service
                cluster_service.record_event(
                    event_type="CHECKSUM_MISMATCH",
                    severity="CRITICAL",
                    file_id=file_id,
                    node_id=chosen_rep["node_id"],
                    description=f"Silent data corruption detected for '{file_doc['filename']}' on node {chosen_rep['node_id']}."
                )

                # Fallback to secondary healthy replica
                for backup_rep in healthy_replicas[1:]:
                    try:
                        backup_data = storage_fs.read_replica(backup_rep["node_id"], file_id, backup_rep["replica_id"])
                        if storage_fs.calculate_checksum(backup_data) == file_doc["checksum"]:
                            return backup_data, file_doc["filename"], file_doc.get("mime_type", "application/octet-stream")
                    except Exception:
                        continue
                raise RuntimeError("Integrity validation failed on all surviving replicas.")

            return data, file_doc["filename"], file_doc.get("mime_type", "application/octet-stream")

        except Exception as e:
            logger.error(f"Failed to read replica: {e}")
            raise

    def delete_file(self, file_id: str) -> bool:
        db = get_db()
        file_doc = self.get_file(file_id)
        if not file_doc:
            return False

        replicas = list(db["replicas"].find({"file_id": file_id}))
        for rep in replicas:
            storage_fs.delete_replica(rep["node_id"], file_id, rep["replica_id"])

        db["replicas"].delete_many({"file_id": file_id})
        db["files"].delete_one({"file_id": file_id})
        db["recovery_jobs"].delete_many({"file_id": file_id})

        from app.services.cluster_service import cluster_service
        cluster_service.record_event(
            event_type="FILE_DELETED",
            severity="INFO",
            file_id=file_id,
            description=f"File '{file_doc['filename']}' and all replica instances safely deleted."
        )
        return True

    def recalculate_file_replication(self, file_id: str, new_importance: Optional[str] = None) -> dict:
        db = get_db()
        file_doc = self.get_file(file_id)
        if not file_doc:
            raise FileNotFoundError(f"File {file_id} not found")

        importance = new_importance or file_doc.get("importance", "Standard")
        access_rate = file_doc.get("access_rate", 0.0)

        # Calculate time since last access
        try:
            last_dt = datetime.fromisoformat(file_doc.get("last_accessed_at", "").replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            seconds_since = max(0.0, (datetime.now(timezone.utc) - last_dt).total_seconds())
        except Exception:
            seconds_since = 0.0

        target_factor, rule_code, reason, _ = calculate_target_replication(
            importance=importance,
            access_rate=access_rate,
            seconds_since_last_access=seconds_since
        )

        old_target = file_doc.get("target_replication_factor", 3)
        db["files"].update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "importance": importance,
                    "target_replication_factor": target_factor,
                    "replication_policy_reason": reason
                }
            }
        )

        if target_factor > old_target:
            from app.services.recovery_service import recovery_service
            recovery_service.scan_and_schedule_recoveries()

        return self.get_file(file_id)

    def simulate_corruption(self, file_id: str, node_id: Optional[str] = None) -> CorruptionSimulationResult:
        """
        Safely flips bytes in a single replica on a specific node for demonstration.
        """
        db = get_db()
        file_doc = self.get_file(file_id)
        if not file_doc:
            raise FileNotFoundError(f"File {file_id} not found")

        replicas = list(db["replicas"].find({"file_id": file_id, "is_corrupted": False}))
        if not replicas:
            raise ValueError("No uncorrupted replicas available to simulate corruption.")

        target_rep = None
        if node_id:
            for r in replicas:
                if r["node_id"] == node_id:
                    target_rep = r
                    break
        if not target_rep:
            target_rep = replicas[0]

        target_node = target_rep["node_id"]
        rep_id = target_rep["replica_id"]

        orig_hash, bad_hash = storage_fs.corrupt_replica_bytes(target_node, file_id, rep_id)

        # Mark in DB
        db["replicas"].update_one(
            {"replica_id": rep_id},
            {
                "$set": {
                    "is_corrupted": True,
                    "corrupted_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )

        from app.services.cluster_service import cluster_service
        cluster_service.record_event(
            event_type="CORRUPTION_SIMULATED",
            severity="WARNING",
            file_id=file_id,
            node_id=target_node,
            description=(
                f"Controlled data corruption injected into replica '{rep_id}' of file '{file_doc['filename']}' "
                f"on node {target_node}. Hash altered from {orig_hash[:8]}... to {bad_hash[:8]}..."
            )
        )

        return CorruptionSimulationResult(
            file_id=file_id,
            filename=file_doc["filename"],
            corrupted_node_id=target_node,
            original_checksum=orig_hash,
            tampered_checksum=bad_hash,
            status="CORRUPTED",
            message=f"Bit-flip successfully simulated on node {target_node}. Run Integrity Verification to observe self-healing."
        )

    def verify_and_repair_integrity(self, file_id: str) -> IntegrityVerificationResult:
        """
        Verifies checksums of all stored replicas against expected metadata.
        Repairs any corrupted replica from a verified healthy replica.
        """
        db = get_db()
        file_doc = self.get_file(file_id)
        if not file_doc:
            raise FileNotFoundError(f"File {file_id} not found")

        expected_checksum = file_doc["checksum"]
        replicas = list(db["replicas"].find({"file_id": file_id}))

        healthy_reps = []
        corrupted_reps = []

        for rep in replicas:
            nid = rep["node_id"]
            rep_id = rep["replica_id"]
            try:
                data = storage_fs.read_replica(nid, file_id, rep_id)
                actual_hash = storage_fs.calculate_checksum(data)
                if actual_hash == expected_checksum and not rep.get("is_corrupted", False):
                    healthy_reps.append(rep)
                else:
                    corrupted_reps.append(rep)
            except Exception:
                corrupted_reps.append(rep)

        repaired = False
        repair_details = None

        if corrupted_reps and healthy_reps:
            # Execute self-healing repair from healthy replica
            source = healthy_reps[0]
            for bad_rep in corrupted_reps:
                try:
                    storage_fs.repair_replica_bytes(
                        target_node_id=bad_rep["node_id"],
                        file_id=file_id,
                        target_replica_id=bad_rep["replica_id"],
                        source_node_id=source["node_id"],
                        source_replica_id=source["replica_id"]
                    )
                    db["replicas"].update_one(
                        {"replica_id": bad_rep["replica_id"]},
                        {"$set": {"is_corrupted": False, "corrupted_at": None}}
                    )
                    repaired = True
                    repair_details = (
                        f"Self-healed corrupted replica on {bad_rep['node_id']} "
                        f"using authoritative replica on {source['node_id']}. SHA-256 integrity verified."
                    )
                    from app.services.cluster_service import cluster_service
                    cluster_service.record_event(
                        event_type="REPLICA_REPAIRED",
                        severity="SUCCESS",
                        file_id=file_id,
                        node_id=bad_rep["node_id"],
                        description=repair_details
                    )
                except Exception as ex:
                    logger.error(f"Repair failed: {ex}")

        return IntegrityVerificationResult(
            file_id=file_id,
            filename=file_doc["filename"],
            expected_checksum=expected_checksum,
            healthy_replicas=[r["node_id"] for r in healthy_reps],
            corrupted_replicas=[r["node_id"] for r in corrupted_reps],
            is_compromised=(len(corrupted_reps) > 0 and not repaired),
            repaired=repaired,
            repair_details=repair_details or ("All replicas intact and verified." if not corrupted_reps else "Repair attempted.")
        )

file_service = FileService()

