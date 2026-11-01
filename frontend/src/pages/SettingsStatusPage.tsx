import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Server,
  Layers,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import clsx from 'clsx';

interface SettingsStatusPageProps {
  onRefresh: () => void;
}

export const SettingsStatusPage: React.FC<SettingsStatusPageProps> = ({ onRefresh }) => {
  const [projectStatus, setProjectStatus] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getProjectStatus().then(setProjectStatus).catch(console.error);
    api.getHealth().then(setDbHealth).catch(console.error);
  }, []);

  const handleResetCluster = async () => {
    if (!window.confirm("Reset all 6 nodes and restore health baseline?")) return;
    try {
      await api.resetCluster();
      setActionMessage("Cluster nodes reset to normal baseline.");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.seedDemoData();
      setActionMessage("Seeded 4 demonstration files with mixed Standard & Critical importance.");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-brand-cyan" />
            Project Settings & Implementation Status (TRL Reporting)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Honest reporting on implemented algorithms, simulated infrastructure, Technology Readiness Level (TRL), and cluster configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 transition-colors"
          >
            Seed Demo Data
          </button>
          <button
            onClick={handleResetCluster}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Reset Cluster
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TRL READINESS STATUS CARD */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-cyan" />
              Technology Readiness Level (TRL) Milestone Evaluation
            </h3>
            <p className="text-xs text-slate-400">
              Evaluation according to academic & defense research standards
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-950 text-brand-cyan border border-brand-cyan/40 text-xs font-mono font-bold">
            TRL 4 Prototype
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
            <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">Baseline Project Report</span>
            <h4 className="font-bold text-slate-200 text-sm">TRL 2: Concept Formulated</h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Original report documented proposed self-healing, adaptive replication, and regression health monitoring as unvalidated theoretical formulations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-blue-900/10 border border-brand-cyan/30 space-y-1.5">
            <span className="text-[10px] uppercase font-mono text-brand-cyan font-bold block">Current Working Prototype</span>
            <h4 className="font-bold text-white text-sm">TRL 4: Laboratory Prototype Validated</h4>
            <p className="text-slate-300 leading-relaxed text-xs">
              Implemented all 5 core distributed algorithms with real mathematical models, automated unit tests, real filesystem bytes replication, and empirical benchmarks.
            </p>
          </div>
        </div>
      </div>

      {/* FEATURE AUDIT TABLE */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-navy-850/80 border-b border-navy-800">
          <h3 className="text-sm font-bold text-white">System Feature Audit & Verification Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
              <tr>
                <th className="px-4 py-3">Feature Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Implementation Nature</th>
                <th className="px-4 py-3">Validation Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {(projectStatus?.features || []).map((feat: any, idx: number) => {
                const isImpl = feat.status === 'Implemented';
                const isSim = feat.status === 'Simulated';
                return (
                  <tr key={idx} className="hover:bg-navy-850/40 transition-colors">
                    <td className="px-4 py-3 text-white font-sans font-medium">
                      {feat.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        isImpl && 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
                        isSim && 'bg-blue-950 text-blue-300 border-blue-500/40'
                      )}>
                        {feat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-sans text-xs">
                      {feat.nature}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-sans text-xs">
                      {feat.validation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RUNTIME ENVIRONMENT & DATABASE CONFIG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-cyan" />
            Persistence Engine Status
          </h3>
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Engine Type:</span>
              <span className="text-white font-bold">{dbHealth?.database?.engine || 'Checking...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Database Connected:</span>
              <span className={dbHealth?.database?.connected ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                {dbHealth?.database?.connected ? 'YES (Operational)' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Storage Directory:</span>
              <span className="text-slate-300">storage_data/nodes/</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The system provides dual-mode persistence: connecting to MongoDB on port 27017 when running, with an embedded resilient document store fallback if MongoDB is not started.
          </p>
        </div>

        {/* Algorithm Thresholds */}
        <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-cyan" />
            Active Algorithm Thresholds
          </h3>
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Heartbeat Interval:</span>
              <span className="text-slate-200">3.0 seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Beta Weight (β):</span>
              <span className="text-brand-cyan font-bold">0.60 (60% Slope / 40% HBs)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Warning Threshold (θ_warn):</span>
              <span className="text-amber-400 font-bold">0.35</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Critical Threshold (θ_crit):</span>
              <span className="text-rose-400 font-bold">0.70</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

