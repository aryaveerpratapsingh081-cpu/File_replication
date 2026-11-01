import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'default';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'cyan',
  onClick
}) => {
  const variantStyles = {
    cyan: 'from-cyan-500/10 via-slate-900 to-slate-900 border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/40',
    blue: 'from-blue-500/10 via-slate-900 to-slate-900 border-blue-500/20 text-blue-400 group-hover:border-blue-500/40',
    emerald: 'from-emerald-500/10 via-slate-900 to-slate-900 border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/40',
    amber: 'from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/20 text-amber-400 group-hover:border-amber-500/40',
    rose: 'from-rose-500/10 via-slate-900 to-slate-900 border-rose-500/20 text-rose-400 group-hover:border-rose-500/40',
    default: 'from-slate-800/40 via-slate-900 to-slate-900 border-slate-800 text-slate-300 group-hover:border-slate-700'
  }[variant];

  const iconBgStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    default: 'bg-slate-800 text-slate-400 border border-slate-700'
  }[variant];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative bg-gradient-to-b rounded-xl border p-4 sm:p-5 transition-all duration-200 shadow-lg shadow-black/20',
        variantStyles,
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-medium text-slate-400">{title}</p>
        <div className={clsx('p-2 sm:p-2.5 rounded-lg transition-transform group-hover:scale-105', iconBgStyles)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">{value}</h3>
        {trend && (
          <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-400 truncate">{subtitle}</p>
      )}
    </div>
  );
};

