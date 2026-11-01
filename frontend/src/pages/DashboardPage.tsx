import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  FileText,
  HardDrive,
  LifeBuoy,
  Upload,
  FolderOpen,
  Flame,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Activity,
  Play,
  RotateCcw
} from 'lucide-react';
import { ClusterOverviewData, NodeData, FileData, SystemEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { DemoGuideModal } from '../components/common/DemoGuideModal';
import { UploadFileModal } from '../components/common/UploadFileModal';
import { ClusterTopology } from '../components/topology/ClusterTopology';
import { NodeDetailModal } from '../components/nodes/NodeDetailModal';
import { api } from '../services/api';
import clsx from 'clsx';

interface DashboardPageProps {
  overview: ClusterOverviewData | null;
  nodes: NodeData[];
  files: FileData[];
  events: SystemEvent[];
  onRefresh: () => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  overview,
  nodes,
  files,
  events,
  onRefresh,
  onSimulateFailure,
  onRestoreNode
}) => {
  const navigate = useNavigate();

  // Modals state
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [showFullTopology, setShowFullTopology] = useState<boolean>(false);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Derived cluster numbers
  const workingCount = nodes.filter((n) => n.status === 'NORMAL').length;
  const slowCount = nodes.filter((n) => n.status === 'AT-RISK').length;
  const offlineCount = nodes.filter((n) => n.status === 'FAIL-STOP').length;
  const totalNodesCount = nodes.length || 6;
  const pendingJobs = overview?.pending_recovery_jobs || 0;
  const clusterHealth = overview?.cluster_health || 'Healthy';

  // Quick recovery execution from dashboard
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const handleQuickRecovery = async () => {
    setIsRecovering(true);
    try {
      await api.runRecoveryNow();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecovering(false);
    }
  };

  // Generate plain-English status message
  let statusMessage = "All available storage servers are working normally. Your files have full redundant copies.";
  let statusSeverity = "NORMAL";

  if (offlineCount >= 2 || pendingJobs > 4) {
    statusMessage = `${offlineCount} storage servers are currently offline and ${pendingJobs} files need recovery. Immediate attention is recommended.`;
    statusSeverity = "CRITICAL";
  } else if (offlineCount === 1) {
    statusMessage = "One storage server is offline. Some files may have fewer available copies. Review the affected files and start recovery.";
    statusSeverity = "WARNING";
  } else if (slowCount > 0) {
    statusMessage = `${slowCount} server(s) are experiencing high response times. Predictive health monitoring is tracking their stability.`;
    statusSeverity = "WARNING";
  } else if (pendingJobs > 0) {
    statusMessage = `${pendingJobs} file(s) are currently under-replicated. Click 'Start Recovery' to restore redundant copies.`;
    statusSeverity = "WARNING";
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP HEADER & GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
              SelfHeal <span className="text-brand-cyan">Storage</span>
            </h1>
            <StatusBadge status={clusterHealth} size="md" />
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Your files, protected across multiple storage servers.
          </p>
        </div>

        {/* Demo Guide Button */}
        <button
          onClick={() => setIsDemoGuideOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-brand-cyan border border-brand-cyan/40 hover:border-brand-cyan shadow-sm transition-all self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Demo Guide (5-Step Tour)</span>
        </button>
      </div>

      {/* 2. THREE PRIMARY ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          onClick={() => setIsUploadOpen(true)}
          className="p-4 rounded-xl bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 font-bold text-sm flex items-center justify-between shadow-lg shadow-cyan-950/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-950/20 rounded-lg">
              <Upload className="w-5 h-5 text-navy-950" />
            </div>
            <div className="text-left">
              <span className="block">Upload a File</span>
              <span className="text-[11px] font-normal text-navy-900/80">Store & replicate new document</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

        <button
          onClick={() => navigate('/files')}
          className="p-4 rounded-xl bg-navy-900 hover:bg-navy-850 text-white font-bold text-sm border border-navy-700/80 hover:border-slate-600 flex items-center justify-between shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-cyan/10 text-brand-cyan rounded-lg border border-brand-cyan/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block">View My Files</span>
              <span className="text-[11px] font-normal text-slate-400">Inspect replicas & downloads</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
        </button>

        <button
          onClick={() => navigate('/self-healing')}
          className="p-4 rounded-xl bg-navy-900 hover:bg-navy-850 text-white font-bold text-sm border border-navy-700/80 hover:border-slate-600 flex items-center justify-between shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block">Run Failure Simulation</span>
              <span className="text-[11px] font-normal text-slate-400">Test server crash & self-healing</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* 3. FOUR CLEAR SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Storage Servers */}
        <div
          onClick={() => navigate('/servers')}
          className="bg-navy-900 p-5 rounded-2xl border border-navy-800 hover:border-slate-700 cursor-pointer shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Servers</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-white">
              {workingCount} of {totalNodesCount} working
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {offlineCount > 0 ? `${offlineCount} server offline` : 'All 6 nodes operational'}
            </p>
          </div>
        </div>

        {/* Card 2: Files Stored */}
        <div
          onClick={() => navigate('/files')}
          className="bg-navy-900 p-5 rounded-2xl border border-navy-800 hover:border-slate-700 cursor-pointer shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Files Stored</span>
            <div className="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-white">
              {overview?.total_files || 0} files
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {overview?.total_replicas || 0} total copies maintained
            </p>
          </div>
        </div>

        {/* Card 3: Storage Used */}
        <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Storage Used</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-white">
              {overview?.used_capacity_mb.toFixed(1) || 0} MB
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              of 300 GB capacity ({overview?.storage_utilization_pct || 0}% used)
            </p>
          </div>
        </div>

        {/* Card 4: Files Needing Recovery */}
        <div
          onClick={() => navigate('/self-healing')}
          className={clsx(
            'bg-navy-900 p-5 rounded-2xl border cursor-pointer shadow-lg transition-all',
            pendingJobs > 0
              ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-navy-900 hover:border-amber-400 ring-1 ring-amber-500/30'
              : 'border-navy-800 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Files Needing Recovery</span>
            <div className={clsx(
              'p-2 rounded-lg border',
              pendingJobs > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}>
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={clsx(
              'text-2xl font-bold font-mono',
              pendingJobs > 0 ? 'text-amber-300' : 'text-white'
            )}>
              {pendingJobs === 0 ? '0 files' : `${pendingJobs} file${pendingJobs > 1 ? 's' : ''}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {pendingJobs === 0 ? 'All copies fully protected' : 'Requires self-healing recovery'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. SIMPLE SYSTEM STATUS PANEL */}
      <div className={clsx(
        'p-5 rounded-2xl border shadow-lg backdrop-blur-md transition-all',
        statusSeverity === 'NORMAL' && 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200',
        statusSeverity === 'WARNING' && 'bg-amber-950/20 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/20',
        statusSeverity === 'CRITICAL' && 'bg-rose-950/25 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/30'
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={clsx(
              'p-2.5 rounded-xl border mt-0.5 shrink-0',
              statusSeverity === 'NORMAL' && 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
              statusSeverity === 'WARNING' && 'bg-amber-500/10 border-amber-500/40 text-amber-400',
              statusSeverity === 'CRITICAL' && 'bg-rose-500/10 border-rose-500/40 text-rose-400'
            )}>
              {statusSeverity === 'NORMAL' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">System Status</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/30 border border-white/10 font-mono">
                  {clusterHealth}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
            {pendingJobs > 0 && (
              <button
                onClick={handleQuickRecovery}
                disabled={isRecovering}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-navy-950 hover:bg-amber-400 shadow-md transition-all disabled:opacity-50"
              >
                {isRecovering ? 'Restoring...' : 'Start Recovery Now'}
              </button>
            )}

            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-navy-900 hover:bg-navy-850 text-slate-300 border border-navy-700 transition-colors"
            >
              <span>{showTechDetails ? 'Hide Technical Details' : 'Technical Details'}</span>
              {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Technical Details */}
        {showTechDetails && (
          <div className="mt-4 pt-4 border-t border-navy-800 text-xs font-mono space-y-2 text-slate-300 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                <span className="text-[10px] text-slate-500 block">EVALUATOR DECISION</span>
                <span className="text-white">{overview?.cluster_health_reason || 'Quorum verified across Rack-A & Rack-B'}</span>
              </div>
              <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                <span className="text-[10px] text-slate-500 block">HEARTBEAT FREQUENCY</span>
                <span className="text-brand-cyan">3.0 seconds (Sliding Window N=10)</span>
              </div>
              <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                <span className="text-[10px] text-slate-500 block">FAIL-STOP THRESHOLD</span>
                <span className="text-slate-200">θ_crit ≥ 0.70 or 4 missed heartbeats</span>
              </div>
              <div className="bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                <span className="text-[10px] text-slate-500 block">REDUNDANCY POLICIES</span>
                <span className="text-emerald-400">Dynamic 5-Rule Adaptive Engine</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. COMPACT NETWORK OVERVIEW */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-cyan" />
              Compact Storage Network Overview (6 Nodes across 2 Racks)
            </h3>
            <p className="text-xs text-slate-400">
              {workingCount} Working • {slowCount} Slow • {offlineCount} Offline
            </p>
          </div>

          <button
            onClick={() => setShowFullTopology(!showFullTopology)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-brand-cyan border border-navy-700 transition-colors self-start sm:self-auto"
          >
            <span>{showFullTopology ? 'Hide Interactive Graph' : 'View Full Network Graph'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compact Node Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {nodes.map((node) => {
            const isWorking = node.status === 'NORMAL';
            const isSlow = node.status === 'AT-RISK';
            const isOffline = node.status === 'FAIL-STOP';

            return (
              <div
                key={node.node_id}
                onClick={() => setSelectedNode(node)}
                className={clsx(
                  'p-3 rounded-xl border bg-navy-950 hover:bg-navy-850 cursor-pointer transition-all duration-150 shadow-sm flex flex-col justify-between text-left',
                  isWorking && 'border-emerald-500/30 hover:border-emerald-500/60',
                  isSlow && 'border-amber-500/40 hover:border-amber-500/80 bg-amber-950/10',
                  isOffline && 'border-rose-500/50 hover:border-rose-500/80 bg-rose-950/20'
                )}
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-xs font-bold text-white font-mono">{node.name.replace('Alpha-', 'A-').replace('Beta-', 'B-')}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'bg-emerald-400' : isSlow ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">{node.rack_id}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-navy-800 text-[11px] font-mono flex items-center justify-between">
                  <span className="text-slate-400">
                    {isOffline ? 'Offline' : `${node.current_response_time_ms.toFixed(0)}ms`}
                  </span>
                  <span className="text-brand-cyan font-semibold">
                    {node.replica_count} reps
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Full React Flow Topology (Expandable on demand) */}
        {showFullTopology && (
          <div className="mt-4 pt-4 border-t border-navy-800 animate-in fade-in duration-200">
            <ClusterTopology
              nodes={nodes}
              files={files}
              onSelectNode={(node) => setSelectedNode(node)}
              onSimulateFailure={onSimulateFailure}
              onRestoreNode={onRestoreNode}
            />
          </div>
        )}
      </div>

      {/* 6. RECENT RELEVANT EVENTS FEED */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-navy-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Recent System Activity
            </h3>
            <p className="text-xs text-slate-400">Plain English audit history of cluster operations</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-xs text-brand-cyan hover:underline font-medium"
          >
            View Full Audit Logs →
          </button>
        </div>

        <div className="divide-y divide-navy-800/60 max-h-48 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No recent cluster activity.</p>
          ) : (
            events.slice(0, 5).map((evt) => (
              <div key={evt.event_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusBadge status={evt.severity} size="sm" showPulse={false} />
                  <span className="text-slate-200 truncate">{evt.description}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODALS */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onQuickSimulateFailure={() => onSimulateFailure('node_1')}
        onQuickRunRecovery={handleQuickRecovery}
        clusterStats={{
          totalFiles: overview?.total_files || 0,
          failedNodes: offlineCount,
          pendingRecovery: pendingJobs
        }}
      />

      <UploadFileModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={onRefresh}
      />

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

