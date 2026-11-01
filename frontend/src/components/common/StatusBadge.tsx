import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true
}) => {
  const norm = status.toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  if (norm === 'NORMAL' || norm === 'HEALTHY' || norm === 'COMPLETED' || norm === 'SUCCESS' || norm === 'ACK') {
    colorClasses = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
    dotColor = 'bg-emerald-400';
  } else if (norm === 'AT-RISK' || norm === 'DEGRADED' || norm === 'WARNING' || norm === 'QUEUED') {
    colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
    dotColor = 'bg-amber-400';
  } else if (norm === 'FAIL-STOP' || norm === 'CRITICAL' || norm === 'FAILED' || norm === 'CORRUPTED') {
    colorClasses = 'bg-rose-950/70 text-rose-300 border-rose-500/40';
    dotColor = 'bg-rose-400';
  } else if (norm === 'IN_PROGRESS' || norm === 'RUNNING') {
    colorClasses = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40';
    dotColor = 'bg-cyan-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-2',
    lg: 'text-sm font-medium px-3 py-1.5 gap-2.5'
  }[size];

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border shadow-sm tracking-wide',
      sizeClasses,
      colorClasses
    )}>
      <span className={clsx('relative flex h-2 w-2')}>
        {showPulse && (
          <span className={clsx(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            dotColor
          )} />
        )}
        <span className={clsx('relative inline-flex rounded-full h-2 w-2', dotColor)} />
      </span>
      <span>{status}</span>
    </span>
  );
};

