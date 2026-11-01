import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Layers
} from 'lucide-react';
import { RecoveryJob } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import clsx from 'clsx';

interface RecoveryCenterPageProps {
  onRefresh: () => void;
}

export const RecoveryCenterPage: React.FC<RecoveryCenterPageProps> = ({ onRefresh }) => {
  const [jobs, setJobs] = useState<RecoveryJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getRecoveryJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleScanCluster = async () => {
    setActionMessage(null);
    try {
      const res = await api.triggerRecoveryScan();
      setActionMessage(`Cluster scan completed. Scheduled ${res.scheduled_jobs_count} priority recovery job(s).`);
      loadJobs();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunRecoveryNow = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await api.runRecoveryNow();
      setActionMessage(`Self-healing completed: Successfully recovered ${res.processed_count} replica(s) across rack failure domains.`);
      loadJobs();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryRecoveryJob(jobId);
      loadJobs();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const queuedJobs = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'IN_PROGRESS');
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'FAILED');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <LifeBuoy className="w-5 h-5 text-brand-cyan" />
            Autonomous Recovery Center & Priority Queue
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Prioritizes self-healing jobs using risk urgency: missing replica count (1000 pts) + criticality tag (20 pts) + bounded queue waiting bonus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanCluster}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Cluster Health
          </button>
          <button
            onClick={handleRunRecoveryNow}
            disabled={isProcessing || queuedJobs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 shadow-md shadow-cyan-950 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Self-Healing...' : 'Process Recovery Queue'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* URGENCY MATHEMATICAL FORMULA CARD */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-cyan" />
          Recovery Urgency Metric Formulation:
        </h3>
        <div className="p-3 rounded-xl bg-navy-950 border border-navy-800 font-mono text-xs text-center text-brand-cyan">
          Urgency = [1000 × Missing_Replicas] + [10 × Criticality_Weight] + min(Wait_Time_Sec × 0.5, 50.0)
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Files with higher missing replica counts (closer to complete loss) receive top urgency. Critical files supersede Standard files when missing count is tied. Bounded waiting bonus guarantees aging jobs are not starved.
        </p>
      </div>

      {/* ACTIVE PRIORITY QUEUE TABLE */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl space-y-0">
        <div className="px-5 py-4 bg-navy-850/90 border-b border-navy-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Active Recovery Queue ({queuedJobs.length} Jobs Pending)
            </h3>
            <p className="text-xs text-slate-400">Ordered by descending urgency score</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
              <tr>
                <th className="px-4 py-3">Queue Rank & File</th>
                <th className="px-4 py-3">Missing Copies</th>
                <th className="px-4 py-3">Importance</th>
                <th className="px-4 py-3">Urgency Score</th>
                <th className="px-4 py-3">Rank Explanation</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {queuedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 font-sans">
                    Recovery queue is currently empty. All stored files satisfy target replication factors!
                  </td>
                </tr>
              ) : (
                queuedJobs.map((job, idx) => (
                  <tr key={job.job_id} className="hover:bg-navy-850/50 transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan font-mono font-bold text-xs border border-brand-cyan/30">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-white font-bold block">{job.filename}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Job: {job.job_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-500/40">
                        {job.missing_replicas} Missing ({job.surviving_replicas}/{job.target_replicas} Alive)
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        job.file_importance === 'Critical' ? 'bg-amber-950 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                      )}>
                        {job.file_importance}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-base text-brand-cyan">
                      {job.urgency_score.toFixed(1)}
                    </td>

                    <td className="px-4 py-3 text-slate-300 font-sans text-xs max-w-sm">
                      {job.priority_rank_reason}
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

      {/* COMPLETED RECOVERY AUDIT HISTORY */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl space-y-0">
        <div className="px-5 py-4 bg-navy-850/90 border-b border-navy-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Completed Self-Healing History ({completedJobs.length} Records)
          </h3>
          <p className="text-xs text-slate-400">Verifies destination node allocation, rack diversity, and SHA-256 confirmation</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
              <tr>
                <th className="px-4 py-3">File Recovered</th>
                <th className="px-4 py-3">Source Node</th>
                <th className="px-4 py-3">Destination Node</th>
                <th className="px-4 py-3">Completed At</th>
                <th className="px-4 py-3">Integrity Verified</th>
                <th className="px-4 py-3 text-right">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {completedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No recovery jobs completed yet.
                  </td>
                </tr>
              ) : (
                completedJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-navy-850/50 transition-colors">
                    <td className="px-4 py-3 font-sans text-white font-medium">
                      {job.filename}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {job.source_node || 'Primary'}
                    </td>
                    <td className="px-4 py-3 text-brand-cyan font-bold">
                      {job.destination_node || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-emerald-400">
                      {job.status === 'COMPLETED' ? '✓ SHA-256 Validated' : '✗ Failed'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetry(job.job_id)}
                          className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/40 text-xs font-sans"
                        >
                          Retry Job
                        </button>
                      ) : (
                        <StatusBadge status={job.status} size="sm" showPulse={false} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

