import React, { useState } from 'react';
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  FileText,
  Copy,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flame,
  ExternalLink,
  X
} from 'lucide-react';
import { FileData, ReplicaData } from '../types';
import { UploadFileModal } from '../components/common/UploadFileModal';
import { api } from '../services/api';
import clsx from 'clsx';

interface MyFilesPageProps {
  files: FileData[];
  onRefresh: () => void;
}

export const MyFilesPage: React.FC<MyFilesPageProps> = ({ files, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterImportance, setFilterImportance] = useState<string>('ALL');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [replicas, setReplicas] = useState<ReplicaData[]>([]);
  const [loadingReplicas, setLoadingReplicas] = useState<boolean>(false);
  const [showAdvancedFileDetails, setShowAdvancedFileDetails] = useState<boolean>(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleInspectFile = async (f: FileData) => {
    setSelectedFile(f);
    setLoadingReplicas(true);
    setShowAdvancedFileDetails(false);
    try {
      const reps = await api.getFileReplicas(f.file_id);
      setReplicas(reps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReplicas(false);
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${filename}" and all its redundant copies?`)) {
      return;
    }
    try {
      await api.deleteFile(fileId);
      setActionAlert({ type: 'info', message: `Deleted "${filename}" and purged all replicas.` });
      onRefresh();
      if (selectedFile?.file_id === fileId) {
        setSelectedFile(null);
      }
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message || 'Delete failed' });
    }
  };

  const handleToggleImportance = async (fileId: string, currentImp: string) => {
    const nextImp = currentImp === 'Standard' ? 'Critical' : 'Standard';
    try {
      const updated = await api.recalculateReplication(fileId, nextImp);
      setActionAlert({
        type: 'success',
        message: `Updated "${updated.filename}" to ${nextImp} policy (${updated.target_replication_factor} target replicas).`
      });
      onRefresh();
      if (selectedFile?.file_id === fileId) {
        setSelectedFile(updated);
      }
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message });
    }
  };

  const handleSimulateCorruption = async (fileId: string) => {
    try {
      const res = await api.simulateCorruption(fileId);
      setActionAlert({
        type: 'error',
        message: `Simulated bit-rot in replica on ${res.corrupted_node_id}. Integrity mismatch created!`
      });
      onRefresh();
      if (selectedFile) handleInspectFile(selectedFile);
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message });
    }
  };

  const handleVerifySelfHeal = async (fileId: string) => {
    try {
      const res = await api.verifyAndRepairIntegrity(fileId);
      if (res.repaired) {
        setActionAlert({
          type: 'success',
          message: `Self-healing succeeded: Corrupted replica repaired from healthy source. SHA-256 confirmed.`
        });
      } else {
        setActionAlert({
          type: 'info',
          message: `Integrity check complete: All ${res.healthy_replicas.length} surviving copies are 100% intact.`
        });
      }
      onRefresh();
      if (selectedFile) handleInspectFile(selectedFile);
    } catch (e: any) {
      setActionAlert({ type: 'error', message: e.message });
    }
  };

  // Filter files
  const filteredFiles = files.filter((f) => {
    const matchSearch = f.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchImp = filterImportance === 'ALL' || f.importance === filterImportance;
    return matchSearch && matchImp;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-brand-cyan" />
            My Files
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse stored files, check replica health across servers, download documents, and manage protection levels.
          </p>
        </div>

        {/* Action Button: Upload */}
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 shadow-md shadow-cyan-950 transition-all self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New File</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={clsx(
          'p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150',
          actionAlert.type === 'success' && 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
          actionAlert.type === 'error' && 'bg-rose-950/40 border-rose-500/40 text-rose-300',
          actionAlert.type === 'info' && 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
        )}>
          <div className="flex items-center gap-2.5">
            {actionAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {actionAlert.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {actionAlert.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span>{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-navy-900 p-3.5 rounded-xl border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Importance:</span>
          <select
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value)}
            className="bg-navy-950 border border-navy-700 text-slate-300 rounded-lg px-3 py-1 focus:outline-none focus:border-brand-cyan"
          >
            <option value="ALL">All Files</option>
            <option value="Standard">Standard Only</option>
            <option value="Critical">Critical Only</option>
          </select>
        </div>
      </div>

      {/* CLOUD STORAGE FILE TABLE */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-850 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="px-5 py-3.5">Filename</th>
                <th className="px-4 py-3.5">File Size</th>
                <th className="px-4 py-3.5">Importance</th>
                <th className="px-4 py-3.5">Available Copies</th>
                <th className="px-4 py-3.5">Storage Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No files found. Click <strong>Upload New File</strong> to store your first document.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isProtected = file.surviving_replica_count >= file.target_replication_factor;
                  const isSingleCopy = file.surviving_replica_count === 1;

                  return (
                    <tr
                      key={file.file_id}
                      onClick={() => handleInspectFile(file)}
                      className="hover:bg-navy-850/60 cursor-pointer transition-colors"
                    >
                      {/* Filename */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-navy-950 rounded-lg border border-navy-800 text-brand-cyan shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate max-w-xs">{file.filename}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Stored on: {file.replica_locations.join(', ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3.5 text-slate-300 font-mono">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </td>

                      {/* Importance */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleImportance(file.file_id, file.importance)}
                          title="Click to toggle between Standard and Critical"
                          className={clsx(
                            'px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border cursor-pointer hover:scale-105 transition-transform',
                            file.importance === 'Critical'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          )}
                        >
                          {file.importance} ↺
                        </button>
                      </td>

                      {/* Available Copies */}
                      <td className="px-4 py-3.5 font-mono text-slate-200">
                        {file.surviving_replica_count} of {file.target_replication_factor} copies
                      </td>

                      {/* Storage Status */}
                      <td className="px-4 py-3.5">
                        {isProtected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Protected
                          </span>
                        ) : isSingleCopy ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            At Risk (1 Copy)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Needs Recovery
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={api.downloadFileUrl(file.file_id)}
                            download={file.filename}
                            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                            title="Download verified file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleInspectFile(file)}
                            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                            title="View Replica Details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(file.file_id, file.filename)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-600/30 transition-colors"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILE DETAILS DRAWER / MODAL */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-cyan" />
                <h3 className="text-base font-bold text-white truncate max-w-sm">
                  {selectedFile.filename}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Summary Details */}
              <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">File Name:</span>
                  <span className="text-white font-bold">{selectedFile.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Importance Level:</span>
                  <span className="text-amber-400 font-bold">{selectedFile.importance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Required Copies:</span>
                  <span className="text-white">{selectedFile.target_replication_factor} replicas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Copies:</span>
                  <span className={clsx(
                    'font-bold',
                    selectedFile.surviving_replica_count >= selectedFile.target_replication_factor
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  )}>
                    {selectedFile.surviving_replica_count} replicas alive
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Protection Status:</span>
                  <span className={clsx(
                    'font-bold',
                    selectedFile.surviving_replica_count >= selectedFile.target_replication_factor
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  )}>
                    {selectedFile.surviving_replica_count >= selectedFile.target_replication_factor
                      ? 'Protected'
                      : 'Under-Replicated (Needs Healing)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stored on Nodes:</span>
                  <span className="text-brand-cyan font-bold">{selectedFile.replica_locations.join(', ')}</span>
                </div>
              </div>

              {/* Replicas List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Replica Server Allocation
                </h4>
                {loadingReplicas ? (
                  <p className="text-xs text-slate-500">Loading replicas...</p>
                ) : (
                  <div className="space-y-1.5">
                    {replicas.map((rep) => (
                      <div
                        key={rep.replica_id}
                        className={clsx(
                          'p-3 rounded-lg border flex items-center justify-between text-xs font-mono',
                          rep.is_corrupted
                            ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                            : 'bg-navy-950 border-navy-800 text-slate-300'
                        )}
                      >
                        <div>
                          <span className="font-bold text-white">{rep.node_name || rep.node_id}</span>
                          <span className="text-[10px] text-slate-500 block">{rep.rack_id} • {rep.is_primary ? 'Primary Copy' : 'Backup Copy'}</span>
                        </div>
                        <div className="text-right">
                          <span className={rep.is_corrupted ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                            {rep.is_corrupted ? 'CORRUPTED' : 'INTACT'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href={api.downloadFileUrl(selectedFile.file_id)}
                  download={selectedFile.filename}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-brand-cyan text-navy-950 hover:bg-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>

                <button
                  onClick={() => handleVerifySelfHeal(selectedFile.file_id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900 transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify & Self-Heal</span>
                </button>

                <button
                  onClick={() => handleSimulateCorruption(selectedFile.file_id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-600/40 hover:bg-rose-900 transition-colors flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Simulate Bit-Rot</span>
                </button>
              </div>

              {/* Expandable Advanced Technical Details */}
              <div className="pt-2 border-t border-navy-800">
                <button
                  onClick={() => setShowAdvancedFileDetails(!showAdvancedFileDetails)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  <span>{showAdvancedFileDetails ? 'Hide Technical Details' : 'Show Advanced Technical Details'}</span>
                  {showAdvancedFileDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvancedFileDetails && (
                  <div className="mt-3 p-3 bg-navy-950 rounded-xl border border-navy-800 text-[11px] font-mono space-y-1.5 text-slate-300 animate-in fade-in duration-150">
                    <div>
                      <span className="text-slate-500 block">AUTHORITATIVE SHA-256 CHECKSUM</span>
                      <span className="text-emerald-400 break-all">{selectedFile.checksum}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ADAPTIVE REPLICATION POLICY RATIONALE</span>
                      <span className="text-slate-200">{selectedFile.replication_policy_reason}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500 block">READ COUNT</span>
                        <span>{selectedFile.read_count} accesses</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CALCULATED ACCESS RATE</span>
                        <span>{selectedFile.access_rate.toFixed(2)} req/min</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      <UploadFileModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={onRefresh}
      />
    </div>
  );
};

