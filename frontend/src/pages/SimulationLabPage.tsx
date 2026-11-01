import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Server,
  Activity,
  ArrowRight,
  Database,
  ShieldCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { SimulationStatus, SimulationStep } from '../types';
import { api } from '../services/api';
import clsx from 'clsx';

interface SimulationLabPageProps {
  onRefresh: () => void;
}

const scenarios = [
  {
    id: 'SCENARIO_A',
    title: 'Scenario A: Normal Baseline Operation',
    tag: 'Baseline',
    desc: 'Restores all 6 nodes across Rack-A & Rack-B to healthy 15-20ms latencies with balanced replica distribution and full quorum.',
    icon: CheckCircle2,
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
  },
  {
    id: 'SCENARIO_B',
    title: 'Scenario B: Slow Node & Predictive Relocation',
    tag: 'Predictive',
    desc: 'Simulates progressive network congestion on Node 2. OLS regression slope climbs positive; node transitions to AT-RISK; proactive self-healing relocates replicas.',
    icon: TrendingUp,
    color: 'border-amber-500/40 text-amber-400 bg-amber-950/20'
  },
  {
    id: 'SCENARIO_C',
    title: 'Scenario C: Single Node Failure & Self-Healing',
    tag: 'Fail-Stop',
    desc: 'Stops Node 1 immediately. Missing heartbeats trigger fail-stop; priority queue schedules recovery; replicas are recreated on healthy nodes using rack diversity.',
    icon: Server,
    color: 'border-rose-500/40 text-rose-400 bg-rose-950/20'
  },
  {
    id: 'SCENARIO_D',
    title: 'Scenario D: Catastrophic Two-Node Rack Failure',
    tag: 'Multi-Failure',
    desc: 'Simultaneously fails Node 1 and Node 2 in Rack-A. Demonstrates priority urgency queue: files with 2 missing copies jump ahead of 1 missing copy; Critical beats Standard.',
    icon: AlertTriangle,
    color: 'border-purple-500/40 text-purple-400 bg-purple-950/20'
  },
  {
    id: 'SCENARIO_E',
    title: 'Scenario E: Silent Bit-Rot & SHA-256 Repair',
    tag: 'Integrity',
    desc: 'Modifies stored replica bytes on disk. System detects checksum mismatch, safely serves fallback bytes from healthy replica, and self-heals corrupted copy.',
    icon: ShieldCheck,
    color: 'border-cyan-500/40 text-brand-cyan bg-cyan-950/20'
  },
  {
    id: 'SCENARIO_F',
    title: 'Scenario F: Rack Storage Pressure & Placement Shift',
    tag: 'Load-Aware',
    desc: 'Elevates CPU & IO load on Rack-A above 90%. Load- & Diversity-Aware Placement dynamically steers new replicas to low-load Rack-B nodes.',
    icon: Cpu,
    color: 'border-blue-500/40 text-blue-400 bg-blue-950/20'
  }
];

export const SimulationLabPage: React.FC<SimulationLabPageProps> = ({ onRefresh }) => {
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getSimulationStatus();
      setSimStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRunScenario = async (scenarioId: string) => {
    setRunningScenario(scenarioId);
    try {
      await api.startScenario(scenarioId);
      setTimeout(() => {
        fetchStatus();
        onRefresh();
        setRunningScenario(null);
      }, 2500);
    } catch (e) {
      console.error(e);
      setRunningScenario(null);
    }
  };

  const handleResetLab = async () => {
    try {
      await api.resetSimulation();
      fetchStatus();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      await api.seedDemoData();
      fetchStatus();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-brand-cyan" />
            Failure Simulation Lab & Faculty Demonstration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Conduct reproducible failure experiments covering network jitter, server outages, multi-node rack loss, and silent bit corruption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemoData}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 transition-colors"
          >
            <Database className="w-3.5 h-3.5 inline mr-1" />
            Seed Demo Data
          </button>
          <button
            onClick={handleResetLab}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Reset Lab
          </button>
        </div>
      </div>

      {/* 6 SCENARIOS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isCurrentRunning = runningScenario === sc.id || (simStatus?.active_scenario === sc.id && simStatus?.is_running);
          return (
            <div
              key={sc.id}
              className={clsx(
                'p-5 rounded-2xl border flex flex-col justify-between shadow-xl transition-all duration-200 bg-navy-900',
                isCurrentRunning ? 'border-brand-cyan ring-1 ring-brand-cyan' : 'border-navy-800 hover:border-slate-700'
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className={clsx('p-2 rounded-xl border', sc.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-slate-300 border border-navy-800 font-semibold">
                    {sc.tag}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{sc.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{sc.desc}</p>
              </div>

              <div className="pt-4 mt-2 border-t border-navy-800">
                <button
                  disabled={isCurrentRunning}
                  onClick={() => handleRunScenario(sc.id)}
                  className={clsx(
                    'w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md',
                    isCurrentRunning
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 animate-pulse'
                      : 'bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 shadow-cyan-950/40'
                  )}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isCurrentRunning ? 'Executing Scenario...' : 'Launch Scenario'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REAL-TIME EVENT TIMELINE */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-cyan" />
              Live Simulation Event Timeline & Rationale Feed
            </h3>
            <p className="text-xs text-slate-400">
              Trace every state transition, algorithm calculation, and self-healing action in plain English
            </p>
          </div>
          {simStatus?.is_running && (
            <span className="px-2.5 py-1 rounded bg-brand-cyan/10 text-brand-cyan font-mono text-xs font-bold border border-brand-cyan/30 animate-pulse">
              Scenario Active
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {(!simStatus?.timeline || simStatus.timeline.length === 0) ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No simulation steps executed yet. Click <strong>Launch Scenario</strong> above to begin a controlled experiment.
            </div>
          ) : (
            simStatus.timeline.map((step) => {
              const isCrit = step.severity === 'CRITICAL';
              const isWarn = step.severity === 'WARNING';
              const isSucc = step.severity === 'SUCCESS';
              return (
                <div
                  key={step.step_id}
                  className={clsx(
                    'p-3 rounded-xl border text-xs font-sans flex items-start gap-3',
                    isCrit && 'bg-rose-950/20 border-rose-500/40 text-rose-200',
                    isWarn && 'bg-amber-950/20 border-amber-500/40 text-amber-200',
                    isSucc && 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200',
                    !isCrit && !isWarn && !isSucc && 'bg-navy-950 border-navy-800 text-slate-300'
                  )}
                >
                  <div className="mt-0.5">
                    {isCrit && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    {isWarn && <TrendingUp className="w-4 h-4 text-amber-400" />}
                    {isSucc && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {!isCrit && !isWarn && !isSucc && <Activity className="w-4 h-4 text-brand-cyan" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{step.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

