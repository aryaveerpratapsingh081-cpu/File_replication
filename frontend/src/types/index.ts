export interface NodeData {
  node_id: string;
  name: string;
  rack_id: string;
  switch_id: string;
  power_domain_id: string;
  status: 'NORMAL' | 'AT-RISK' | 'FAIL-STOP';
  cpu_utilization: number;
  disk_io_utilization: number;
  storage_capacity_mb: number;
  storage_used_mb: number;
  current_response_time_ms: number;
  recent_response_times: number[];
  missed_heartbeats: number;
  last_heartbeat_time: string;
  response_time_slope: number;
  risk_score: number;
  risk_explanation: string;
  replica_count: number;
  is_simulated_slow: boolean;
  is_simulated_failed: boolean;
  simulated_latency_added_ms: number;
}

export interface FileData {
  file_id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  importance: 'Standard' | 'Critical';
  read_count: number;
  write_count: number;
  access_rate: number;
  last_accessed_at: string;
  target_replication_factor: number;
  surviving_replica_count: number;
  created_at: string;
  checksum_algorithm: string;
  checksum: string;
  replica_locations: string[];
  replication_policy_reason: string;
}

export interface ReplicaData {
  replica_id: string;
  file_id: string;
  node_id: string;
  node_name?: string;
  rack_id?: string;
  node_status?: string;
  is_primary: boolean;
  is_corrupted: boolean;
  checksum: string;
  created_at: string;
  corrupted_at?: string;
}

export interface RecoveryJob {
  job_id: string;
  file_id: string;
  filename: string;
  target_replicas: number;
  surviving_replicas: number;
  missing_replicas: number;
  file_importance: string;
  urgency_score: number;
  priority_rank_reason: string;
  reason: string;
  destination_node?: string | null;
  source_node?: string | null;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface ClusterOverviewData {
  cluster_health: 'Healthy' | 'Degraded' | 'Critical' | 'Offline';
  cluster_health_reason: string;
  total_nodes: number;
  healthy_nodes: number;
  at_risk_nodes: number;
  failed_nodes: number;
  total_files: number;
  total_replicas: number;
  total_capacity_mb: number;
  used_capacity_mb: number;
  storage_utilization_pct: number;
  pending_recovery_jobs: number;
  timestamp: string;
}

export interface SystemEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  node_id?: string;
  file_id?: string;
  description: string;
  details?: Record<string, any>;
}

export interface SimulationStep {
  step_id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface SimulationStatus {
  active_scenario: string | null;
  is_running: boolean;
  timeline: SimulationStep[];
  timestamp: string;
}

export interface ExperimentMetric {
  baseline_reactive: number;
  proposed_predictive: number;
  difference_pct?: number;
  status: string;
}

export interface ExperimentData {
  experiment_id: string;
  timestamp: string;
  sample_size: number;
  metrics: Record<string, ExperimentMetric>;
  rack_diversity_score: {
    baseline_reactive: number;
    proposed_predictive: number;
  };
  summary: string;
}

export interface PlacementCandidate {
  node_id: string;
  node_name: string;
  rack_id: string;
  is_eligible: boolean;
  rejection_reason?: string;
  cpu_utilization: number;
  io_utilization: number;
  storage_utilization: number;
  normalized_load: number;
  load_score: number;
  diversity_score: number;
  final_placement_score: number;
  score_breakdown: string;
}

export interface PlacementResult {
  selected_node_id: string | null;
  selected_node_name: string | null;
  explanation: string;
  candidates: PlacementCandidate[];
}

