import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Activity,
  HardDrive,
  Cpu,
  Clock,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { NodeData } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { api } from '../../services/api';
import clsx from 'clsx';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface NodeDetailModalProps {
  node: NodeData | null;
  onClose: () => void;
  onNodeUpdated: () => void;
}

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  onClose,
  onNodeUpdated
}) => {
  const [replicas, setReplicas] = useState<any[]>([]);
  const [loadingReplicas, setLoadingReplicas] = useState<boolean>(false);
  const [addedLatency, setAddedLatency] = useState<number>(node?.simulated_latency_added_ms || 0);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  useEffect(() => {
    if (node) {
      setLoadingReplicas(true);
      api.getNodeReplicas(node.node_id)
        .then((data) => setReplicas(data))
        .catch(console.error)
        .finally(() => setLoadingReplicas(false));
      setAddedLatency(node.simulated_latency_added_ms || 0);
    }
  }, [node]);

  if (!node) return null;

  const handleSimulateLatency = async (ms: number) => {
    setIsActionPending(true);
    try {
      await api.simulateLatency(node.node_id, ms);
      setAddedLatency(ms);
      onNodeUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSimulateFailure = async () => {
    setIsActionPending(true);
    try {
      await api.simulateFailure(node.node_id);
      onNodeUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRestore = async () => {
    setIsActionPending(true);
    try {
      await api.restoreNode(node.node_id);
      setAddedLatency(0);
      onNodeUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionPending(false);
    }
  };

  // Prepare chart data from recent response times
  const chartData = (node.recent_response_times || []).map((ms, index) => ({
    sample: `T-${(node.recent_response_times.length - index) * 3}s`,
    latency: ms
  }));

  const isFailed = node.status === 'FAIL-STOP';
  const isAtRisk = node.status === 'AT-RISK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2.5 rounded-xl border',
              !isFailed && !isAtRisk && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
              isAtRisk && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
              isFailed && 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            )}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{node.name}</h3>
                <span className="text-xs text-slate-400 font-mono">({node.node_id})</span>
                <StatusBadge status={node.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rack: <span className="text-slate-200 font-mono">{node.rack_id}</span> •
                Switch: <span className="text-slate-200 font-mono">{node.switch_id}</span> •
                Power: <span className="text-slate-200 font-mono">{node.power_domain_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Health Decision Breakdown Banner */}
          <div className={clsx(
            'p-4 rounded-xl border text-xs',
            !isFailed && !isAtRisk && 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
            isAtRisk && 'bg-amber-950/30 border-amber-500/30 text-amber-200',
            isFailed && 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          )}>
            <div className="flex items-start gap-2.5">
              <Activity className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block uppercase tracking-wider text-[11px]">
                  Health Assessment Rationale:
                </span>
                <p className="mt-0.5">{node.risk_explanation}</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-cyan" /> Response Time
              </span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {node.current_response_time_ms.toFixed(1)} <span className="text-xs font-normal text-slate-400">ms</span>
              </p>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Regression Slope
              </span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {node.response_time_slope > 0 ? `+${node.response_time_slope.toFixed(2)}` : node.response_time_slope.toFixed(2)}
                <span className="text-xs font-normal text-slate-400"> ms/s</span>
              </p>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Risk Score
              </span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {node.risk_score.toFixed(2)}
                <span className="text-xs font-normal text-slate-400"> / 1.0</span>
              </p>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Disk Stored
              </span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {node.storage_used_mb.toFixed(2)} <span className="text-xs font-normal text-slate-400">MB</span>
              </p>
            </div>
          </div>

          {/* Response Time Trend Chart */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recent Response-Time Sliding Window (OLS Least-Squares Input)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Window Size: 10 Samples</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sample" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="ms" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#06b6d4' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand-cyan" />
              Controlled Node Failure & Degradation Simulator
            </h4>
            <p className="text-xs text-slate-400">
              Trigger real backend state mutations to verify linear regression slope detection and automatic replica healing.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                disabled={isActionPending || isFailed}
                onClick={() => handleSimulateLatency(30)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 transition-colors disabled:opacity-50"
              >
                +30ms Latency
              </button>
              <button
                disabled={isActionPending || isFailed}
                onClick={() => handleSimulateLatency(75)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/40 transition-colors disabled:opacity-50"
              >
                +75ms (Trigger AT-RISK)
              </button>
              <button
                disabled={isActionPending || isFailed}
                onClick={handleSimulateFailure}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-600/40 transition-colors disabled:opacity-50"
              >
                Simulate FAIL-STOP
              </button>
              <button
                disabled={isActionPending}
                onClick={handleRestore}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                Restore Node
              </button>
            </div>
          </div>

          {/* Replicas on this node */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Replicas Stored on this Node ({replicas.length})</span>
              {loadingReplicas && <span className="text-[10px] text-brand-cyan">Loading...</span>}
            </h4>

            {replicas.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center bg-navy-950 rounded-lg border border-navy-800">
                No file replicas currently allocated to this node.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {replicas.map((rep) => (
                  <div
                    key={rep.replica_id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-navy-950 border border-navy-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-white font-medium">{rep.filename}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">ID: {rep.file_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'text-[10px] px-2 py-0.5 rounded font-medium',
                        rep.file_importance === 'Critical' ? 'bg-amber-950 text-amber-300 border border-amber-600/40' : 'bg-slate-800 text-slate-300'
                      )}>
                        {rep.file_importance}
                      </span>
                      {rep.is_corrupted ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/40">
                          Corrupted
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                          Intact
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

