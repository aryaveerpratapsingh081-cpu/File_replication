import asyncio
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.core.database import get_db
from app.core.websocket import manager as ws_manager
from app.storage.filesystem import storage_fs
from app.models.schemas import NodeBase, ClusterOverview, SystemEventModel
from app.algorithms.health import evaluate_node_health

logger = logging.getLogger("selfheal.cluster")

INITIAL_NODES = [
    {
        "node_id": "node_1",
        "name": "Alpha-Node 1",
        "rack_id": "Rack-A",
        "switch_id": "Switch-1",
        "power_domain_id": "PDU-1",
        "cpu_utilization": 18.0,
        "disk_io_utilization": 14.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 16.5,
        "recent_response_times": [15.2, 16.1, 15.8, 16.4, 17.0, 16.2, 16.5],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    },
    {
        "node_id": "node_2",
        "name": "Alpha-Node 2",
        "rack_id": "Rack-A",
        "switch_id": "Switch-1",
        "power_domain_id": "PDU-1",
        "cpu_utilization": 22.0,
        "disk_io_utilization": 19.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 19.2,
        "recent_response_times": [18.0, 19.5, 18.8, 19.0, 19.4, 18.9, 19.2],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    },
    {
        "node_id": "node_3",
        "name": "Alpha-Node 3",
        "rack_id": "Rack-A",
        "switch_id": "Switch-1",
        "power_domain_id": "PDU-2",
        "cpu_utilization": 14.0,
        "disk_io_utilization": 11.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 15.8,
        "recent_response_times": [14.8, 15.2, 15.5, 16.0, 15.4, 15.7, 15.8],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    },
    {
        "node_id": "node_4",
        "name": "Beta-Node 4",
        "rack_id": "Rack-B",
        "switch_id": "Switch-2",
        "power_domain_id": "PDU-3",
        "cpu_utilization": 20.0,
        "disk_io_utilization": 16.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 17.4,
        "recent_response_times": [16.8, 17.1, 16.9, 17.5, 17.0, 17.2, 17.4],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    },
    {
        "node_id": "node_5",
        "name": "Beta-Node 5",
        "rack_id": "Rack-B",
        "switch_id": "Switch-2",
        "power_domain_id": "PDU-3",
        "cpu_utilization": 25.0,
        "disk_io_utilization": 21.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 21.0,
        "recent_response_times": [20.0, 20.5, 21.2, 20.8, 21.5, 20.9, 21.0],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    },
    {
        "node_id": "node_6",
        "name": "Beta-Node 6",
        "rack_id": "Rack-B",
        "switch_id": "Switch-2",
        "power_domain_id": "PDU-4",
        "cpu_utilization": 16.0,
        "disk_io_utilization": 13.0,
        "storage_capacity_mb": 50000.0,
        "storage_used_mb": 0.0,
        "current_response_time_ms": 16.0,
        "recent_response_times": [15.5, 15.9, 16.2, 15.8, 16.1, 15.7, 16.0],
        "missed_heartbeats": 0,
        "status": "NORMAL"
    }
]

class ClusterService:
    def __init__(self):
        self.is_monitoring_active: bool = True
        self._monitor_task: Optional[asyncio.Task] = None

    def initialize_cluster(self):
        db = get_db()
        nodes_col = db["nodes"]
        if nodes_col.count_documents({}) == 0:
            logger.info("Initializing 6 storage nodes in MongoDB...")
            for node_data in INITIAL_NODES:
                doc = dict(node_data)
                doc["last_heartbeat_time"] = datetime.now(timezone.utc).isoformat()
                doc["response_time_slope"] = 0.0
                doc["risk_score"] = 0.0
                doc["risk_explanation"] = "Node operational and responding normally."
                doc["is_simulated_slow"] = False
                doc["is_simulated_failed"] = False
                doc["simulated_latency_added_ms"] = 0.0
                doc["replica_count"] = 0
                nodes_col.insert_one(doc)
                storage_fs.init_node_storage(doc["node_id"])
            
            # Record initialization event
            self.record_event(
                event_type="CLUSTER_INITIALIZATION",
                severity="INFO",
                description="Cluster initialized with 6 storage nodes across 2 racks (Rack-A, Rack-B)."
            )

    def record_event(
        self,
        event_type: str,
        severity: str,
        description: str,
        node_id: Optional[str] = None,
        file_id: Optional[str] = None,
        details: Optional[dict] = None
    ):
        db = get_db()
        events_col = db["system_events"]
        event_doc = {
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "severity": severity,
            "node_id": node_id,
            "file_id": file_id,
            "description": description,
            "details": details or {}
        }
        events_col.insert_one(event_doc)
        return event_doc

    def get_all_nodes(self) -> List[dict]:
        db = get_db()
        nodes = list(db["nodes"].find())
        # Remove MongoDB _id from serialization
        for n in nodes:
            if "_id" in n:
                del n["_id"]
            # Recalculate live disk usage
            n["storage_used_mb"] = storage_fs.get_node_disk_usage_mb(n["node_id"])
            # Count replicas on this node
            n["replica_count"] = db["replicas"].count_documents({"node_id": n["node_id"]})
        return nodes

    def get_node(self, node_id: str) -> Optional[dict]:
        db = get_db()
        node = db["nodes"].find_one({"node_id": node_id})
        if node and "_id" in node:
            del node["_id"]
        if node:
            node["storage_used_mb"] = storage_fs.get_node_disk_usage_mb(node["node_id"])
            node["replica_count"] = db["replicas"].count_documents({"node_id": node["node_id"]})
        return node

    def simulate_node_latency(self, node_id: str, latency_added_ms: float) -> dict:
        db = get_db()
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        is_slow = latency_added_ms > 0
        db["nodes"].update_one(
            {"node_id": node_id},
            {
                "$set": {
                    "is_simulated_slow": is_slow,
                    "simulated_latency_added_ms": latency_added_ms
                }
            }
        )

        self.record_event(
            event_type="NODE_LATENCY_SIMULATED",
            severity="WARNING" if is_slow else "INFO",
            node_id=node_id,
            description=f"Injected +{latency_added_ms:.1f}ms artificial latency onto {node['name']}."
        )

        # Trigger immediate health check for responsiveness
        self.ping_node(node_id)
        return self.get_node(node_id)

    def simulate_node_failure(self, node_id: str) -> dict:
        db = get_db()
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        db["nodes"].update_one(
            {"node_id": node_id},
            {
                "$set": {
                    "is_simulated_failed": True,
                    "status": "FAIL-STOP",
                    "missed_heartbeats": settings.MAX_MISSED_HB_FAILSTOP,
                    "risk_score": 1.0,
                    "risk_explanation": "Node stopped due to controlled failure simulation."
                }
            }
        )

        self.record_event(
            event_type="NODE_FAILED",
            severity="CRITICAL",
            node_id=node_id,
            description=f"Node {node['name']} ({node_id}) transitioned to FAIL-STOP state (Simulated Failure)."
        )

        # Trigger cluster recovery for affected replicas
        from app.services.recovery_service import recovery_service
        recovery_service.scan_and_schedule_recoveries()

        return self.get_node(node_id)

    def restore_node(self, node_id: str) -> dict:
        db = get_db()
        node = self.get_node(node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        normal_samples = [round(15.0 + random.uniform(0.5, 4.0), 1) for _ in range(7)]
        db["nodes"].update_one(
            {"node_id": node_id},
            {
                "$set": {
                    "is_simulated_failed": False,
                    "is_simulated_slow": False,
                    "simulated_latency_added_ms": 0.0,
                    "status": "NORMAL",
                    "missed_heartbeats": 0,
                    "recent_response_times": normal_samples,
                    "current_response_time_ms": normal_samples[-1],
                    "response_time_slope": 0.0,
                    "risk_score": 0.0,
                    "risk_explanation": "Node restored to healthy operating status."
                }
            }
        )

        self.record_event(
            event_type="NODE_RESTORED",
            severity="SUCCESS",
            node_id=node_id,
            description=f"Node {node['name']} ({node_id}) successfully restored to NORMAL state."
        )

        return self.get_node(node_id)

    def ping_node(self, node_id: str):
        db = get_db()
        node = db["nodes"].find_one({"node_id": node_id})
        if not node:
            return

        if node.get("is_simulated_failed", False):
            # Already failed
            return

        added_latency = node.get("simulated_latency_added_ms", 0.0)
        # Base latency with mild jitter
        base_ms = round(15.0 + random.uniform(-1.5, 2.5) + added_latency, 1)

        history = list(node.get("recent_response_times", []))
        history.append(base_ms)
        if len(history) > settings.SLIDING_WINDOW_SIZE:
            history = history[-settings.SLIDING_WINDOW_SIZE:]

        missed = node.get("missed_heartbeats", 0)

        # Compute risk score and status
        risk_score, status, reason, details = evaluate_node_health(
            recent_response_times=history,
            missed_heartbeats=missed
        )

        old_status = node.get("status", "NORMAL")
        if old_status != status:
            self.record_event(
                event_type="NODE_STATUS_TRANSITION",
                severity="WARNING" if status == "AT-RISK" else "CRITICAL" if status == "FAIL-STOP" else "INFO",
                node_id=node_id,
                description=f"Node {node.get('name')} transitioned from {old_status} to {status}. Reason: {reason}"
            )
            # If transition to AT-RISK, check proactive relocation
            if status == "AT-RISK":
                from app.services.recovery_service import recovery_service
                recovery_service.handle_at_risk_node(node_id)

        # Simulate natural load variation
        cpu = min(95.0, max(10.0, node.get("cpu_utilization", 20.0) + random.uniform(-2.0, 2.0)))
        io = min(90.0, max(8.0, node.get("disk_io_utilization", 15.0) + random.uniform(-2.0, 2.0)))

        db["nodes"].update_one(
            {"node_id": node_id},
            {
                "$set": {
                    "current_response_time_ms": base_ms,
                    "recent_response_times": history,
                    "response_time_slope": details["slope_ms_per_sec"],
                    "risk_score": risk_score,
                    "status": status,
                    "risk_explanation": reason,
                    "last_heartbeat_time": datetime.now(timezone.utc).isoformat(),
                    "cpu_utilization": round(cpu, 1),
                    "disk_io_utilization": round(io, 1)
                }
            }
        )

    def get_cluster_overview(self) -> ClusterOverview:
        nodes = self.get_all_nodes()
        total_nodes = len(nodes)
        healthy_nodes = sum(1 for n in nodes if n.get("status") == "NORMAL")
        at_risk_nodes = sum(1 for n in nodes if n.get("status") == "AT-RISK")
        failed_nodes = sum(1 for n in nodes if n.get("status") == "FAIL-STOP")

        db = get_db()
        total_files = db["files"].count_documents({})
        total_replicas = db["replicas"].count_documents({})
        pending_jobs = db["recovery_jobs"].count_documents({"status": "QUEUED"})

        total_cap = sum(n.get("storage_capacity_mb", 50000.0) for n in nodes)
        used_cap = sum(n.get("storage_used_mb", 0.0) for n in nodes)
        util_pct = round((used_cap / max(total_cap, 1.0)) * 100.0, 2)

        # Determine cluster health
        if total_nodes == 0 or failed_nodes == total_nodes:
            cluster_health = "Offline"
            cluster_reason = "All storage nodes are unavailable."
        elif failed_nodes >= 2 or pending_jobs > 5:
            cluster_health = "Critical"
            cluster_reason = f"{failed_nodes} storage nodes failed and {pending_jobs} recovery jobs require immediate replication."
        elif failed_nodes >= 1 or at_risk_nodes >= 1:
            cluster_health = "Degraded"
            cluster_reason = f"Cluster is degraded: {failed_nodes} failed node(s), {at_risk_nodes} at-risk node(s). Quorum maintained."
        else:
            cluster_health = "Healthy"
            cluster_reason = "All 6 nodes are operational across Rack-A and Rack-B with balanced replica distribution."

        return ClusterOverview(
            cluster_health=cluster_health,
            cluster_health_reason=cluster_reason,
            total_nodes=total_nodes,
            healthy_nodes=healthy_nodes,
            at_risk_nodes=at_risk_nodes,
            failed_nodes=failed_nodes,
            total_files=total_files,
            total_replicas=total_replicas,
            total_capacity_mb=total_cap,
            used_capacity_mb=used_cap,
            storage_utilization_pct=util_pct,
            pending_recovery_jobs=pending_jobs,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    async def run_heartbeat_loop(self):
        logger.info("Starting background cluster health monitor loop...")
        while True:
            try:
                if self.is_monitoring_active:
                    nodes = self.get_all_nodes()
                    for node in nodes:
                        self.ping_node(node["node_id"])

                    overview = self.get_cluster_overview()
                    # Broadcast updated overview & nodes to clients
                    await ws_manager.broadcast("CLUSTER_UPDATE", {
                        "overview": overview.model_dump(),
                        "nodes": self.get_all_nodes()
                    })

                await asyncio.sleep(settings.HEARTBEAT_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}", exc_info=True)
                await asyncio.sleep(settings.HEARTBEAT_INTERVAL_SECONDS)

cluster_service = ClusterService()

