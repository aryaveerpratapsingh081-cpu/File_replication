import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.core.database import get_db
from app.core.websocket import manager as ws_manager
from app.storage.filesystem import storage_fs
from app.models.schemas import RecoveryJobModel
from app.algorithms.priority_queue import calculate_urgency_score
from app.algorithms.placement import evaluate_placement

logger = logging.getLogger("selfheal.recovery")

class RecoveryService:
    def __init__(self):
        self.is_paused: bool = False

    def get_queued_jobs(self) -> List[dict]:
        db = get_db()
        jobs = list(db["recovery_jobs"].find({"status": "QUEUED"}))
        for j in jobs:
            if "_id" in j:
                del j["_id"]
            # Dynamically recalculate urgency for accurate waiting bonus
            urgency, reason = calculate_urgency_score(
                missing_replicas=j.get("missing_replicas", 1),
                file_importance=j.get("file_importance", "Standard"),
                created_at_iso=j.get("created_at", datetime.now(timezone.utc).isoformat())
            )
            j["urgency_score"] = urgency
            j["priority_rank_reason"] = reason

        # Sort descending by urgency score
        jobs.sort(key=lambda x: -x["urgency_score"])
        return jobs

    def get_all_jobs(self) -> List[dict]:
        db = get_db()
        jobs = list(db["recovery_jobs"].find())
        for j in jobs:
            if "_id" in j:
                del j["_id"]
        # Queued jobs first sorted by urgency, then history sorted by created_at descending
        queued = [j for j in jobs if j.get("status") == "QUEUED"]
        other = [j for j in jobs if j.get("status") != "QUEUED"]
        
        for j in queued:
            urgency, reason = calculate_urgency_score(
                missing_replicas=j.get("missing_replicas", 1),
                file_importance=j.get("file_importance", "Standard"),
                created_at_iso=j.get("created_at", datetime.now(timezone.utc).isoformat())
            )
            j["urgency_score"] = urgency
            j["priority_rank_reason"] = reason
        queued.sort(key=lambda x: -x["urgency_score"])
        other.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return queued + other

    def scan_and_schedule_recoveries(self) -> int:
        """
        Scans all files and schedules recovery for any under-replicated files.
        Prevents duplicate jobs for the same file.
        """
        db = get_db()
        nodes = {n["node_id"]: n for n in db["nodes"].find()}
        files = list(db["files"].find())
        scheduled_count = 0

        for file_doc in files:
            file_id = file_doc["file_id"]
            target_reps = file_doc.get("target_replication_factor", settings.DEFAULT_STANDARD_REPLICAS)

            # Find healthy surviving replicas
            replicas = list(db["replicas"].find({"file_id": file_id}))
            surviving_node_ids = []
            for rep in replicas:
                nid = rep["node_id"]
                node_info = nodes.get(nid, {})
                status = node_info.get("status", "NORMAL")
                is_failed = (status == "FAIL-STOP" or node_info.get("is_simulated_failed", False))
                is_corrupted = rep.get("is_corrupted", False)

                if not is_failed and not is_corrupted:
                    surviving_node_ids.append(nid)

            surviving_count = len(surviving_node_ids)
            missing_count = max(0, target_reps - surviving_count)

            # Update file record with live surviving count
            db["files"].update_one(
                {"file_id": file_id},
                {"$set": {"surviving_replica_count": surviving_count}}
            )

            if missing_count > 0:
                # Check if job already active
                existing = db["recovery_jobs"].find_one({
                    "file_id": file_id,
                    "status": {"$in": ["QUEUED", "IN_PROGRESS"]}
                })
                if existing:
                    # Update missing replicas if changed
                    if existing.get("missing_replicas") != missing_count:
                        urgency, reason = calculate_urgency_score(
                            missing_replicas=missing_count,
                            file_importance=file_doc.get("importance", "Standard"),
                            created_at_iso=existing.get("created_at")
                        )
                        db["recovery_jobs"].update_one(
                            {"job_id": existing["job_id"]},
                            {
                                "$set": {
                                    "missing_replicas": missing_count,
                                    "surviving_replicas": surviving_count,
                                    "urgency_score": urgency,
                                    "priority_rank_reason": reason
                                }
                            }
                        )
                    continue

                # Create new recovery job
                now_iso = datetime.now(timezone.utc).isoformat()
                urgency, reason = calculate_urgency_score(
                    missing_replicas=missing_count,
                    file_importance=file_doc.get("importance", "Standard"),
                    created_at_iso=now_iso
                )

                job_id = f"rec_{uuid.uuid4().hex[:8]}"
                job_doc = {
                    "job_id": job_id,
                    "file_id": file_id,
                    "filename": file_doc["filename"],
                    "target_replicas": target_reps,
                    "surviving_replicas": surviving_count,
                    "missing_replicas": missing_count,
                    "file_importance": file_doc.get("importance", "Standard"),
                    "urgency_score": urgency,
                    "priority_rank_reason": reason,
                    "reason": f"Under-replicated: {surviving_count}/{target_reps} healthy replicas surviving.",
                    "destination_node": None,
                    "source_node": surviving_node_ids[0] if surviving_node_ids else None,
                    "status": "QUEUED",
                    "created_at": now_iso,
                    "completed_at": None,
                    "error_message": None
                }
                db["recovery_jobs"].insert_one(job_doc)
                scheduled_count += 1

                from app.services.cluster_service import cluster_service
                cluster_service.record_event(
                    event_type="RECOVERY_JOB_QUEUED",
                    severity="WARNING",
                    file_id=file_id,
                    description=(
                        f"Priority recovery queued for '{file_doc['filename']}' "
                        f"(Rank Urgency: {urgency:.1f}, {missing_count} missing replica(s))."
                    )
                )

        return scheduled_count

    def handle_at_risk_node(self, node_id: str):
        """
        Proactive self-healing: when a node becomes AT-RISK, proactively relocates replicas
        to prevent under-replication before a catastrophic failure occurs.
        """
        db = get_db()
        replicas = list(db["replicas"].find({"node_id": node_id}))
        if not replicas:
            return

        for rep in replicas:
            file_doc = db["files"].find_one({"file_id": rep["file_id"]})
            if not file_doc:
                continue
            
            # Queue proactive recovery task if not already queued
            existing = db["recovery_jobs"].find_one({
                "file_id": rep["file_id"],
                "status": {"$in": ["QUEUED", "IN_PROGRESS"]}
            })
            if not existing:
                now_iso = datetime.now(timezone.utc).isoformat()
                urgency, reason = calculate_urgency_score(
                    missing_replicas=1,
                    file_importance=file_doc.get("importance", "Standard"),
                    created_at_iso=now_iso
                )
                job_id = f"proact_{uuid.uuid4().hex[:8]}"
                db["recovery_jobs"].insert_one({
                    "job_id": job_id,
                    "file_id": rep["file_id"],
                    "filename": file_doc["filename"],
                    "target_replicas": file_doc.get("target_replication_factor", 3),
                    "surviving_replicas": file_doc.get("surviving_replica_count", 3),
                    "missing_replicas": 1,
                    "file_importance": file_doc.get("importance", "Standard"),
                    "urgency_score": urgency,
                    "priority_rank_reason": reason,
                    "reason": f"Proactive Self-Healing: Replicating away from degrading node {node_id}.",
                    "destination_node": None,
                    "source_node": node_id,
                    "status": "QUEUED",
                    "created_at": now_iso,
                    "completed_at": None,
                    "error_message": None
                })

    def execute_recovery_job(self, job_id: str) -> dict:
        db = get_db()
        job = db["recovery_jobs"].find_one({"job_id": job_id})
        if not job:
            raise ValueError(f"Recovery job {job_id} not found")

        file_id = job["file_id"]
        file_doc = db["files"].find_one({"file_id": file_id})
        if not file_doc:
            db["recovery_jobs"].update_one(
                {"job_id": job_id},
                {"$set": {"status": "FAILED", "error_message": "Target file no longer exists in database."}}
            )
            return db["recovery_jobs"].find_one({"job_id": job_id})

        # Mark IN_PROGRESS
        db["recovery_jobs"].update_one({"job_id": job_id}, {"$set": {"status": "IN_PROGRESS"}})

        # Find healthy source replica
        all_nodes = list(db["nodes"].find())
        nodes_map = {n["node_id"]: n for n in all_nodes}

        replicas = list(db["replicas"].find({"file_id": file_id}))
        healthy_sources = []
        for rep in replicas:
            nid = rep["node_id"]
            node_info = nodes_map.get(nid, {})
            if (
                node_info.get("status") != "FAIL-STOP"
                and not node_info.get("is_simulated_failed", False)
                and not rep.get("is_corrupted", False)
            ):
                healthy_sources.append(rep)

        if not healthy_sources:
            msg = "Fatal: Zero healthy replicas exist to restore from!"
            db["recovery_jobs"].update_one(
                {"job_id": job_id},
                {"$set": {"status": "FAILED", "error_message": msg}}
            )
            from app.services.cluster_service import cluster_service
            cluster_service.record_event(
                event_type="RECOVERY_FAILED",
                severity="CRITICAL",
                file_id=file_id,
                description=f"Recovery failed for '{file_doc['filename']}': {msg}"
            )
            return db["recovery_jobs"].find_one({"job_id": job_id})

        source_replica = healthy_sources[0]
        source_node_id = source_replica["node_id"]

        # Run placement algorithm for destination
        existing_node_ids = [r["node_id"] for r in replicas if not r.get("is_corrupted", False)]
        file_size_mb = max(0.1, file_doc.get("size_bytes", 1024) / (1024 * 1024))
        
        placement = evaluate_placement(
            candidate_nodes=all_nodes,
            existing_replica_node_ids=existing_node_ids,
            file_size_mb=file_size_mb
        )

        if not placement.selected_node_id:
            msg = f"Cannot place replica: {placement.explanation}"
            db["recovery_jobs"].update_one(
                {"job_id": job_id},
                {"$set": {"status": "FAILED", "error_message": msg}}
            )
            return db["recovery_jobs"].find_one({"job_id": job_id})

        dest_node_id = placement.selected_node_id

        # Perform physical file transfer & verification
        try:
            new_replica_id = f"rep_{uuid.uuid4().hex[:6]}"
            new_checksum = storage_fs.repair_replica_bytes(
                target_node_id=dest_node_id,
                file_id=file_id,
                target_replica_id=new_replica_id,
                source_node_id=source_node_id,
                source_replica_id=source_replica["replica_id"]
            )

            # Verify integrity against file's authoritative checksum
            if new_checksum != file_doc["checksum"]:
                raise ValueError(f"Checksum mismatch on recovered replica: expected {file_doc['checksum']}, got {new_checksum}")

            # Register new replica in MongoDB
            new_replica_doc = {
                "replica_id": new_replica_id,
                "file_id": file_id,
                "node_id": dest_node_id,
                "is_primary": False,
                "is_corrupted": False,
                "checksum": new_checksum,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db["replicas"].insert_one(new_replica_doc)

            # Update file replica locations and surviving count
            updated_locations = file_doc.get("replica_locations", [])
            if dest_node_id not in updated_locations:
                updated_locations.append(dest_node_id)

            surviving_reps = len([
                r for r in db["replicas"].find({"file_id": file_id})
                if nodes_map.get(r["node_id"], {}).get("status") != "FAIL-STOP"
                and not r.get("is_corrupted", False)
            ])

            db["files"].update_one(
                {"file_id": file_id},
                {
                    "$set": {
                        "replica_locations": updated_locations,
                        "surviving_replica_count": surviving_reps
                    }
                }
            )

            # Mark job complete
            now_iso = datetime.now(timezone.utc).isoformat()
            db["recovery_jobs"].update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "COMPLETED",
                        "destination_node": dest_node_id,
                        "source_node": source_node_id,
                        "surviving_replicas": surviving_reps,
                        "missing_replicas": max(0, file_doc.get("target_replication_factor", 3) - surviving_reps),
                        "completed_at": now_iso,
                        "error_message": None
                    }
                }
            )

            from app.services.cluster_service import cluster_service
            cluster_service.record_event(
                event_type="RECOVERY_COMPLETED",
                severity="SUCCESS",
                file_id=file_id,
                node_id=dest_node_id,
                description=(
                    f"Successfully self-healed '{file_doc['filename']}' replica on {dest_node_id} "
                    f"from healthy source {source_node_id}. SHA-256 verified."
                )
            )

        except Exception as e:
            logger.error(f"Recovery execution failed: {e}", exc_info=True)
            db["recovery_jobs"].update_one(
                {"job_id": job_id},
                {"$set": {"status": "FAILED", "error_message": str(e)}}
            )

        updated_job = db["recovery_jobs"].find_one({"job_id": job_id})
        if "_id" in updated_job:
            del updated_job["_id"]
        return updated_job

    def run_all_queued(self) -> List[dict]:
        queued = self.get_queued_jobs()
        results = []
        for job in queued:
            if self.is_paused:
                break
            res = self.execute_recovery_job(job["job_id"])
            results.append(res)
        return results

    def retry_job(self, job_id: str) -> dict:
        db = get_db()
        job = db["recovery_jobs"].find_one({"job_id": job_id})
        if not job:
            raise ValueError(f"Job {job_id} not found")
        db["recovery_jobs"].update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "QUEUED",
                    "error_message": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return self.execute_recovery_job(job_id)

recovery_service = RecoveryService()

