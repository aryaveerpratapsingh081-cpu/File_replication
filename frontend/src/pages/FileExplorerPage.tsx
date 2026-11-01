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
  RefreshCw,
  ExternalLink,
  Flame,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FileData, ReplicaData } from '../types';
import { api } from '../services/api';
import clsx from 'clsx';

interface FileExplorerPageProps {
  files: FileData[];
  onRefresh: () => void;
}

export const FileExplorerPage: React.FC<FileExplorerPageProps> = ({ files, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterImportance, setFilterImportance] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadImportance, setUploadImportance] = useState<string>('Standard');
  const [writeMode, setWriteMode] = useState<string>('PARALLEL_PUSH');
  const [selectedFileForReplicas, setSelectedFileForReplicas] = useState<FileData | null>(null);
  const [replicas, setReplicas] = useState<ReplicaData[]>([]);
  const [loadingReplicas, setLoadingReplicas] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // File Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setActionMessage(null);
    try {
      const res = await api.uploadFile(file, uploadImportance, writeMode);
      setActionMessage({
        type: 'success',
        text: `Uploaded "${file.name}" successfully (${res.file.target_replication_factor} replicas created via ${writeMode}).`
      });
      onRefresh();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'File upload failed'
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleInspectReplicas = async (f: FileData) => {
    setSelectedFileForReplicas(f);
    setLoadingReplicas(true);
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
    if (!window.confirm(`Are you sure you want to permanently delete "${filename}" and all its replica copies?`)) {
      return;
    }
    try {
      await api.deleteFile(fileId);
      setActionMessage({ type: 'info', text: `File "${filename}" and all replicas deleted.` });
      onRefresh();
      if (selectedFileForReplicas?.file_id === fileId) {
        setSelectedFileForReplicas(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecalculate = async (fileId: string, currentImportance: string) => {
    const newImportance = currentImportance === 'Standard' ? 'Critical' : 'Standard';
    try {
      const updated = await api.recalculateReplication(fileId, newImportance);
      setActionMessage({
        type: 'success',
        text: `Updated "${updated.filename}" importance to ${newImportance}. New target replicas: ${updated.target_replication_factor}.`
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateCorruption = async (fileId: string) => {
    try {
      const res = await api.simulateCorruption(fileId);
      setActionMessage({
        type: 'info',
        text: `Injected bit-flip into replica on ${res.corrupted_node_id}. Integrity mismatch created!`
      });
      onRefresh();
      if (selectedFileForReplicas?.file_id === fileId) {
        handleInspectReplicas(selectedFileForReplicas);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyRepair = async (fileId: string) => {
    try {
      const res = await api.verifyAndRepairIntegrity(fileId);
      if (res.repaired) {
        setActionMessage({
          type: 'success',
          text: `Self-healing completed! Corrupted replica restored from healthy source. SHA-256 verified.`
        });
      } else {
        setActionMessage({
          type: 'info',
          text: `All ${res.healthy_replicas.length} surviving replicas are healthy and SHA-256 verified.`
        });
      }
      onRefresh();
      if (selectedFileForReplicas?.file_id === fileId) {
        handleInspectReplicas(selectedFileForReplicas);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Filtered files
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImp = filterImportance === 'ALL' || f.importance === filterImportance;
    return matchesSearch && matchesImp;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-brand-cyan" />
            Distributed File Explorer & Replicas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload files, inspect replica distribution across rack failure domains, verify SHA-256 hashes, and demonstrate adaptive scaling.
          </p>
        </div>

        {/* Upload Controls Box */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Importance select for new uploads */}
          <select
            value={uploadImportance}
            onChange={(e) => setUploadImportance(e.target.value)}
            className="text-xs bg-navy-850 border border-navy-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-cyan"
            title="Set importance policy for new file upload"
          >
            <option value="Standard">Standard (3 Base Replicas)</option>
            <option value="Critical">Critical (4 Base Replicas)</option>
          </select>

          {/* Write Pipeline Mode */}
          <select
            value={writeMode}
            onChange={(e) => setWriteMode(e.target.value)}
            className="text-xs bg-navy-850 border border-navy-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-cyan"
            title="Select write pipeline protocol"
          >
            <option value="PARALLEL_PUSH">Parallel Push (Concurrent)</option>
            <option value="DAISY_CHAIN">Daisy-Chain Pipeline</option>
          </select>

          {/* Upload Button */}
          <label className={clsx(
            'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 cursor-pointer shadow-md shadow-cyan-950 transition-all duration-200',
            isUploading && 'opacity-60 cursor-not-allowed'
          )}>
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Replicating...' : 'Upload File'}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={clsx(
          'p-3.5 rounded-xl border text-xs flex items-center justify-between',
          actionMessage.type === 'success' && 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
          actionMessage.type === 'error' && 'bg-rose-950/40 border-rose-500/40 text-rose-300',
          actionMessage.type === 'info' && 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
        )}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {actionMessage.type === 'error' && <ShieldAlert className="w-4 h-4 shrink-0" />}
            {actionMessage.type === 'info' && <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-navy-900 p-3 rounded-xl border border-navy-800">
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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Importance:</span>
          <select
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value)}
            className="text-xs bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-brand-cyan"
          >
            <option value="ALL">All Files</option>
            <option value="Standard">Standard Only</option>
            <option value="Critical">Critical Only</option>
          </select>
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-850/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Importance</th>
                <th className="px-4 py-3">Target / Surviving</th>
                <th className="px-4 py-3">SHA-256 Checksum</th>
                <th className="px-4 py-3">Replica Nodes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-mono">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No files uploaded yet. Click <strong>Upload File</strong> above to store your first distributed file.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isUnderReplicated = file.surviving_replica_count < file.target_replication_factor;
                  return (
                    <tr
                      key={file.file_id}
                      className={clsx(
                        'hover:bg-navy-850/50 transition-colors',
                        isUnderReplicated && 'bg-amber-950/10'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-cyan shrink-0" />
                          <div>
                            <span className="text-white font-medium block truncate max-w-xs">{file.filename}</span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {file.file_id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRecalculate(file.file_id, file.importance)}
                          title="Click to toggle importance & trigger adaptive recalculation"
                          className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border cursor-pointer hover:scale-105 transition-transform',
                            file.importance === 'Critical'
                              ? 'bg-amber-950/70 text-amber-300 border-amber-600/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          )}
                        >
                          {file.importance} ↺
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          isUnderReplicated
                            ? 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        )}>
                          {file.surviving_replica_count} / {file.target_replication_factor} Replicas
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]" title={file.checksum}>
                        {file.checksum.slice(0, 12)}...
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {file.replica_locations.map((nid) => (
                            <span
                              key={nid}
                              className="px-1.5 py-0.5 rounded bg-navy-950 text-[10px] text-brand-cyan border border-navy-800"
                            >
                              {nid}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {/* Replicas Inspector */}
                          <button
                            onClick={() => handleInspectReplicas(file)}
                            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                            title="Inspect Replicas & Failure Domains"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Download */}
                          <a
                            href={api.downloadFileUrl(file.file_id)}
                            download={file.filename}
                            className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors"
                            title="Download with SHA-256 Checksum Verification"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Simulate Corruption */}
                          <button
                            onClick={() => handleSimulateCorruption(file.file_id)}
                            className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/30 transition-colors"
                            title="Inject Silent Corruption into a Replica"
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>

                          {/* Verify & Self-Heal */}
                          <button
                            onClick={() => handleVerifyRepair(file.file_id)}
                            className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/30 transition-colors"
                            title="Verify Checksum & Self-Heal"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(file.file_id, file.filename)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-600/30 transition-colors"
                            title="Delete file"
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

      {/* Replica Locations Inspector Drawer/Card */}
      {selectedFileForReplicas && (
        <div className="bg-navy-900 p-5 rounded-2xl border border-brand-cyan/40 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-navy-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-brand-cyan" />
                Replica Distribution for "{selectedFileForReplicas.filename}"
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Replication Factor: <strong className="text-slate-200">{selectedFileForReplicas.target_replication_factor}</strong> •
                Surviving: <strong className="text-slate-200">{selectedFileForReplicas.surviving_replica_count}</strong> •
                Policy: {selectedFileForReplicas.replication_policy_reason}
              </p>
            </div>
            <button
              onClick={() => setSelectedFileForReplicas(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-navy-800 rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {replicas.map((rep) => (
              <div
                key={rep.replica_id}
                className={clsx(
                  'p-3.5 rounded-xl border bg-navy-950',
                  rep.is_corrupted ? 'border-rose-500/50 text-rose-300 bg-rose-950/20' : 'border-navy-800 text-slate-300'
                )}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-white font-mono">{rep.node_name || rep.node_id}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{rep.rack_id}</span>
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role:</span>
                    <span>{rep.is_primary ? 'Primary' : 'Backup'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Integrity:</span>
                    <span className={rep.is_corrupted ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {rep.is_corrupted ? 'CORRUPTED' : 'VERIFIED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hash:</span>
                    <span className="truncate max-w-[100px]">{rep.checksum.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

