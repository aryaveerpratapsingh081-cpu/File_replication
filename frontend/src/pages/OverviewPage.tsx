import React, { useState } from 'react';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Copy,
  HardDrive,
  LifeBuoy,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard';
import { ClusterOverviewData, NodeData, FileData, SystemEvent } from '../types';
import { ClusterTopology } from '../components/topology/ClusterTopology';
import { NodeDetailModal } from '../components/nodes/NodeDetailModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import clsx from 'clsx';

interface OverviewPageProps {
  overview: ClusterOverviewData | null;
  nodes: NodeData[];
  files: FileData[];
  events: SystemEvent[];
  onRefresh: () => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  nodes,
  files,
  events,
  onRefresh,
  onSimulateFailure,
  onRestoreNode
}) => {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Storage utilization history points for chart
  const storageChartData = [
    { time: '10m ago', used: Math.max(1, (overview?.used_capacity_mb || 10) * 0.7), available: 300000 },
    { time: '5m ago', used: Math.max(1, (overview?.used_capacity_mb || 10) * 0.85), available: 300000 },
    { time: 'Now', used: overview?.used_capacity_mb || 0, available: 300000 }
  ];

  // Multi-node response time comparison data
  const responseTimeData = nodes.slice(0, 6).map((n) => ({
    name: n.name.replace('Alpha-', 'A-').replace('Beta-', 'B-'),
    latency: n.current_response_time_ms,
    status: n.status
  }));

  return (
    <div className="space-y-6">
      {/* SECTION A: CLUSTER HEALTH BANNER */}
      <div className={clsx(
        'p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all',
        overview?.cluster_health === 'Healthy' && 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200',
        overview?.cluster_health === 'Degraded' && 'bg-amber-950/20 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/20',
        overview?.cluster_health === 'Critical' && 'bg-rose-950/25 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/30',
        overview?.cluster_health === 'Offline' && 'bg-slate-900 border-slate-700 text-slate-300'
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={clsx(
              'p-2.5 rounded-xl border mt-0.5',
              overview?.cluster_health === 'Healthy' && 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
              overview?.cluster_health === 'Degraded' && 'bg-amber-500/10 border-amber-500/40 text-amber-400',
              overview?.cluster_health === 'Critical' && 'bg-rose-500/10 border-rose-500/40 text-rose-400',
              overview?.cluster_health === 'Offline' && 'bg-slate-800 border-slate-700 text-slate-400'
            )}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Cluster Status: <span className="font-mono">{overview?.cluster_health || 'Initializing'}</span>
                </h2>
                <StatusBadge status={overview?.cluster_health || 'Healthy'} size="md" />
              </div>
              <p className="text-xs sm:text-sm mt-1 text-slate-300/90 leading-relaxed max-w-3xl">
                {overview?.cluster_health_reason || 'Evaluating cluster quorum across simulated rack failure domains...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {overview?.pending_recovery_jobs && overview.pending_recovery_jobs > 0 ? (
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-medium animate-pulse">
                {overview.pending_recovery_jobs} Pending Recovery Tasks
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 8 METRIC CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <MetricCard
          title="Total Storage Nodes"
          value={overview?.total_nodes || 6}
          subtitle="2 Racks (Rack-A & Rack-B)"
          icon={Server}
          variant="blue"
        />
        <MetricCard
          title="Healthy Nodes"
          value={overview?.healthy_nodes || 0}
          subtitle="Operating under normal latency"
          icon={CheckCircle2}
          variant="emerald"
        />
        <MetricCard
          title="At-Risk Nodes"
          value={overview?.at_risk_nodes || 0}
          subtitle="High slope / missed heartbeats"
          icon={AlertTriangle}
          variant="amber"
        />
        <MetricCard
          title="Failed Nodes"
          value={overview?.failed_nodes || 0}
          subtitle="Offline / FAIL-STOP state"
          icon={XCircle}
          variant="rose"
        />
        <MetricCard
          title="Total Files Stored"
          value={overview?.total_files || 0}
          subtitle="Standard & Critical files"
          icon={FileText}
          variant="cyan"
        />
        <MetricCard
          title="Total Replicas"
          value={overview?.total_replicas || 0}
          subtitle="Distributed copy instances"
          icon={Copy}
          variant="cyan"
        />
        <MetricCard
          title="Storage Utilization"
          value={`${overview?.storage_utilization_pct || 0}%`}
          subtitle={`${overview?.used_capacity_mb.toFixed(1) || 0} MB used of 300 GB`}
          icon={HardDrive}
          variant="default"
        />
        <MetricCard
          title="Pending Recovery Jobs"
          value={overview?.pending_recovery_jobs || 0}
          subtitle="Self-healing priority queue"
          icon={LifeBuoy}
          variant={overview?.pending_recovery_jobs ? 'amber' : 'default'}
        />
      </div>

      {/* SECTION C: INTERACTIVE NETWORK TOPOLOGY */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-wide">
            Interactive Network Topology & Rack Domains
          </h3>
          {files.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Highlight Replicas:</span>
              <select
                value={selectedFileId || ''}
                onChange={(e) => setSelectedFileId(e.target.value || null)}
                className="bg-navy-850 border border-navy-700 text-slate-200 rounded px-2.5 py-1 font-mono text-xs focus:outline-none focus:border-brand-cyan"
              >
                <option value="">None (Show All Links)</option>
                {files.map((f) => (
                  <option key={f.file_id} value={f.file_id}>
                    {f.filename} ({f.importance})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <ClusterTopology
          nodes={nodes}
          files={files}
          selectedFileId={selectedFileId}
          onSelectNode={(node) => setSelectedNode(node)}
          onSimulateFailure={onSimulateFailure}
          onRestoreNode={onRestoreNode}
        />
      </div>

      {/* SECTION B: COMPACT STORAGE NODE GRID */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white tracking-wide">
          Cluster Storage Node Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {nodes.map((node) => {
            const isFailed = node.status === 'FAIL-STOP';
            const isAtRisk = node.status === 'AT-RISK';
            return (
              <div
                key={node.node_id}
                onClick={() => setSelectedNode(node)}
                className={clsx(
                  'p-4 rounded-xl border bg-navy-900/90 hover:bg-navy-850 cursor-pointer transition-all duration-200 shadow-md group',
                  isFailed && 'border-rose-500/40 shadow-rose-950/20',
                  isAtRisk && 'border-amber-500/40 shadow-amber-950/20',
                  !isFailed && !isAtRisk && 'border-navy-800 hover:border-slate-700'
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-navy-800/80">
                  <div className="flex items-center gap-2">
                    <Server className={clsx(
                      'w-4 h-4',
                      isFailed ? 'text-rose-400' : isAtRisk ? 'text-amber-400' : 'text-brand-cyan'
                    )} />
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{node.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{node.rack_id}</span>
                    </div>
                  </div>
                  <StatusBadge status={node.status} size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs font-mono">
                  <div className="bg-navy-950/80 p-2 rounded border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">CPU LOAD</span>
                    <span className="font-semibold text-slate-200">{node.cpu_utilization.toFixed(0)}%</span>
                  </div>
                  <div className="bg-navy-950/80 p-2 rounded border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">RESPONSE</span>
                    <span className={clsx('font-semibold', node.current_response_time_ms > 40 ? 'text-amber-400' : 'text-slate-200')}>
                      {node.current_response_time_ms.toFixed(0)}ms
                    </span>
                  </div>
                  <div className="bg-navy-950/80 p-2 rounded border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">REPLICAS</span>
                    <span className="font-semibold text-brand-cyan">{node.replica_count}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Disk Used: <strong className="text-slate-200 font-mono">{node.storage_used_mb.toFixed(1)} MB</strong></span>
                  <span className="text-brand-cyan group-hover:underline flex items-center gap-0.5">
                    Inspect <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTIONS D & E: CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Node Response Time Comparison */}
        <div className="bg-navy-900 p-5 rounded-xl border border-navy-800 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Live Node Latency Comparison</h4>
              <p className="text-xs text-slate-400">Current round-trip ping measurements across cluster</p>
            </div>
            <Clock className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION F: RECENT EVENTS */}
        <div className="bg-navy-900 p-5 rounded-xl border border-navy-800 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Recent System Events</h4>
              <p className="text-xs text-slate-400">Live operational & self-healing audit feed</p>
            </div>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-52 pr-1">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No system events recorded yet.</p>
            ) : (
              events.slice(0, 6).map((evt) => (
                <div
                  key={evt.event_id}
                  className="p-2.5 rounded-lg bg-navy-950 border border-navy-800 text-xs flex items-start gap-2.5"
                >
                  <StatusBadge status={evt.severity} size="sm" showPulse={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate">{evt.description}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString()} • {evt.event_type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Node Detail Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={() => {
            onRefresh();
            // Re-fetch updated node info
            setSelectedNode((prev) => (prev ? nodes.find((n) => n.node_id === prev.node_id) || null : null));
          }}
        />
      )}
    </div>
  );
};

