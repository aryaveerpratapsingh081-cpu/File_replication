import React, { useState } from 'react';
import {
  Copy,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  Workflow
} from 'lucide-react';
import { api } from '../services/api';
import clsx from 'clsx';

export const ReplicationPage: React.FC = () => {
  // Interactive Rule Simulator State
  const [importance, setImportance] = useState<'Standard' | 'Critical'>('Standard');
  const [accessRate, setAccessRate] = useState<number>(0.5);
  const [dormantSeconds, setDormantSeconds] = useState<number>(10);

  // Write Pipeline Demonstration State
  const [pipelineMode, setPipelineMode] = useState<'PARALLEL_PUSH' | 'DAISY_CHAIN'>('PARALLEL_PUSH');
  const [isTestingPipeline, setIsTestingPipeline] = useState<boolean>(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // Compute calculated replication on client for live feedback
  const isHighAccess = accessRate >= 2.0;
  const isDormant = dormantSeconds > 120 && accessRate < 0.1;

  let calculatedFactor = 3;
  let activeRuleName = 'Rule 1: Standard Normal Access';
  let activeReason = 'Standard file with normal access rate: assigned baseline 3 replicas across failure domains.';

  if (importance === 'Critical') {
    if (isHighAccess) {
      calculatedFactor = 5;
      activeRuleName = 'Rule 5: Critical File with High Access Demand';
      activeReason = 'Critical file under heavy traffic: assigned maximum 5 replicas (4 base + 1 high access) to guarantee throughput and survival.';
    } else {
      calculatedFactor = 4;
      activeRuleName = 'Rule 4: Critical File Baseline';
      activeReason = 'Critical file with standard access: assigned 4 replicas ensuring full cross-rack survival.';
    }
  } else {
    if (isHighAccess) {
      calculatedFactor = 4;
      activeRuleName = 'Rule 3: Standard File with High Access Demand';
      activeReason = 'Standard file under high access demand: provisioned +1 extra replica (4 total) to distribute read load.';
    } else if (isDormant) {
      calculatedFactor = 2;
      activeRuleName = 'Rule 2: Standard File Dormant Scaling';
      activeReason = 'Standard file dormant for over 120s with zero traffic: scaled down to 2 replicas to conserve cluster disk space.';
    }
  }

  const handleTestWritePipeline = async () => {
    setIsTestingPipeline(true);
    try {
      const dummyFile = new File([new Uint8Array(1024 * 150)], `pipeline_bench_${Date.now()}.dat`);
      const res = await api.uploadFile(dummyFile, importance, pipelineMode);
      setPipelineResult(res.pipeline);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTestingPipeline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Copy className="w-5 h-5 text-brand-cyan" />
            Adaptive Replication Engine & Write Pipelines
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dynamic rule-based replication factor calculation based on file criticality, access frequency, and cold dormancy.
          </p>
        </div>
      </div>

      {/* 5 Demonstration Rules Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          { rule: 'Rule 1', title: 'Standard Normal', factor: 3, desc: 'Normal access rate (< 2 req/min)', color: 'border-slate-700 bg-navy-900' },
          { rule: 'Rule 2', title: 'Standard Dormant', factor: 2, desc: 'Cold data (> 120s inactive) pruned to min', color: 'border-blue-500/30 bg-blue-950/20' },
          { rule: 'Rule 3', title: 'Standard Hot', factor: 4, desc: 'High traffic (>= 2 req/min) boosted +1', color: 'border-cyan-500/30 bg-cyan-950/20' },
          { rule: 'Rule 4', title: 'Critical Base', factor: 4, desc: 'Mission-critical cross-rack default', color: 'border-amber-500/30 bg-amber-950/20' },
          { rule: 'Rule 5', title: 'Critical Hot', factor: 5, desc: 'Hot critical data scaled to maximum 5', color: 'border-rose-500/30 bg-rose-950/20' },
        ].map((r) => (
          <div key={r.rule} className={clsx('p-4 rounded-xl border text-xs space-y-1.5 shadow-md', r.color)}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{r.rule}</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-white bg-navy-950 border border-slate-700">
                {r.factor} Replicas
              </span>
            </div>
            <h4 className="font-semibold text-slate-200">{r.title}</h4>
            <p className="text-[11px] text-slate-400 leading-tight">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* INTERACTIVE RULE SIMULATOR */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-cyan" />
              Interactive Adaptive Policy Calculator
            </h3>
            <p className="text-xs text-slate-400">
              Adjust file parameters below to test how the engine dynamically calculates the target replication factor.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Importance Control */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">1. File Importance Tag</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setImportance('Standard')}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  importance === 'Standard'
                    ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                    : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-white'
                )}
              >
                Standard File
              </button>
              <button
                onClick={() => setImportance('Critical')}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  importance === 'Critical'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-white'
                )}
              >
                Critical File
              </button>
            </div>
          </div>

          {/* Access Frequency Slider */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>2. Access Rate</span>
              <span className="font-mono text-brand-cyan">{accessRate.toFixed(1)} req/min</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={accessRate}
              onChange={(e) => setAccessRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Idle)</span>
              <span>2.0 (High Threshold)</span>
              <span>5.0 (Max Hot)</span>
            </div>
          </div>

          {/* Dormancy Seconds Slider */}
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>3. Time Since Last Access</span>
              <span className="font-mono text-brand-cyan">{dormantSeconds}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={dormantSeconds}
              onChange={(e) => setDormantSeconds(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0s (Active)</span>
              <span>120s (Dormant Threshold)</span>
              <span>300s</span>
            </div>
          </div>
        </div>

        {/* Engine Output Display */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-brand-cyan/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-cyan font-bold uppercase tracking-wider">{activeRuleName}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Real-time Calculation</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">{activeReason}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Target Factor</span>
              <span className="text-3xl font-bold font-mono text-brand-cyan">{calculatedFactor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 13: DUAL WRITE PIPELINE COMPARISON */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-brand-cyan" />
              Write Pipeline Protocols (Parallel Push vs Daisy-Chain)
            </h3>
            <p className="text-xs text-slate-400">
              Benchmark real client replication write paths to compare concurrent broadcast vs sequential pipelining.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pipelineMode}
              onChange={(e) => setPipelineMode(e.target.value as any)}
              className="text-xs bg-navy-950 border border-navy-700 text-slate-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-brand-cyan"
            >
              <option value="PARALLEL_PUSH">Parallel Push Mode</option>
              <option value="DAISY_CHAIN">Daisy-Chain Pipeline</option>
            </select>
            <button
              onClick={handleTestWritePipeline}
              disabled={isTestingPipeline}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-cyan text-navy-950 hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {isTestingPipeline ? 'Streaming Bytes...' : 'Execute Test Write'}
            </button>
          </div>
        </div>

        {/* Visual Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Parallel Push Card */}
          <div className={clsx(
            'p-4 rounded-xl border space-y-3',
            pipelineMode === 'PARALLEL_PUSH' ? 'bg-cyan-950/20 border-cyan-500/40 ring-1 ring-cyan-500/30' : 'bg-navy-950 border-navy-800 opacity-70'
          )}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-cyan" />
                Mode A: Parallel Push (Concurrent)
              </h4>
              <span className="text-[10px] text-brand-cyan font-mono">Lowest Write Latency</span>
            </div>
            <p className="text-xs text-slate-400">
              Client sends data chunks simultaneously to all eligible replicas via independent worker threads.
            </p>
            <div className="bg-navy-900 p-3 rounded-lg border border-navy-800 text-[11px] font-mono text-slate-300 flex items-center justify-around">
              <span className="text-brand-cyan">Client</span>
              <span>⇉ [Node 1, Node 4, Node 5]</span>
              <span className="text-emerald-400">Concurrent ACKs</span>
            </div>
          </div>

          {/* Daisy-Chain Card */}
          <div className={clsx(
            'p-4 rounded-xl border space-y-3',
            pipelineMode === 'DAISY_CHAIN' ? 'bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/30' : 'bg-navy-950 border-navy-800 opacity-70'
          )}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Workflow className="w-4 h-4 text-blue-400" />
                Mode B: Daisy-Chain Pipeline
              </h4>
              <span className="text-[10px] text-blue-400 font-mono">Conserves Client Bandwidth</span>
            </div>
            <p className="text-xs text-slate-400">
              Primary receives full bytes from client, writes locally, and sequentially forwards downstream.
            </p>
            <div className="bg-navy-900 p-3 rounded-lg border border-navy-800 text-[11px] font-mono text-slate-300 flex items-center justify-around">
              <span className="text-blue-400">Client</span>
              <span>→ Primary</span>
              <span>→ Secondary 1</span>
              <span>→ Secondary 2</span>
            </div>
          </div>
        </div>

        {/* Real Test Result Output */}
        {pipelineResult && (
          <div className="p-4 rounded-xl bg-navy-950 border border-brand-cyan/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white font-mono">
                Benchmark Result: {pipelineResult.mode}
              </span>
              <span className="text-brand-cyan font-mono font-bold">
                Total Duration: {pipelineResult.duration_ms} ms
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-navy-900 border border-navy-800 text-slate-300">
                <span className="text-[9px] text-slate-500 block">TOTAL BYTES</span>
                {pipelineResult.total_bytes} bytes
              </div>
              <div className="p-2 rounded bg-navy-900 border border-navy-800 text-slate-300">
                <span className="text-[9px] text-slate-500 block">SUCCESS ACKS</span>
                <span className="text-emerald-400">{pipelineResult.success_count}</span>
              </div>
              <div className="p-2 rounded bg-navy-900 border border-navy-800 text-slate-300">
                <span className="text-[9px] text-slate-500 block">FAILED</span>
                <span className="text-slate-200">{pipelineResult.failed_count}</span>
              </div>
              <div className="p-2 rounded bg-navy-900 border border-navy-800 text-slate-300">
                <span className="text-[9px] text-slate-500 block">CONSISTENCY</span>
                <span className="text-brand-cyan">{pipelineResult.consistency_status}</span>
              </div>
            </div>

            {/* Timeline Steps */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Execution Sequence Steps</span>
              {pipelineResult.timeline_steps?.map((st: any) => (
                <div key={st.step} className="text-[11px] text-slate-300 font-mono flex items-center gap-2">
                  <span className="text-brand-cyan font-bold">[{st.step}]</span>
                  <span>{st.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

