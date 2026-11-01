import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Server,
  FileText
} from 'lucide-react';
import { SystemEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import clsx from 'clsx';

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs({
        severity: severityFilter || undefined,
        event_type: eventTypeFilter || undefined,
        limit: 100
      });
      setLogs(data.events || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, eventTypeFilter]);

  const filteredLogs = logs.filter((l) =>
    l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.node_id && l.node_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-brand-cyan" />
            System Audit Logs & Event Trace
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Searchable event log capturing replica creations, health transitions, fail-stop incidents, and self-healing actions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-navy-900 p-4 rounded-xl border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search log descriptions or event types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end text-xs">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-brand-cyan"
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="SUCCESS">SUCCESS</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-brand-cyan"
            >
              <option value="">All Types</option>
              <option value="FILE_UPLOADED">File Uploaded</option>
              <option value="NODE_STATUS_TRANSITION">Node Transition</option>
              <option value="NODE_FAILED">Node Failed</option>
              <option value="NODE_RESTORED">Node Restored</option>
              <option value="RECOVERY_COMPLETED">Recovery Completed</option>
              <option value="CHECKSUM_MISMATCH">Checksum Mismatch</option>
              <option value="REPLICA_REPAIRED">Replica Repaired</option>
              <option value="SIMULATION_STEP">Simulation Step</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800 font-mono">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Node / File</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 font-sans">
                    No matching audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.event_id} className="hover:bg-navy-850/40 transition-colors">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.severity} size="sm" showPulse={false} />
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-bold">
                      {log.event_type}
                    </td>
                    <td className="px-4 py-3 text-brand-cyan">
                      {log.node_id ? (
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3 text-slate-400" /> {log.node_id}
                        </span>
                      ) : log.file_id ? (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" /> {log.file_id}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-sans text-xs">
                      {log.description}
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

