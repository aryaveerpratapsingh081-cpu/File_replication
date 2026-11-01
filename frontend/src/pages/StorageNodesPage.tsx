import React, { useState } from 'react';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ShieldAlert,
  Flame,
  RotateCcw,
  Wifi,
  Power,
  Layers
} from 'lucide-react';
import { NodeData } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { NodeDetailModal } from '../components/nodes/NodeDetailModal';
import { api } from '../services/api';
import clsx from 'clsx';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface StorageNodesPageProps {
  nodes: NodeData[];
  onRefresh: () => void;
}

export const StorageNodesPage: React.FC<StorageNodesPageProps> = ({ nodes, onRefresh }) => {
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const handleSimulateLatency = async (nodeId: string, ms: number) => {
    setActionPendingId(nodeId);
    try {
      await api.simulateLatency(nodeId, ms);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleSimulateFailure = async (nodeId: string) => {
    setActionPendingId(nodeId);
    try {
      await api.simulateFailure(nodeId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleRestore = async (nodeId: string) => {
    setActionPendingId(nodeId);
    try {
      await api.restoreNode(nodeId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Server className="w-5 h-5 text-brand-cyan" />
            Storage Node Management & Failure Domains
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate network delays, missed heartbeats, and complete server stop events across 2 physical rack topologies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Cluster Nodes:</span>
          <span className="px-2.5 py-1 rounded-md bg-navy-800 text-brand-cyan font-mono text-xs font-semibold border border-navy-700">
            {nodes.length} Logical Nodes Active
          </span>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {nodes.map((node) => {
          const isFailed = node.status === 'FAIL-STOP';
          const isAtRisk = node.status === 'AT-RISK';
          const isPending = actionPendingId === node.node_id;

          const chartData = (node.recent_response_times || []).map((ms, idx) => ({
            idx,
            latency: ms
          }));

          return (
            <div
              key={node.node_id}
              className={clsx(
                'bg-navy-900 rounded-2xl border p-5 flex flex-col justify-between shadow-xl transition-all duration-200',
                isFailed && 'border-rose-500/50 shadow-rose-950/20 bg-gradient-to-b from-rose-950/20 to-navy-900',
                isAtRisk && 'border-amber-500/50 shadow-amber-950/20 bg-gradient-to-b from-amber-950/20 to-navy-900',
                !isFailed && !isAtRisk && 'border-navy-800 hover:border-slate-700'
              )}
            >
              <div>
                {/* Node Title & Status */}
                <div className="flex items-start justify-between pb-3 border-b border-navy-800">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-2.5 rounded-xl border',
                      isFailed ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                      isAtRisk ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    )}>
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">{node.name}</h3>
                      <span className="text-xs text-slate-400 font-mono">ID: {node.node_id}</span>
                    </div>
                  </div>
                  <StatusBadge status={node.status} size="sm" />
                </div>

                {/* Failure Domains info */}
                <div className="flex items-center justify-between py-2 text-[11px] text-slate-400 border-b border-navy-800/60 font-mono">
                  <span>Rack: <strong className="text-slate-200">{node.rack_id}</strong></span>
                  <span>Switch: <strong className="text-slate-200">{node.switch_id}</strong></span>
                  <span>PDU: <strong className="text-slate-200">{node.power_domain_id}</strong></span>
                </div>

                {/* Real-time Health Metrics */}
                <div className="grid grid-cols-2 gap-2.5 py-3">
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Latency (RTT)</span>
                    <span className="text-base font-bold font-mono text-white">
                      {node.current_response_time_ms.toFixed(1)} <span className="text-xs text-slate-400">ms</span>
                    </span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Slope (m)</span>
                    <span className={clsx(
                      'text-base font-bold font-mono',
                      node.response_time_slope > 2.0 ? 'text-amber-400' : 'text-slate-200'
                    )}>
                      {node.response_time_slope > 0 ? `+${node.response_time_slope.toFixed(2)}` : node.response_time_slope.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Risk Score</span>
                    <span className={clsx(
                      'text-base font-bold font-mono',
                      node.risk_score >= 0.7 ? 'text-rose-400' : node.risk_score >= 0.35 ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {node.risk_score.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded-xl border border-navy-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Missed HBs</span>
                    <span className={clsx(
                      'text-base font-bold font-mono',
                      node.missed_heartbeats > 0 ? 'text-rose-400' : 'text-slate-200'
                    )}>
                      {node.missed_heartbeats} / 4
                    </span>
                  </div>
                </div>

                {/* Response Trend Mini Chart */}
                <div className="bg-navy-950 p-2 rounded-xl border border-navy-800 mb-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-1 mb-1">
                    Sliding Window (10 Samples)
                  </span>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <YAxis hide domain={['dataMin - 5', 'dataMax + 10']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="latency"
                          stroke={isFailed ? '#ef4444' : isAtRisk ? '#f59e0b' : '#06b6d4'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Simulation Controls */}
              <div className="space-y-2 pt-2 border-t border-navy-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Replicas Stored: <strong className="text-white font-mono">{node.replica_count}</strong></span>
                  <button
                    onClick={() => setSelectedNode(node)}
                    className="text-brand-cyan hover:underline font-medium text-xs"
                  >
                    View Details →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    disabled={isPending || isFailed}
                    onClick={() => handleSimulateLatency(node.node_id, 40)}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors disabled:opacity-40"
                    title="Simulate +40ms network latency"
                  >
                    +40ms
                  </button>
                  {isFailed ? (
                    <button
                      disabled={isPending}
                      onClick={() => handleRestore(node.node_id)}
                      className="col-span-2 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 transition-colors"
                    >
                      Restore Node
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={isPending}
                        onClick={() => handleSimulateLatency(node.node_id, 80)}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 transition-colors"
                        title="Simulate severe latency to trigger AT-RISK status"
                      >
                        At-Risk
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => handleSimulateFailure(node.node_id)}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors"
                        title="Simulate total server fail-stop"
                      >
                        Fail-Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Detail Inspector Modal */}
      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNodeUpdated={() => {
            onRefresh();
            setSelectedNode((prev) => (prev ? nodes.find((n) => n.node_id === prev.node_id) || null : null));
          }}
        />
      )}
    </div>
  );
};

