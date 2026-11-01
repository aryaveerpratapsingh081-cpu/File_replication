import React, { useState } from 'react';
import {
  HeartPulse,
  Activity,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Server,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { NodeData } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import clsx from 'clsx';

interface HealthMonitoringPageProps {
  nodes: NodeData[];
  onRefresh: () => void;
}

export const HealthMonitoringPage: React.FC<HealthMonitoringPageProps> = ({ nodes, onRefresh }) => {
  const [betaWeight, setBetaWeight] = useState<number>(0.6); // 60% slope, 40% missed heartbeats
  const [warningThreshold, setWarningThreshold] = useState<number>(0.35);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(0.70);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-brand-cyan" />
            Predictive Health Monitoring & Regression Slope Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detects deteriorating storage nodes prior to fail-stop crashes using Ordinary Least Squares (OLS) linear regression and missed heartbeat trends.
          </p>
        </div>
      </div>

      {/* MATHEMATICAL FORMULA CARD */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-cyan" />
            Mathematical Risk Score Formulation & Normalization
          </h3>
          <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/30">
            OLS Sliding Window N=10
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <span className="text-slate-400 font-semibold block text-[11px]">1. Response-Time Slope (m)</span>
            <p className="text-slate-300 font-sans text-xs">
              Calculated using least-squares linear regression over the recent 10-sample heartbeat window:
            </p>
            <div className="p-2 rounded bg-navy-900 text-brand-cyan text-[11px] font-mono text-center">
              m = [N∑(xy) - ∑x∑y] / [N∑x² - (∑x)²]
            </div>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <span className="text-slate-400 font-semibold block text-[11px]">2. Combined Risk Formula</span>
            <p className="text-slate-300 font-sans text-xs">
              Weighted fusion of normalized response-time slope and missed heartbeats:
            </p>
            <div className="p-2 rounded bg-navy-900 text-amber-300 text-[11px] font-mono text-center">
              Risk = β·(m / m_ref) + (1-β)·(H / H_max)
            </div>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
            <span className="text-slate-400 font-semibold block text-[11px]">3. State Transition Thresholds</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-emerald-400">
                <span>NORMAL:</span>
                <span>Risk &lt; {warningThreshold.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>AT-RISK:</span>
                <span>{warningThreshold.toFixed(2)} ≤ Risk &lt; {criticalThreshold.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>FAIL-STOP:</span>
                <span>Risk ≥ {criticalThreshold.toFixed(2)} or H ≥ 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Beta Slider Preview */}
        <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-300 block">Configurable Beta Weight (β)</span>
            <p className="text-xs text-slate-400">
              Balances sensitivity: higher β emphasizes latency slope degradation; lower β emphasizes missed heartbeats.
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-72">
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={betaWeight}
              onChange={(e) => setBetaWeight(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="font-mono text-sm font-bold text-brand-cyan shrink-0">
              β = {betaWeight.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* PER-NODE HEALTH CARDS */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white tracking-wide">
          Real-time Node Health Signals & OLS Regression Trends
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const isFailed = node.status === 'FAIL-STOP';
            const isAtRisk = node.status === 'AT-RISK';

            const chartData = (node.recent_response_times || []).map((ms, i) => ({
              idx: `P${i + 1}`,
              latency: ms
            }));

            return (
              <div
                key={node.node_id}
                className={clsx(
                  'p-5 rounded-2xl border bg-navy-900 shadow-xl space-y-3.5',
                  isFailed && 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-navy-900',
                  isAtRisk && 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-navy-900',
                  !isFailed && !isAtRisk && 'border-navy-800'
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-navy-800">
                  <div className="flex items-center gap-2">
                    <Server className={clsx(
                      'w-4 h-4',
                      isFailed ? 'text-rose-400' : isAtRisk ? 'text-amber-400' : 'text-brand-cyan'
                    )} />
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{node.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{node.rack_id}</span>
                    </div>
                  </div>
                  <StatusBadge status={node.status} size="sm" />
                </div>

                {/* Signals Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">CURRENT RTT</span>
                    <span className="text-slate-200 font-bold">{node.current_response_time_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">SLOPE (m)</span>
                    <span className={clsx('font-bold', node.response_time_slope > 2 ? 'text-amber-400' : 'text-slate-200')}>
                      {node.response_time_slope > 0 ? `+${node.response_time_slope.toFixed(2)}` : node.response_time_slope.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-navy-950 p-2 rounded-lg border border-navy-800">
                    <span className="text-[9px] text-slate-500 block">RISK SCORE</span>
                    <span className={clsx(
                      'font-bold',
                      node.risk_score >= 0.7 ? 'text-rose-400' : node.risk_score >= 0.35 ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {node.risk_score.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sliding Window Chart */}
                <div className="bg-navy-950 p-2 rounded-xl border border-navy-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 mb-1">
                    <span>10-Sample Sliding Window</span>
                    <span className="font-mono">Interval: 3s</span>
                  </div>
                  <div className="h-20 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <YAxis hide domain={['dataMin - 5', 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="latency"
                          stroke={isFailed ? '#ef4444' : isAtRisk ? '#f59e0b' : '#06b6d4'}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rationale Text */}
                <p className="text-[11px] text-slate-400 leading-relaxed bg-navy-950/60 p-2 rounded border border-navy-800/60">
                  {node.risk_explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

