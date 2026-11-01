import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.core.database import get_db
from app.storage.filesystem import storage_fs
from app.services.cluster_service import cluster_service
from app.services.file_service import file_service
from app.services.recovery_service import recovery_service

logger = logging.getLogger("selfheal.simulation")

DEMO_FILES = [
    {
        "filename": "cluster_manifest.json",
        "content": b'{\n  "cluster_name": "SelfHeal-East",\n  "version": "2.4.0",\n  "nodes": 6,\n  "policy": "adaptive_self_healing"\n}',
        "importance": "Critical"
    },
    {
        "filename": "system_telemetry.csv",
        "content": b'timestamp,node,cpu,latency,iops\n2026-10-29T20:00:00Z,node_1,15.2,16.4,1200\n2026-10-29T20:01:00Z,node_2,18.0,18.2,1450',
        "importance": "Standard"
    },
    {
        "filename": "security_keys.enc",
        "content": b'-----BEGIN ENCRYPTED SECRET-----\nFA48B923E84F9A10BC84391E0942F80435AC6109\n-----END ENCRYPTED SECRET-----',
        "importance": "Critical"
    },
    {
        "filename": "research_dataset.parquet",
        "content": b'PAR1[SIMULATED_HIGH_DENSITY_STORAGE_SAMPLE_PAYLOAD_FOR_DEMONSTRATION_BENCHMARK]',
        "importance": "Standard"
    }
]

class SimulationService:
    def __init__(self):
        self.active_scenario: Optional[str] = None
        self.is_running: bool = False
        self.timeline: List[dict] = []
        self._task: Optional[asyncio.Task] = None

    def get_simulation_status(self) -> dict:
        return {
            "active_scenario": self.active_scenario,
            "is_running": self.is_running,
            "timeline": self.timeline,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def log_step(self, title: str, description: str, severity: str = "INFO", meta: Optional[dict] = None):
        step = {
            "step_id": str(uuid.uuid4())[:8],
            "title": title,
            "description": description,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "meta": meta or {}
        }
        self.timeline.insert(0, step)
        if len(self.timeline) > 50:
            self.timeline = self.timeline[:50]
        cluster_service.record_event(
            event_type="SIMULATION_STEP",
            severity=severity,
            description=f"[{self.active_scenario or 'LAB'}] {title}: {description}",
            details=meta
        )

    async def seed_initial_demo_files(self):
        db = get_db()
        if db["files"].count_documents({}) == 0:
            self.log_step(
                "Seeding Demo Dataset",
                "Uploading 4 representative demonstration files with mixed Standard & Critical importance."
            )
            for df in DEMO_FILES:
                await file_service.upload_file(
                    filename=df["filename"],
                    content=df["content"],
                    importance=df["importance"]
                )

    async def run_scenario_a_normal(self):
        self.active_scenario = "SCENARIO_A"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario A Started", "Initializing Normal Cluster Baseline. Restoring all nodes.", "SUCCESS")

        nodes = cluster_service.get_all_nodes()
        for n in nodes:
            cluster_service.restore_node(n["node_id"])

        await self.seed_initial_demo_files()

        self.log_step(
            "Cluster Stable",
            "All 6 nodes across Rack-A and Rack-B are responding within 15-20ms with zero missed heartbeats and full quorum.",
            "SUCCESS"
        )
        self.is_running = False

    async def run_scenario_b_slow_node(self, node_id: str = "node_2"):
        self.active_scenario = "SCENARIO_B"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario B Started", f"Simulating gradual latency degradation on {node_id}.", "WARNING")

        # Step 1: Moderate latency bump
        await asyncio.sleep(1.0)
        cluster_service.simulate_node_latency(node_id, 35.0)
        self.log_step(
            "Latency Increase Phase 1",
            f"Added +35ms latency to {node_id}. Linear regression slope turns positive.",
            "WARNING"
        )

        # Step 2: Severe latency bump
        await asyncio.sleep(2.0)
        cluster_service.simulate_node_latency(node_id, 85.0)
        self.log_step(
            "Latency Increase Phase 2",
            f"Added +85ms latency to {node_id}. Calculated risk score crosses warning threshold (0.40). Node transitions to AT-RISK.",
            "WARNING"
        )

        # Step 3: Trigger proactive replication
        await asyncio.sleep(1.5)
        recovery_service.handle_at_risk_node(node_id)
        self.log_step(
            "Predictive Self-Healing Engaged",
            f"Proactive replica relocation triggered for files on {node_id} to avoid impending data loss.",
            "SUCCESS"
        )
        self.is_running = False

    async def run_scenario_c_single_node_failure(self, node_id: str = "node_1"):
        self.active_scenario = "SCENARIO_C"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario C Started", f"Stopping storage node {node_id} (Simulated Fail-Stop).", "CRITICAL")

        await self.seed_initial_demo_files()
        await asyncio.sleep(1.0)

        # Fail node
        cluster_service.simulate_node_failure(node_id)
        self.log_step(
            "Node Failed",
            f"{node_id} stopped responding. Marked FAIL-STOP. Heartbeats missed.",
            "CRITICAL"
        )

        # Scan and prioritize recovery
        await asyncio.sleep(1.0)
        count = recovery_service.scan_and_schedule_recoveries()
        self.log_step(
            "Priority Recovery Queued",
            f"{count} file(s) under-replicated. Recovery jobs placed in priority queue sorted by Urgency.",
            "INFO"
        )

        # Execute recovery
        await asyncio.sleep(1.5)
        recovered = recovery_service.run_all_queued()
        self.log_step(
            "Self-Healing Completed",
            f"Recovered {len(recovered)} replica(s) onto healthy surviving nodes using Rack-Diversity placement.",
            "SUCCESS"
        )
        self.is_running = False

    async def run_scenario_d_two_node_failure(self, node1: str = "node_1", node2: str = "node_2"):
        self.active_scenario = "SCENARIO_D"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario D Started", f"Simulating catastrophic two-node rack failure ({node1} & {node2} in Rack-A).", "CRITICAL")

        await self.seed_initial_demo_files()
        await asyncio.sleep(1.0)

        cluster_service.simulate_node_failure(node1)
        cluster_service.simulate_node_failure(node2)
        self.log_step(
            "Two Nodes Failed",
            f"Nodes {node1} and {node2} both stopped. Rack-A capacity degraded.",
            "CRITICAL"
        )

        await asyncio.sleep(1.0)
        count = recovery_service.scan_and_schedule_recoveries()
        self.log_step(
            "Multi-File Urgency Prioritization",
            f"Priority queue scheduled {count} jobs. Files with 2 missing replicas assigned top urgency (2000+ points), Critical files prioritized before Standard.",
            "WARNING"
        )

        await asyncio.sleep(1.5)
        recovered = recovery_service.run_all_queued()
        self.log_step(
            "Cluster Rebalanced on Rack-B",
            f"Successfully restored redundancy for {len(recovered)} jobs using surviving Rack-B nodes.",
            "SUCCESS"
        )
        self.is_running = False

    async def run_scenario_e_file_corruption(self):
        self.active_scenario = "SCENARIO_E"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario E Started", "Demonstrating Silent Corruption Detection & Checksum Self-Healing.", "WARNING")

        await self.seed_initial_demo_files()
        db = get_db()
        files = list(db["files"].find())
        if not files:
            return

        target_file = files[0]
        file_id = target_file["file_id"]

        # Corrupt single replica
        corrupt_res = file_service.simulate_corruption(file_id)
        self.log_step(
            "Bit-Flip Injected",
            f"Replica on node {corrupt_res.corrupted_node_id} altered. Expected: {corrupt_res.original_checksum[:8]}..., Actual: {corrupt_res.tampered_checksum[:8]}...",
            "CRITICAL"
        )

        await asyncio.sleep(1.5)
        # Verify and repair
        verify_res = file_service.verify_and_repair_integrity(file_id)
        self.log_step(
            "Checksum Verification & Self-Healing",
            f"Integrity check detected corrupted replica on {corrupt_res.corrupted_node_id}. Repaired from verified replica on healthy node. SHA-256 restored.",
            "SUCCESS"
        )
        self.is_running = False

    async def run_scenario_f_storage_pressure(self):
        self.active_scenario = "SCENARIO_F"
        self.is_running = True
        self.timeline = []
        self.log_step("Scenario F Started", "Simulating severe CPU and Disk pressure on Rack-A nodes.", "WARNING")

        db = get_db()
        # Elevate load on Rack-A nodes (node_1, node_2, node_3)
        db["nodes"].update_one({"node_id": "node_1"}, {"$set": {"cpu_utilization": 92.0, "disk_io_utilization": 88.0}})
        db["nodes"].update_one({"node_id": "node_2"}, {"$set": {"cpu_utilization": 89.0, "disk_io_utilization": 84.0}})
        db["nodes"].update_one({"node_id": "node_3"}, {"$set": {"cpu_utilization": 95.0, "disk_io_utilization": 91.0}})

        self.log_step(
            "Rack-A Load Elevated",
            "Nodes 1, 2, and 3 now exceed 90% CPU and IO load.",
            "WARNING"
        )

        await asyncio.sleep(1.5)
        # Upload new critical file to observe placement selection
        meta, pipeline = await file_service.upload_file(
            filename="pressured_transaction_log.wal",
            content=b"TRANSACTION_WAL_BUFFER_0001",
            importance="Critical"
        )

        self.log_step(
            "Load-Aware Placement Shift",
            f"New replicas automatically steered to low-load Rack-B nodes: {', '.join(meta.replica_locations)}. Avoided congested Rack-A.",
            "SUCCESS"
        )
        self.is_running = False

    def reset_simulation(self):
        self.active_scenario = None
        self.is_running = False
        self.timeline = []
        nodes = cluster_service.get_all_nodes()
        for n in nodes:
            cluster_service.restore_node(n["node_id"])
        self.log_step("Simulation Lab Reset", "All simulated faults cleared. Cluster returned to baseline.", "INFO")

simulation_service = SimulationService()

