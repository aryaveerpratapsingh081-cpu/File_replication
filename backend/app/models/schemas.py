from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field

class NodeBase(BaseModel):
    node_id: str
    name: str
    rack_id: str
    switch_id: str
    power_domain_id: str
    status: str = "NORMAL"  # NORMAL, AT-RISK, FAIL-STOP
    cpu_utilization: float = 15.0
    disk_io_utilization: float = 12.0
    storage_capacity_mb: float = 50000.0  # 50 GB
    storage_used_mb: float = 0.0
    current_response_time_ms: float = 18.0
    recent_response_times: list[float] = Field(default_factory=list)
    missed_heartbeats: int = 0
    last_heartbeat_time: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    response_time_slope: float = 0.0
    risk_score: float = 0.0
    risk_explanation: str = "Operating within normal parameters."
    replica_count: int = 0
    is_simulated_slow: bool = False
    is_simulated_failed: bool = False
    simulated_latency_added_ms: float = 0.0

class NodeUpdate(BaseModel):
    status: Optional[str] = None
    cpu_utilization: Optional[float] = None
    disk_io_utilization: Optional[float] = None
    storage_used_mb: Optional[float] = None
    current_response_time_ms: Optional[float] = None
    missed_heartbeats: Optional[int] = None
    is_simulated_slow: Optional[bool] = None
    is_simulated_failed: Optional[bool] = None
    simulated_latency_added_ms: Optional[float] = None

class FileMetadata(BaseModel):
    file_id: str
    filename: str
    size_bytes: int
    mime_type: str = "application/octet-stream"
    importance: str = "Standard"  # Standard, Critical
    read_count: int = 0
    write_count: int = 1
    access_rate: float = 0.0  # accesses per minute
    last_accessed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    target_replication_factor: int = 3
    surviving_replica_count: int = 3
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    checksum_algorithm: str = "SHA-256"
    checksum: str
    replica_locations: list[str] = Field(default_factory=list)
    replication_policy_reason: str = "Default baseline policy."

class ReplicaInfo(BaseModel):
    replica_id: str
    file_id: str
    node_id: str
    is_primary: bool = False
    is_corrupted: bool = False
    checksum: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    corrupted_at: Optional[str] = None

class RecoveryJobModel(BaseModel):
    job_id: str
    file_id: str
    filename: str
    target_replicas: int
    surviving_replicas: int
    missing_replicas: int
    file_importance: str
    urgency_score: float = 0.0
    priority_rank_reason: str = ""
    reason: str
    destination_node: Optional[str] = None
    source_node: Optional[str] = None
    status: str = "QUEUED"  # QUEUED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

class SystemEventModel(BaseModel):
    event_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    event_type: str
    severity: str = "INFO"  # INFO, WARNING, CRITICAL, SUCCESS
    node_id: Optional[str] = None
    file_id: Optional[str] = None
    description: str
    details: Optional[dict[str, Any]] = None

class ClusterOverview(BaseModel):
    cluster_health: str  # Healthy, Degraded, Critical, Offline
    cluster_health_reason: str
    total_nodes: int
    healthy_nodes: int
    at_risk_nodes: int
    failed_nodes: int
    total_files: int
    total_replicas: int
    total_capacity_mb: float
    used_capacity_mb: float
    storage_utilization_pct: float
    pending_recovery_jobs: int
    timestamp: str

class PlacementCandidate(BaseModel):
    node_id: str
    node_name: str
    rack_id: str
    is_eligible: bool
    rejection_reason: Optional[str] = None
    cpu_utilization: float
    io_utilization: float
    storage_utilization: float
    normalized_load: float
    load_score: float
    diversity_score: float
    final_placement_score: float
    score_breakdown: str

class PlacementResult(BaseModel):
    selected_node_id: Optional[str]
    selected_node_name: Optional[str]
    explanation: str
    candidates: list[PlacementCandidate]

class WritePipelineResult(BaseModel):
    mode: str  # "PARALLEL_PUSH" or "DAISY_CHAIN"
    duration_ms: float
    total_bytes: int
    success_count: int
    failed_count: int
    replica_acks: list[dict[str, Any]]
    consistency_status: str
    timeline_steps: list[dict[str, Any]]

class CorruptionSimulationResult(BaseModel):
    file_id: str
    filename: str
    corrupted_node_id: str
    original_checksum: str
    tampered_checksum: str
    status: str
    message: str

class IntegrityVerificationResult(BaseModel):
    file_id: str
    filename: str
    expected_checksum: str
    healthy_replicas: list[str]
    corrupted_replicas: list[str]
    is_compromised: bool
    repaired: bool
    repair_details: Optional[str] = None

