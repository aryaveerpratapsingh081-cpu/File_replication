import {
  ClusterOverviewData,
  NodeData,
  FileData,
  ReplicaData,
  RecoveryJob,
  SystemEvent,
  SimulationStatus,
  ExperimentData,
  PlacementResult
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health & Cluster
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
  getClusterOverview: async (): Promise<ClusterOverviewData> => {
    const res = await fetch(`${API_BASE}/cluster/overview`);
    return res.json();
  },
  toggleMonitoring: async () => {
    const res = await fetch(`${API_BASE}/cluster/monitoring/toggle`, { method: 'POST' });
    return res.json();
  },
  resetCluster: async () => {
    const res = await fetch(`${API_BASE}/cluster/reset`, { method: 'POST' });
    return res.json();
  },

  // Nodes
  getNodes: async (): Promise<NodeData[]> => {
    const res = await fetch(`${API_BASE}/nodes`);
    return res.json();
  },
  getNode: async (nodeId: string): Promise<NodeData> => {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}`);
    return res.json();
  },
  simulateLatency: async (nodeId: string, latencyAddedMs: number): Promise<NodeData> => {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/simulate-latency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latency_added_ms: latencyAddedMs })
    });
    return res.json();
  },
  simulateFailure: async (nodeId: string): Promise<NodeData> => {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/simulate-failure`, { method: 'POST' });
    return res.json();
  },
  restoreNode: async (nodeId: string): Promise<NodeData> => {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/restore`, { method: 'POST' });
    return res.json();
  },
  getNodeReplicas: async (nodeId: string) => {
    const res = await fetch(`${API_BASE}/nodes/${nodeId}/replicas`);
    return res.json();
  },

  // Files
  getFiles: async (): Promise<FileData[]> => {
    const res = await fetch(`${API_BASE}/files`);
    return res.json();
  },
  getFile: async (fileId: string): Promise<FileData> => {
    const res = await fetch(`${API_BASE}/files/${fileId}`);
    return res.json();
  },
  getFileReplicas: async (fileId: string): Promise<ReplicaData[]> => {
    const res = await fetch(`${API_BASE}/files/${fileId}/replicas`);
    return res.json();
  },
  uploadFile: async (file: File, importance: string = 'Standard', writeMode: string = 'PARALLEL_PUSH') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('importance', importance);
    formData.append('write_mode', writeMode);
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  downloadFileUrl: (fileId: string) => `${API_BASE}/files/${fileId}/download`,
  deleteFile: async (fileId: string) => {
    const res = await fetch(`${API_BASE}/files/${fileId}`, { method: 'DELETE' });
    return res.json();
  },
  recalculateReplication: async (fileId: string, importance?: string) => {
    const res = await fetch(`${API_BASE}/replication/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId, importance })
    });
    return res.json();
  },
  getReplicationPolicies: async () => {
    const res = await fetch(`${API_BASE}/replication/policies`);
    return res.json();
  },
  previewPlacement: async (fileSizeMb: number = 1.0, existingNodeIds: string[] = []): Promise<PlacementResult> => {
    const params = new URLSearchParams({
      file_size_mb: fileSizeMb.toString(),
      existing_node_ids: existingNodeIds.join(',')
    });
    const res = await fetch(`${API_BASE}/placement/preview?${params}`);
    return res.json();
  },

  // Integrity
  simulateCorruption: async (fileId: string, nodeId?: string) => {
    const res = await fetch(`${API_BASE}/integrity/simulate-corruption/${fileId}${nodeId ? `?node_id=${nodeId}` : ''}`, {
      method: 'POST'
    });
    return res.json();
  },
  verifyAndRepairIntegrity: async (fileId: string) => {
    const res = await fetch(`${API_BASE}/integrity/verify/${fileId}`, { method: 'POST' });
    return res.json();
  },

  // Recovery
  getRecoveryJobs: async (): Promise<RecoveryJob[]> => {
    const res = await fetch(`${API_BASE}/recovery/jobs`);
    return res.json();
  },
  triggerRecoveryScan: async () => {
    const res = await fetch(`${API_BASE}/recovery/jobs`, { method: 'POST' });
    return res.json();
  },
  runRecoveryNow: async () => {
    const res = await fetch(`${API_BASE}/recovery/run`, { method: 'POST' });
    return res.json();
  },
  retryRecoveryJob: async (jobId: string) => {
    const res = await fetch(`${API_BASE}/recovery/jobs/${jobId}/retry`, { method: 'POST' });
    return res.json();
  },
  getRecoveryHistory: async (): Promise<RecoveryJob[]> => {
    const res = await fetch(`${API_BASE}/recovery/history`);
    return res.json();
  },

  // Simulation Lab
  getSimulationStatus: async (): Promise<SimulationStatus> => {
    const res = await fetch(`${API_BASE}/simulations`);
    return res.json();
  },
  startScenario: async (scenario: string, targetNode?: string) => {
    const res = await fetch(`${API_BASE}/simulations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, target_node: targetNode })
    });
    return res.json();
  },
  resetSimulation: async () => {
    const res = await fetch(`${API_BASE}/simulations/reset`, { method: 'POST' });
    return res.json();
  },
  seedDemoData: async () => {
    const res = await fetch(`${API_BASE}/simulations/seed-demo`, { method: 'POST' });
    return res.json();
  },

  // Experiments
  getExperiments: async (): Promise<ExperimentData[]> => {
    const res = await fetch(`${API_BASE}/experiments`);
    return res.json();
  },
  runExperiment: async (sampleSize: number = 5): Promise<ExperimentData> => {
    const res = await fetch(`${API_BASE}/experiments/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_size: sampleSize })
    });
    return res.json();
  },
  exportExperimentCsvUrl: (experimentId: string) => `${API_BASE}/experiments/${experimentId}/export`,

  // Logs
  getLogs: async (params?: { severity?: string; event_type?: string; node_id?: string; file_id?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.event_type) searchParams.set('event_type', params.event_type);
    if (params?.node_id) searchParams.set('node_id', params.node_id);
    if (params?.file_id) searchParams.set('file_id', params.file_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const res = await fetch(`${API_BASE}/logs?${searchParams}`);
    return res.json();
  },

  // Project Status
  getProjectStatus: async () => {
    const res = await fetch(`${API_BASE}/project/status`);
    return res.json();
  }
};

