import React from 'react';
import { X, CheckCircle2, ArrowRight, Upload, Server, Flame, LifeBuoy, ShieldCheck, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpload: () => void;
  onQuickSimulateFailure: () => void;
  onQuickRunRecovery: () => void;
  clusterStats: {
    totalFiles: number;
    failedNodes: number;
    pendingRecovery: number;
  };
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenUpload,
  onQuickSimulateFailure,
  onQuickRunRecovery,
  clusterStats
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Upload a File',
      desc: 'Store a document into the distributed cluster. The system automatically creates multiple copies (replicas) based on file importance.',
      actionLabel: 'Upload a File',
      actionIcon: Upload,
      isDone: clusterStats.totalFiles > 0,
      onAction: () => {
        onClose();
        onOpenUpload();
      }
    },
    {
      num: 2,
      title: 'Inspect Replicas Across Servers',
      desc: 'View how replicas are automatically distributed across independent rack failure domains (Rack-A and Rack-B) to prevent data loss.',
      actionLabel: 'View My Files',
      actionIcon: ArrowRight,
      isDone: clusterStats.totalFiles > 0,
      onAction: () => {
        onClose();
        navigate('/files');
      }
    },
    {
      num: 3,
      title: 'Simulate a Server Failure',
      desc: 'Simulate an unexpected outage on one of the storage nodes to observe how the cluster detects the missing heartbeats.',
      actionLabel: 'Simulate Node 1 Failure',
      actionIcon: Flame,
      isDone: clusterStats.failedNodes > 0,
      onAction: () => {
        onQuickSimulateFailure();
      }
    },
    {
      num: 4,
      title: 'Observe the Recovery Queue',
      desc: 'See the autonomous Self-Healing system automatically detect under-replicated files and calculate their recovery urgency score.',
      actionLabel: 'Go to Self-Healing',
      actionIcon: LifeBuoy,
      isDone: clusterStats.pendingRecovery > 0 || clusterStats.failedNodes > 0,
      onAction: () => {
        onClose();
        navigate('/self-healing');
      }
    },
    {
      num: 5,
      title: 'Execute Recovery & Restore Redundancy',
      desc: 'Click "Start Recovery" to stream healthy replica copies onto surviving servers using rack diversity, restoring full protection.',
      actionLabel: 'Start Recovery Now',
      actionIcon: ShieldCheck,
      isDone: clusterStats.failedNodes > 0 && clusterStats.pendingRecovery === 0,
      onAction: () => {
        onQuickRunRecovery();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 uppercase tracking-wider">
                Guided Demonstration
              </span>
              <h3 className="text-base font-bold text-white">5-Step Project Evaluation Tour</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Follow these simple steps to demonstrate fault-tolerance and self-healing to faculty.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {steps.map((st) => {
            const Icon = st.actionIcon;
            return (
              <div
                key={st.num}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  st.isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-navy-950/70 border-navy-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    st.isDone
                      ? 'bg-emerald-500 text-navy-950 font-black'
                      : 'bg-navy-800 text-brand-cyan border border-navy-700 font-mono'
                  }`}>
                    {st.isDone ? <CheckCircle2 className="w-5 h-5" /> : st.num}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{st.title}</h4>
                      {st.isDone && (
                        <span className="text-[10px] font-medium text-emerald-400">Step Completed</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                      {st.desc}
                    </p>
                  </div>
                </div>

                <button
                  onClick={st.onAction}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-navy-800 hover:bg-brand-cyan hover:text-navy-950 text-slate-200 border border-navy-700 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{st.actionLabel}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-navy-850 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
          <span>All demonstration steps execute live backend operations.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-cyan text-navy-950 hover:bg-cyan-400 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

