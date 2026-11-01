import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  onUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importance, setImportance] = useState<string>('Standard');
  const [writeMode, setWriteMode] = useState<string>('PARALLEL_PUSH');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await api.uploadFile(selectedFile, importance, writeMode);
      setSuccessInfo(res);
      onUploaded();
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-850 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-cyan/10 text-brand-cyan rounded-lg border border-brand-cyan/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload New File</h3>
              <p className="text-xs text-slate-400">Stores bytes across multi-rack failure domains</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-navy-700 hover:border-slate-500 bg-navy-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3 text-left">
                <FileText className="w-8 h-8 text-brand-cyan shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white truncate max-w-xs">{selectedFile.name}</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">
                  Click to browse or drag and drop your file here
                </p>
                <p className="text-[11px] text-slate-500">
                  Maximum file size: 50 MB
                </p>
              </div>
            )}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Importance */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">File Importance</label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
                className="w-full text-xs bg-navy-950 border border-navy-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-cyan font-sans"
              >
                <option value="Standard">Standard (3 Replicas)</option>
                <option value="Critical">Critical (4 Replicas Cross-Rack)</option>
              </select>
              <span className="text-[10px] text-slate-500 block">
                {importance === 'Critical' ? 'Guarantees cross-rack survival.' : 'Standard 3-copy redundancy.'}
              </span>
            </div>

            {/* Write Pipeline */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Replication Mode</label>
              <select
                value={writeMode}
                onChange={(e) => setWriteMode(e.target.value)}
                className="w-full text-xs bg-navy-950 border border-navy-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-cyan font-sans"
              >
                <option value="PARALLEL_PUSH">Parallel Push (Concurrent)</option>
                <option value="DAISY_CHAIN">Daisy-Chain Pipeline</option>
              </select>
              <span className="text-[10px] text-slate-500 block">
                {writeMode === 'PARALLEL_PUSH' ? 'Lowest write latency.' : 'Conserves client bandwidth.'}
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Successfully stored with {successInfo.file.target_replication_factor} replicas on nodes: {successInfo.file.replica_locations.join(', ')}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-navy-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-navy-950 shadow-md shadow-cyan-950 transition-all disabled:opacity-50"
            >
              {isUploading ? 'Replicating Across Cluster...' : 'Upload & Replicate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

