import React, { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Sun,
  Moon,
  RefreshCw,
  HardDriveDownload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio
} from 'lucide-react';
import { ClusterOverviewData } from '../../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../../services/api';

interface HeaderProps {
  overview: ClusterOverviewData | null;
  isConnected: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  overview,
  isConnected,
  onRefresh
}) => {
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  const toggleMonitoring = async () => {
    try {
      setIsToggling(true);
      const res = await api.toggleMonitoring();
      setIsMonitoringActive(res.monitoring_active);
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const clusterStatus = overview?.cluster_health || 'Healthy';

  return (
    <header className="sticky top-0 z-30 bg-navy-900/90 backdrop-blur-md border-b border-navy-800 px-4 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Project title & Cluster Health */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg shadow-md shadow-cyan-500/20 text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                SelfHeal <span className="text-brand-cyan">Storage</span>
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30">
                v2.0 PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Fault-Tolerant Distributed Storage • Adaptive Replication & Predictive Self-Healing
            </p>
          </div>
        </div>

        {/* Right: Controls, Health Status & Real-time Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Cluster Status Badge */}
          <div className="flex items-center gap-2 bg-navy-850 px-3 py-1.5 rounded-lg border border-navy-700/60 shadow-sm" title={overview?.cluster_health_reason}>
            <span className="text-xs text-slate-400 font-medium">Cluster:</span>
            <StatusBadge status={clusterStatus} size="sm" />
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 bg-navy-850 px-2.5 py-1.5 rounded-lg border border-navy-700/60 text-xs">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="text-slate-300 font-mono hidden md:inline">
              {isConnected ? 'LIVE WS' : 'POLLING'}
            </span>
          </div>

          {/* Start/Stop Monitoring Toggle */}
          <button
            onClick={toggleMonitoring}
            disabled={isToggling}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm ${
              isMonitoringActive
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-900/50'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/50'
            }`}
            title="Toggle autonomous background health monitoring heartbeat"
          >
            {isMonitoringActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pause Monitor</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Start Monitor</span>
              </>
            )}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            className="p-1.5 bg-navy-850 text-slate-300 hover:text-white rounded-lg border border-navy-700/60 hover:border-slate-600 transition-colors"
            title="Refresh cluster data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 bg-navy-850 text-slate-300 hover:text-white rounded-lg border border-navy-700/60 hover:border-slate-600 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};

