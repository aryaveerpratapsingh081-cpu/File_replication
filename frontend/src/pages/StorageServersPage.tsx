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
  Network,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { NodeData, FileData } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ClusterTopology } from '../components/topology/ClusterTopology';
import { NodeDetailModal } from '../components/nodes/NodeDetailModal';
import { api } from '../services/api';
import clsx from 'clsx';

interface StorageServersPageProps {
  nodes: NodeData[];
  files: FileData[];
  onRefresh: () => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

export const StorageServersPage: React.FC<StorageServersPageProps> = ({
  nodes,
  files,
  onRefresh,
  onSimulateFailure,
  onRestoreNode
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'topology'>('cards');
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

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
      await onSimulateFailure(nodeId);
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
      await onRestoreNode(nodeId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Server className="w-5 h-5 text-brand-cyan" />
            Storage Servers & Rack Failure Domains
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor server health across Rack-A and Rack-B, test network latency, and simulate server failure scenarios.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-navy-900 p-1 rounded-xl border border-navy-800 text-xs">
          <button
            onClick={() => setViewMode('cards')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
              viewMode === 'cards'
                ? 'bg-brand-cyan text-navy-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Server Cards</span>
          </button>
          <button
            onClick={() => setViewMode('topology')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
              viewMode === 'topology'
                ? 'bg-brand-cyan text-navy-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Interactive Topology</span>
          </button>
        </div>
      </div>

      {/* TOPOLOGY VIEW */}
      {viewMode === 'topology' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <ClusterTopology
            nodes={nodes}
            files={files}
            onSelectNode={(node) => setSelectedNode(node)}
            onSimulateFailure={handleSimulateFailure}
            onRestoreNode={handleRestore}
          />
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-200">
          {nodes.map((node) => {
            const isWorking = node.status === 'NORMAL';
            const isSlow = node.status === 'AT-RISK';
            const isOffline = node.status === 'FAIL-STOP';
            const isExpanded = expandedNodeIds.has(node.node_id);
            const isPending = actionPendingId === node.node_id;

            return (
              <div
                key={node.node_id}
                className={clsx(
                  'bg-navy-900 rounded-2xl border p-5 flex flex-col justify-between shadow-xl transition-all duration-200',
                  isWorking && 'border-navy-800 hover:border-slate-700',
                  isSlow && 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-navy-900',
                  isOffline && 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-navy-900'
                )}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between pb-3 border-b border-navy-800">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'p-2.5 rounded-xl border',
                        isWorking && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                        isSlow && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                        isOffline && 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      )}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white font-mono">{node.name}</h3>
                        <span className="text-xs text-slate-400 font-mono">
                          {node.rack_id} • {node.switch_id}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={node.status} size="sm" />
                  </div>

                  {/* Plain English Health Description */}
                  <div className="py-3 text-xs leading-relaxed text-slate-300">
                    {isOffline ? (
                      <span className="text-rose-300 font-medium">Server is stopped. Replicas are inaccessible until restored.</span>
                    ) : isSlow ? (
                      <span className="text-amber-300 font-medium">Latency has degraded (+{node.response_time_slope.toFixed(1)} ms/s). Proactive replica relocation proposed.</span>
                    ) : (
                      <span className="text-emerald-300 font-medium">Operational. Latency stable with zero missed heartbeats.</span>
                    )}
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs font-mono">
                    <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Response</span>
                      <span className={clsx('font-bold', isSlow ? 'text-amber-400' : 'text-slate-200')}>
                        {isOffline ? 'OFF' : `${node.current_response_time_ms.toFixed(0)}ms`}
                      </span>
                    </div>
                    <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Replicas</span>
                      <span className="font-bold text-brand-cyan">{node.replica_count}</span>
                    </div>
                    <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Disk Used</span>
                      <span className="font-bold text-slate-200">{node.storage_used_mb.toFixed(1)} MB</span>
                    </div>
                  </div>

                  {/* Expandable Advanced Technical Metrics */}
                  <div className="pt-2">
                    <button
                      onClick={() => toggleExpand(node.node_id)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-sans"
                    >
                      <span>{isExpanded ? 'Hide Advanced Details' : 'Show Advanced Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] font-mono space-y-1 text-slate-300 animate-in fade-in duration-150">
                        <div className="flex justify-between">
                          <span className="text-slate-500">OLS Regression Slope:</span>
                          <span className={node.response_time_slope > 2 ? 'text-amber-400' : 'text-slate-200'}>
                            {node.response_time_slope > 0 ? `+${node.response_time_slope.toFixed(2)}` : node.response_time_slope.toFixed(2)} ms/s
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Calculated Risk Score:</span>
                          <span className="font-bold text-slate-200">{node.risk_score.toFixed(2)} / 1.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Missed Heartbeats:</span>
                          <span>{node.missed_heartbeats} / 4 limit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CPU Load:</span>
                          <span>{node.cpu_utilization.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Power Domain:</span>
                          <span>{node.power_domain_id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulation Action Controls on Card */}
                <div className="pt-4 mt-3 border-t border-navy-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-mono">Failure Simulator:</span>
                    <button
                      onClick={() => setSelectedNode(node)}
                      className="text-brand-cyan hover:underline text-xs"
                    >
                      Inspect Server →
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {isOffline ? (
                      <button
                        disabled={isPending}
                        onClick={() => handleRestore(node.node_id)}
                        className="col-span-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                        Restore Server
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={isPending}
                          onClick={() => handleSimulateLatency(node.node_id, 40)}
                          className="py-1.5 rounded-lg text-[11px] font-medium bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors disabled:opacity-40"
                          title="Inject +40ms network latency"
                        >
                          +40ms
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleSimulateLatency(node.node_id, 80)}
                          className="py-1.5 rounded-lg text-[11px] font-medium bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 transition-colors"
                          title="Simulate slow degradation to trigger At-Risk"
                        >
                          Make Slow
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleSimulateFailure(node.node_id)}
                          className="py-1.5 rounded-lg text-[11px] font-medium bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors"
                          title="Simulate complete server crash"
                        >
                          Stop Server
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Node Inspector Modal */}
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

