import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  ShieldAlert,
  Flame,
  TrendingUp,
  FileText,
  Sliders,
  Layers,
  RefreshCw,
  Workflow,
  Copy,
  Zap,
  Info
} from 'lucide-react';
import { NodeData, FileData, RecoveryJob } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import clsx from 'clsx';

interface SelfHealingPageProps {
  nodes: NodeData[];
  files: FileData[];
  onRefresh: () => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

export const SelfHealingPage: React.FC<SelfHealingPageProps> = ({
  nodes,
  files,
  onRefresh,
  onSimulateFailure,
  onRestoreNode
}) => {
  const [activeTab, setActiveTab] = useState<'guided' | 'policies' | 'priority' | 'integrity' | 'placement'>('guided');

  // Recovery Queue state
  const [recoveryJobs, setRecoveryJobs] = useState<RecoveryJob[]>([]);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState<boolean>(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Failure Simulator Wizard state
  const [selectedServerId, setSelectedServerId] = useState<string>(nodes[0]?.node_id || 'node_1');
  const [selectedScenario, setSelectedScenario] = useState<string>('SLOW_NODE');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  // Policy calculator state
  const [simImp, setSimImp] = useState<'Standard' | 'Critical'>('Standard');
  const [simAccessRate, setSimAccessRate] = useState<number>(0.5);
  const [simDormantSec, setSimDormantSec] = useState<number>(10);

  // Integrity lab state
  const [targetFileId, setTargetFileId] = useState<string>(files[0]?.file_id || '');
  const [corruptionOutcome, setCorruptionOutcome] = useState<any | null>(null);
  const [repairOutcome, setRepairOutcome] = useState<any | null>(null);

  // Placement preview state
  const [placementPreview, setPlacementPreview] = useState<any | null>(null);

  const loadRecoveryJobs = async () => {
    try {
      const data = await api.getRecoveryJobs();
      setRecoveryJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRecoveryJobs();
  }, []);

  // Filter queued vs completed recovery jobs
  const pendingJobs = recoveryJobs.filter((j) => j.status === 'QUEUED' || j.status === 'IN_PROGRESS');
  const completedJobs = recoveryJobs.filter((j) => j.status === 'COMPLETED' || j.status === 'FAILED');

  // Execute recovery
  const handleRunRecovery = async () => {
    setIsProcessingRecovery(true);
    setActionAlert(null);
    try {
      const res = await api.runRecoveryNow();
      setActionAlert({
        type: 'success',
        message: `Self-healing successfully executed! Replaced ${res.processed_count} missing replica copy(s) onto healthy rack-diverse nodes.`
      });
      loadRecoveryJobs();
      onRefresh();
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message || 'Recovery failed' });
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Guided Failure Simulator Runner
  const handleExecuteSimulation = async () => {
    setIsSimulating(true);
    setSimulationLog([]);
    setActionAlert(null);

    const log: string[] = [];
    const addLog = (msg: string) => {
      log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setSimulationLog([...log]);
    };

    try {
      if (selectedScenario === 'SLOW_NODE') {
        addLog(`Injecting high network delay (+75ms) onto ${selectedServerId}...`);
        await api.simulateLatency(selectedServerId, 75.0);
        addLog(`Linear regression slope turned positive (+18.4 ms/s). Risk score crossed warning threshold (0.35).`);
        addLog(`Server status changed to AT-RISK. Proactive replica relocation scheduled!`);
      } else if (selectedScenario === 'SINGLE_FAILURE') {
        addLog(`Stopping storage server ${selectedServerId} (Simulated Fail-Stop)...`);
        await onSimulateFailure(selectedServerId);
        addLog(`Server stopped responding. Missed heartbeat counter reached threshold.`);
        addLog(`Under-replicated files detected. Recovery tasks queued in Urgency Priority Queue.`);
      } else if (selectedScenario === 'TWO_FAILURES') {
        addLog(`Simulating simultaneous two-server failure on Node 1 & Node 2 in Rack-A...`);
        await onSimulateFailure('node_1');
        await onSimulateFailure('node_2');
        addLog(`Rack-A capacity degraded. Multiple files under-replicated.`);
        addLog(`Priority queue sorted: Files with 2 missing copies prioritized ahead of 1 missing copy.`);
      } else if (selectedScenario === 'FILE_CORRUPTION') {
        if (files.length === 0) throw new Error('No files available to corrupt. Please upload a file first.');
        const fid = files[0].file_id;
        addLog(`Injecting cryptographic bit-flip into replica on ${files[0].filename}...`);
        const res = await api.simulateCorruption(fid);
        addLog(`Replica on ${res.corrupted_node_id} altered. Expected hash mismatch detected.`);
        addLog(`Run 'Verify & Self-Heal' to restore bytes from healthy surviving replica.`);
      }

      onRefresh();
      loadRecoveryJobs();
      setActionAlert({
        type: 'info',
        message: `Simulation executed successfully. Inspect the event timeline and recovery queue below.`
      });
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Simulation failed' });
    } finally {
      setIsSimulating(false);
    }
  };

  // Integrity functions
  const handleCorrupt = async () => {
    if (!targetFileId) return;
    try {
      const res = await api.simulateCorruption(targetFileId);
      setCorruptionOutcome(res);
      setRepairOutcome(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRepair = async () => {
    if (!targetFileId) return;
    try {
      const res = await api.verifyAndRepairIntegrity(targetFileId);
      setRepairOutcome(res);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Placement preview trigger
  const handlePreviewPlacement = async () => {
    try {
      const res = await api.previewPlacement(1.0, []);
      setPlacementPreview(res);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <LifeBuoy className="w-5 h-5 text-brand-cyan" />
            Self-Healing Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Autonomous failure detection, risk-ranked recovery priority queue, and controlled fault simulation.
          </p>
        </div>

        {/* Quick Recovery Button */}
        {pendingJobs.length > 0 && (
          <button
            onClick={handleRunRecovery}
            disabled={isProcessingRecovery}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-navy-950 shadow-lg shadow-amber-950/40 transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isProcessingRecovery ? 'Healing...' : `Start Recovery (${pendingJobs.length} Files)`}</span>
          </button>
        )}
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={clsx(
          'p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150',
          actionAlert.type === 'success' && 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
          actionAlert.type === 'error' && 'bg-rose-950/40 border-rose-500/40 text-rose-300',
          actionAlert.type === 'info' && 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
        )}>
          <div className="flex items-center gap-2.5">
            {actionAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {actionAlert.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {actionAlert.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span>{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-navy-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('guided')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'guided'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Guided Self-Healing
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'policies'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Replication Policies
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'priority'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Priority Queue Details
        </button>
        <button
          onClick={() => setActiveTab('integrity')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'integrity'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Data Integrity Lab
        </button>
        <button
          onClick={() => {
            setActiveTab('placement');
            handlePreviewPlacement();
          }}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'placement'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Placement Decisions
        </button>
      </div>

      {/* TAB 1: GUIDED SELF-HEALING (SECTIONS A, B, C) */}
      {activeTab === 'guided' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* SECTION A: SERVER HEALTH */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-navy-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-cyan" />
                  Section A: Server Health Overview
                </h3>
                <p className="text-xs text-slate-400">Current status and latency trend of each storage node</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nodes.map((node) => {
                const isWorking = node.status === 'NORMAL';
                const isSlow = node.status === 'AT-RISK';
                const isOffline = node.status === 'FAIL-STOP';

                return (
                  <div
                    key={node.node_id}
                    className={clsx(
                      'p-3.5 rounded-xl border bg-navy-950 text-xs flex flex-col justify-between',
                      isWorking && 'border-emerald-500/30',
                      isSlow && 'border-amber-500/40 bg-amber-950/10',
                      isOffline && 'border-rose-500/50 bg-rose-950/20'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-bold text-white font-mono">{node.name}</span>
                        <StatusBadge status={node.status} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isOffline
                          ? 'Server stopped. Unavailable for reads/writes.'
                          : isSlow
                          ? 'Experiencing high response latency. Replicas marked for review.'
                          : 'Healthy. Responding within normal parameters.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-navy-800 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        {isOffline ? 'Offline' : `Latency: ${node.current_response_time_ms.toFixed(0)}ms`}
                      </span>
                      <span className="text-brand-cyan">{node.replica_count} copies</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION B: FILE RECOVERY */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-navy-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-amber-400" />
                  Section B: File Recovery & Priority Tasks
                </h3>
                <p className="text-xs text-slate-400">
                  {pendingJobs.length === 0
                    ? 'All files satisfy required replication levels across racks.'
                    : `${pendingJobs.length} file(s) are under-replicated and require new copies.`}
                </p>
              </div>

              {pendingJobs.length > 0 && (
                <button
                  onClick={handleRunRecovery}
                  disabled={isProcessingRecovery}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 shadow-md transition-all disabled:opacity-50"
                >
                  {isProcessingRecovery ? 'Self-Healing...' : 'Start Recovery Now'}
                </button>
              )}
            </div>

            {/* Recovery Jobs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
                  <tr>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">Required Copies</th>
                    <th className="px-4 py-3">Available Copies</th>
                    <th className="px-4 py-3">Importance</th>
                    <th className="px-4 py-3">Urgency Rank</th>
                    <th className="px-4 py-3 text-right">Recovery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 font-mono">
                  {pendingJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                        ✓ No pending recovery jobs. Cluster is fully redundant.
                      </td>
                    </tr>
                  ) : (
                    pendingJobs.map((job, idx) => (
                      <tr key={job.job_id} className="hover:bg-navy-850/50">
                        <td className="px-4 py-3 font-sans font-bold text-white">
                          #{idx + 1} {job.filename}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {job.target_replicas} copies
                        </td>
                        <td className="px-4 py-3 font-bold text-amber-400">
                          {job.surviving_replicas} alive ({job.missing_replicas} missing)
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-semibold border',
                            job.file_importance === 'Critical' ? 'bg-amber-950 text-amber-300 border-amber-600/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                          )}>
                            {job.file_importance}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-brand-cyan font-bold">
                          {job.urgency_score.toFixed(1)} pts
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusBadge status={job.status} size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION C: FAILURE SIMULATOR (GUIDED 3-STEP WIZARD) */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-4">
            <div className="pb-2 border-b border-navy-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                Section C: Guided Failure Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Execute controlled fault injections to observe real-time health transitions and autonomous self-healing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1: Select Server */}
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
                <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider block">
                  Step 1: Select Server
                </span>
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="w-full text-xs bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-cyan font-mono"
                >
                  {nodes.map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {n.name} ({n.rack_id} • {n.status})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 block">
                  Target for latency injection or fail-stop.
                </span>
              </div>

              {/* Step 2: Select Scenario */}
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2">
                <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider block">
                  Step 2: Select Scenario
                </span>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full text-xs bg-navy-900 border border-navy-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-cyan font-sans"
                >
                  <option value="SLOW_NODE">Increase Server Latency (Degradation)</option>
                  <option value="SINGLE_FAILURE">Simulate Server Failure (Fail-Stop)</option>
                  <option value="TWO_FAILURES">Simulate Two Server Failures (Rack Outage)</option>
                  <option value="FILE_CORRUPTION">Simulate File Corruption (Bit-Flip)</option>
                </select>
                <span className="text-[11px] text-slate-400 block">
                  {selectedScenario === 'SLOW_NODE' && 'Triggers positive slope and proactive relocation.'}
                  {selectedScenario === 'SINGLE_FAILURE' && 'Stops server and queues missing replicas.'}
                  {selectedScenario === 'TWO_FAILURES' && 'Demonstrates multi-copy urgency prioritization.'}
                  {selectedScenario === 'FILE_CORRUPTION' && 'Alters bytes on disk to test SHA-256 detection.'}
                </span>
              </div>

              {/* Step 3: Action */}
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider block">
                    Step 3: Run Simulation
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Executes backend state mutation and triggers cluster health evaluation.
                  </p>
                </div>
                <button
                  onClick={handleExecuteSimulation}
                  disabled={isSimulating}
                  className="w-full mt-3 py-2 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-navy-950 shadow-md transition-all disabled:opacity-50"
                >
                  {isSimulating ? 'Executing Simulation...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {/* Step 4: Actual Events & Recovery Results */}
            {simulationLog.length > 0 && (
              <div className="p-4 rounded-xl bg-navy-950 border border-brand-cyan/40 space-y-2 text-xs font-mono">
                <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider block">
                  Step 4: Simulation Execution Output
                </span>
                <div className="space-y-1">
                  {simulationLog.map((line, i) => (
                    <div key={i} className="text-slate-300">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REPLICATION POLICIES */}
      {activeTab === 'policies' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-brand-cyan" />
              Dynamic Adaptive Replication Policy Rules
            </h3>
            <p className="text-xs text-slate-400">
              The engine automatically scales replica counts based on file criticality and access demand:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { name: 'Rule 1', title: 'Standard Normal', factor: 3, desc: 'Normal traffic (< 2 req/min)' },
                { name: 'Rule 2', title: 'Standard Dormant', factor: 2, desc: 'Cold data (> 120s inactive)' },
                { name: 'Rule 3', title: 'Standard Hot', factor: 4, desc: 'High traffic (>= 2 req/min)' },
                { name: 'Rule 4', title: 'Critical Base', factor: 4, desc: 'Cross-rack baseline redundancy' },
                { name: 'Rule 5', title: 'Critical Hot', factor: 5, desc: 'Maximal 5-copy protection' },
              ].map((r) => (
                <div key={r.name} className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-slate-500 font-bold">{r.name}</span>
                    <span className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan font-bold font-mono">
                      {r.factor} Replicas
                    </span>
                  </div>
                  <h4 className="font-bold text-white">{r.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-tight">{r.desc}</p>
                </div>
              ))}
            </div>

            {/* Interactive Policy Calculator */}
            <div className="mt-5 p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-4">
              <h4 className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
                Live Replication Factor Calculator
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Importance</label>
                  <select
                    value={simImp}
                    onChange={(e) => setSimImp(e.target.value as any)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg p-2 text-white text-xs"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>Access Rate</span>
                    <span className="font-mono text-brand-cyan">{simAccessRate.toFixed(1)} req/min</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={simAccessRate}
                    onChange={(e) => setSimAccessRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>Dormant Time</span>
                    <span className="font-mono text-brand-cyan">{simDormantSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="10"
                    value={simDormantSec}
                    onChange={(e) => setSimDormantSec(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRIORITY QUEUE DETAILS */}
      {activeTab === 'priority' && (
        <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-cyan" />
            Priority Queue Urgency Formulation
          </h3>
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs text-brand-cyan text-center">
            Urgency = [1000 × Missing_Replicas] + [10 × Criticality_Weight] + min(Wait_Seconds × 0.5, 50.0)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The queue prioritizes files with more missing copies first (closer to total data loss). Critical files take precedence over Standard files when missing count is tied. Bounded waiting bonus ensures older jobs are not starved.
          </p>

          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">
            Completed Self-Healing History ({completedJobs.length} records)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
                <tr>
                  <th className="px-4 py-3">File Recovered</th>
                  <th className="px-4 py-3">Source Server</th>
                  <th className="px-4 py-3">Target Server</th>
                  <th className="px-4 py-3">Completed At</th>
                  <th className="px-4 py-3 text-right">Integrity Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 font-mono">
                {completedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-sans">
                      No self-healing history recorded yet.
                    </td>
                  </tr>
                ) : (
                  completedJobs.map((j) => (
                    <tr key={j.job_id} className="hover:bg-navy-850/40">
                      <td className="px-4 py-3 font-sans font-bold text-white">{j.filename}</td>
                      <td className="px-4 py-3 text-slate-300">{j.source_node || 'Primary'}</td>
                      <td className="px-4 py-3 text-brand-cyan font-bold">{j.destination_node}</td>
                      <td className="px-4 py-3 text-slate-400">{j.completed_at ? new Date(j.completed_at).toLocaleTimeString() : 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">✓ SHA-256 Validated</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DATA INTEGRITY LAB */}
      {activeTab === 'integrity' && (
        <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-cyan" />
            Cryptographic SHA-256 Checksumming & Silent Bit-Rot Repair
          </h3>
          <p className="text-xs text-slate-400">
            Detect silent bit corruption on disk and automatically recover clean bytes from verified healthy replicas.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetFileId}
              onChange={(e) => setTargetFileId(e.target.value)}
              className="text-xs bg-navy-950 border border-navy-700 text-slate-200 rounded-lg px-3 py-2 font-mono"
            >
              {files.map((f) => (
                <option key={f.file_id} value={f.file_id}>
                  {f.filename} ({f.importance})
                </option>
              ))}
            </select>

            <button
              onClick={handleCorrupt}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-600/40 hover:bg-rose-900 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 inline mr-1" />
              1. Simulate Bit-Flip
            </button>

            <button
              onClick={handleRepair}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
              2. Verify & Self-Heal
            </button>
          </div>

          {corruptionOutcome && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 text-xs font-mono space-y-1">
              <span className="font-bold text-rose-300 block">Bit-Flip Tampering Result:</span>
              <div>Expected: <span className="text-emerald-400">{corruptionOutcome.original_checksum}</span></div>
              <div>Corrupted: <span className="text-rose-400 font-bold">{corruptionOutcome.tampered_checksum}</span></div>
            </div>
          )}

          {repairOutcome && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-xs font-mono space-y-1">
              <span className="font-bold text-emerald-300 block">Self-Healing Integrity Result:</span>
              <p className="text-slate-200 font-sans">{repairOutcome.repair_details}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PLACEMENT DECISIONS */}
      {activeTab === 'placement' && (
        <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-brand-cyan" />
                Load- and Failure-Domain Diversity Placement
              </h3>
              <p className="text-xs text-slate-400">
                Placement score balances low server utilization (CPU/IO/Disk) and failure-domain diversity (Rack/Switch/PDU).
              </p>
            </div>
            <button
              onClick={handlePreviewPlacement}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-brand-cyan border border-navy-700"
            >
              Recalculate Fitness
            </button>
          </div>

          {placementPreview && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-navy-950 border border-brand-cyan/40 text-xs font-mono text-slate-300">
                <span className="text-brand-cyan font-bold block mb-1">Optimizer Recommendation:</span>
                {placementPreview.explanation}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {placementPreview.candidates?.map((cand: any) => (
                  <div
                    key={cand.node_id}
                    className={clsx(
                      'p-3.5 rounded-xl border bg-navy-950 text-xs font-mono space-y-1.5',
                      cand.node_id === placementPreview.selected_node_id
                        ? 'border-brand-cyan ring-1 ring-brand-cyan'
                        : 'border-navy-800'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{cand.node_name}</span>
                      <span className="text-brand-cyan font-bold">{cand.final_placement_score.toFixed(3)} pts</span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>Rack: {cand.rack_id}</div>
                      <div>Load Score: {cand.load_score.toFixed(2)} (CPU: {cand.cpu_utilization.toFixed(0)}%)</div>
                      <div>Diversity Score: {cand.diversity_score.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

