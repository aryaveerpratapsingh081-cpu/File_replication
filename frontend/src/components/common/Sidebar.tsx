import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Server,
  LifeBuoy,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Cluster status & overview' },
  { path: '/files', label: 'My Files', icon: FolderOpen, desc: 'File storage & replicas' },
  { path: '/servers', label: 'Storage Servers', icon: Server, desc: '6 Nodes & rack topology' },
  { path: '/self-healing', label: 'Self-Healing', icon: LifeBuoy, desc: 'Recovery & fault simulations' },
  { path: '/experiments', label: 'Experiments', icon: BarChart3, desc: 'Comparative benchmarks' },
  { path: '/settings', label: 'Settings', icon: Settings, desc: 'Logs, health & TRL status' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse }) => {
  return (
    <aside className={clsx(
      'bg-navy-900 border-r border-navy-800 flex flex-col shrink-0 min-h-screen transition-all duration-300 relative',
      isCollapsed ? 'w-20' : 'w-64'
    )}>
      {/* Brand Header */}
      <div className={clsx(
        'p-4 border-b border-navy-800/80 flex items-center justify-between',
        isCollapsed && 'justify-center'
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-brand-cyan to-blue-600 rounded-xl shadow-md shadow-cyan-500/20 text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono truncate">
                SelfHeal <span className="text-brand-cyan">DFS</span>
              </h2>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block truncate">
                Distributed Storage
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {!isCollapsed && (
          <p className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Main Navigation
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-brand-cyan/20 to-blue-600/10 text-brand-cyan border border-brand-cyan/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-navy-850',
                  isCollapsed && 'justify-center px-2'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0 transition-colors group-hover:text-brand-cyan" />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.label}</span>
                  <span className="block text-[10px] text-slate-500 font-normal truncate">
                    {item.desc}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse/Expand Toggle Button */}
      {onToggleCollapse && (
        <div className="p-3 border-t border-navy-800 flex justify-center bg-navy-950/40">
          <button
            onClick={onToggleCollapse}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-navy-700/60 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};
