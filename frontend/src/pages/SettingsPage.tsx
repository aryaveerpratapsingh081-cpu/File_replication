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
  Cpu,
  Activity,
  ScrollText,
  Search,
  Filter,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { SystemEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import clsx from 'clsx';

interface SettingsPageProps {
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'config'>('status');

  // Status & Health
  const [projectStatus, setProjectStatus] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(true);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // System Logs
  const [logs, setLogs] = useState<SystemEvent[]>([]);
  const [logSearch, setLogSearch] = useState<string>('');
  const [logSeverity, setLogSeverity] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  useEffect(() => {
    api.getProjectStatus().then(setProjectStatus).catch(console.error);
    api.getHealth().then((h) => {
      setDbHealth(h);
      if (h.monitoring_active !== undefined) setIsMonitoringActive(h.monitoring_active);
    }).catch(console.error);
  }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getLogs({
        severity: logSeverity || undefined,
        limit: 100
      });
      setLogs(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, logSeverity]);

  const handleToggleMonitoring = async () => {
    try {
      const res = await api.toggleMonitoring();
      setIsMonitoringActive(res.monitoring_active);
      setActionAlert(`Heartbeat monitoring ${res.monitoring_active ? 'resumed' : 'paused'}.`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResetCluster = async () => {
    if (!window.confirm("Reset all 6 nodes and restore health baseline?")) return;
    try {
      await api.resetCluster();
      setActionAlert("Cluster nodes restored to healthy baseline.");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSeedDemo = async () => {
    try {
      await api.seedDemoData();
      setActionAlert("Seeded demonstration dataset (4 files with Standard & Critical tags).");
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredLogs = logs.filter((l) =>
    l.description.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.event_type.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-brand-cyan" />
            Settings & Implementation Status
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            System configuration, background health monitor controls, audit event logs, and TRL readiness evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 transition-colors"
          >
            Seed Demo Files
          </button>
          <button
            onClick={handleResetCluster}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Reset Cluster
          </button>
        </div>
      </div>

      {actionAlert && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between">
          <span>{actionAlert}</span>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TABS HEADER */}
      <div className="flex items-center gap-1.5 border-b border-navy-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('status')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'status'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          Project Status & TRL
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'logs'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          System Logs & Audit
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={clsx(
            'px-3.5 py-2 rounded-xl font-bold transition-all',
            activeTab === 'config'
              ? 'bg-brand-cyan text-navy-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-navy-850'
          )}
        >
          System Configuration
        </button>
      </div>

      {/* TAB 1: PROJECT STATUS & TRL */}
      {activeTab === 'status' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* TRL Evaluation Banner */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-cyan" />
                  Technology Readiness Level (TRL) Evaluation
                </h3>
                <p className="text-xs text-slate-400">Standard aerospace and academic development milestone</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-950 text-brand-cyan border border-brand-cyan/40 text-xs font-mono font-bold">
                TRL 4 Prototype
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">Baseline Report</span>
                <h4 className="font-bold text-slate-200 text-sm">TRL 2: Concept Formulated</h4>
                <p className="text-slate-400 leading-relaxed text-xs">
                  Theoretical algorithms and architecture proposed on paper without integrated empirical execution.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-blue-900/10 border border-brand-cyan/30 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-brand-cyan font-bold block">Current Implementation</span>
                <h4 className="font-bold text-white text-sm">TRL 4: Component / System Laboratory Validation</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Implemented working prototype with real multi-node storage, OLS regression slope calculation, priority queue recovery, and SHA-256 self-healing.
                </p>
              </div>
            </div>
          </div>

          {/* Features Audit Table */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-navy-850/80 border-b border-navy-800">
              <h3 className="text-sm font-bold text-white">System Feature Audit Matrix</h3>
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
                  {(projectStatus?.features || []).map((feat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-navy-850/40">
                      <td className="px-4 py-3 text-white font-sans font-medium">{feat.name}</td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-bold border',
                          feat.status === 'Implemented' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' : 'bg-blue-950 text-blue-300 border-blue-500/40'
                        )}>
                          {feat.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-sans text-xs">{feat.nature}</td>
                      <td className="px-4 py-3 text-slate-400 font-sans text-xs">{feat.validation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM LOGS & AUDIT */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search event logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
              <select
                value={logSeverity}
                onChange={(e) => setLogSeverity(e.target.value)}
                className="bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none"
              >
                <option value="">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="SUCCESS">SUCCESS</option>
              </select>

              <button
                onClick={fetchLogs}
                className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-300 border border-navy-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60 font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                        No matching audit logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.event_id} className="hover:bg-navy-850/40">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={log.severity} size="sm" showPulse={false} />
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-bold">{log.event_type}</td>
                        <td className="px-4 py-3 text-slate-300 font-sans text-xs">{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
          {/* Monitoring Controls */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-cyan" />
              Autonomous Health Monitor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pings storage servers every 3 seconds, tracks linear regression slope over a 10-sample sliding window, and triggers automated self-healing.
            </p>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Heartbeat Evaluation Loop</span>
                <span className="text-[11px] text-slate-400">
                  Status: {isMonitoringActive ? 'Running (Active)' : 'Paused (Standby)'}
                </span>
              </div>
              <button
                onClick={handleToggleMonitoring}
                className={clsx(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors',
                  isMonitoringActive
                    ? 'bg-amber-950/60 text-amber-300 border-amber-600/40 hover:bg-amber-900'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900'
                )}
              >
                {isMonitoringActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isMonitoringActive ? 'Pause Loop' : 'Resume Loop'}</span>
              </button>
            </div>
          </div>

          {/* Database Persistence */}
          <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-cyan" />
              Persistence Engine & File Storage
            </h3>
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Engine:</span>
                <span className="text-white font-bold">{dbHealth?.database?.engine || 'Checking...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection:</span>
                <span className={dbHealth?.database?.connected ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {dbHealth?.database?.connected ? 'Online (Healthy)' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Replica Path:</span>
                <span className="text-slate-300">storage_data/nodes/</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
