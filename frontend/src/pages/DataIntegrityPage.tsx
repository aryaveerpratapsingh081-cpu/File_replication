import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
  FileText,
  Lock,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { FileData } from '../types';
import { api } from '../services/api';
import clsx from 'clsx';

interface DataIntegrityPageProps {
  files: FileData[];
  onRefresh: () => void;
}

export const DataIntegrityPage: React.FC<DataIntegrityPageProps> = ({ files, onRefresh }) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.file_id || '');
  const [corruptionResult, setCorruptionResult] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCorrupting, setIsCorrupting] = useState<boolean>(false);

  const selectedFile = files.find((f) => f.file_id === selectedFileId) || files[0];

  const handleSimulateCorruption = async () => {
    if (!selectedFile) return;
    setIsCorrupting(true);
    setVerificationResult(null);
    try {
      const res = await api.simulateCorruption(selectedFile.file_id);
      setCorruptionResult(res);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCorrupting(false);
    }
  };

  const handleVerifyAndRepair = async () => {
    if (!selectedFile) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyAndRepairIntegrity(selectedFile.file_id);
      setVerificationResult(res);
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-brand-cyan" />
            Data Integrity Center & Silent Corruption Healing
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detect silent bit-rot using cryptographic SHA-256 checksums and automatically self-heal corrupted replicas from verified healthy copies.
          </p>
        </div>
      </div>

      {/* Demonstration Controls Card */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-cyan" />
              Cryptographic Integrity Lab & Bit-Flip Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Select a file below to inject a simulated bit-flip into one replica, then run verification to observe automated self-healing.
            </p>
          </div>

          {/* File Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Target File:</span>
            <select
              value={selectedFile?.file_id || ''}
              onChange={(e) => {
                setSelectedFileId(e.target.value);
                setCorruptionResult(null);
                setVerificationResult(null);
              }}
              className="text-xs bg-navy-950 border border-navy-700 text-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-brand-cyan"
            >
              {files.map((f) => (
                <option key={f.file_id} value={f.file_id}>
                  {f.filename} ({f.importance})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedFile && (
          <div className="space-y-4">
            {/* File Info Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-navy-950 p-4 rounded-xl border border-navy-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Target Filename</span>
                <span className="text-white font-bold">{selectedFile.filename}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Size</span>
                <span className="text-slate-300">{(selectedFile.size_bytes / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Replicas Allocated</span>
                <span className="text-brand-cyan font-bold">{selectedFile.surviving_replica_count} Instances</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Authoritative Hash</span>
                <span className="text-emerald-400 truncate block" title={selectedFile.checksum}>
                  {selectedFile.checksum.slice(0, 16)}...
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSimulateCorruption}
                disabled={isCorrupting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-600/40 shadow-lg shadow-rose-950/30 transition-all disabled:opacity-50"
              >
                <Flame className="w-4 h-4" />
                <span>{isCorrupting ? 'Injecting...' : '1. Simulate Bit-Flip Corruption'}</span>
              </button>

              <button
                onClick={handleVerifyAndRepair}
                disabled={isVerifying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-navy-950 shadow-lg shadow-emerald-950/30 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying & Healing...' : '2. Run Verification & Self-Heal'}</span>
              </button>
            </div>

            {/* Corruption Stage Card */}
            {corruptionResult && (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Bit-Flip Injected into Replica on Node: {corruptionResult.corrupted_node_id}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-navy-950 p-2.5 rounded border border-navy-800">
                    <span className="text-slate-500 block text-[10px]">EXPECTED AUTHORITATIVE SHA-256</span>
                    <span className="text-emerald-400">{corruptionResult.original_checksum}</span>
                  </div>
                  <div className="bg-navy-950 p-2.5 rounded border border-navy-800">
                    <span className="text-slate-500 block text-[10px]">CORRUPTED MODIFIED REPLICA HASH</span>
                    <span className="text-rose-400 font-bold">{corruptionResult.tampered_checksum}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Verification & Self-Healing Stage Card */}
            {verificationResult && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verification & Self-Healing Outcome</span>
                </div>
                <p className="text-slate-200 font-sans text-xs">
                  {verificationResult.repair_details}
                </p>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">HEALTHY REPLICAS</span>
                    <span className="text-emerald-400">{verificationResult.healthy_replicas.join(', ') || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CORRUPTED REPLICAS DETECTED</span>
                    <span className="text-rose-400">{verificationResult.corrupted_replicas.join(', ') || '0 (All clean)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">REPAIR STATUS</span>
                    <span className={verificationResult.repaired ? 'text-brand-cyan font-bold' : 'text-slate-300'}>
                      {verificationResult.repaired ? 'Self-Healed Successfully' : 'Intact (No repair needed)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

