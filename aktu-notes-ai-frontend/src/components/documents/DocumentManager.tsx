"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { DocumentItem } from "@/types";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Download,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

interface DocumentManagerProps {
  selectedDocIds: string[];
  onToggleSelect: (docId: string) => void;
  onSelectAll: (docIds: string[]) => void;
  onClearSelection: () => void;
}

export function DocumentManager({
  selectedDocIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}: DocumentManagerProps) {
  const { success, error, info } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const resp = await api.documents.list(0, 50);
      setDocuments(resp.items || []);

      // If no docs selected yet, auto-select all completed docs
      if (selectedDocIds.length === 0 && resp.items.length > 0) {
        const completedIds = resp.items
          .filter((d) => d.status === "completed")
          .map((d) => d.id);
        if (completedIds.length > 0) {
          onSelectAll(completedIds);
        }
      }
    } catch (err: any) {
      if (!silent) error("Could not load your uploaded notes.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll while any document is in pending or processing status
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === "pending" || d.status === "processing"
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchDocuments(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      error("Only PDF files are supported (.pdf)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      error("File size exceeds 25MB limit.");
      return;
    }

    setUploading(true);
    try {
      const resp = await api.documents.upload(file);
      success(`Uploaded "${file.name}"! Extracting text and generating pgvector embeddings...`);
      await fetchDocuments(true);
      // Automatically add to selected if needed
      onToggleSelect(resp.id);
    } catch (err: any) {
      error(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}" and its vector embeddings?`)) {
      return;
    }
    try {
      await api.documents.delete(docId);
      success(`Deleted "${filename}".`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocIds.includes(docId)) {
        onToggleSelect(docId);
      }
    } catch (err: any) {
      error(err.message || "Failed to delete document.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const completedDocs = documents.filter((d) => d.status === "completed");
  const allCompletedSelected =
    completedDocs.length > 0 &&
    completedDocs.every((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border-r border-slate-800/80 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Academic Notes & PDFs
          </h2>
        </div>
        <button
          onClick={() => fetchDocuments()}
          title="Refresh documents"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,.pdf"
          onChange={(e) => {
            if (e.target.value && e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
              e.target.value = "";
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs font-semibold text-indigo-300">Uploading & Indexing PDF...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Click or drag AKTU notes / Quantum PDF
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">PDF up to 25MB • PyMuPDF text & pgvector</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selection Actions */}
      {completedDocs.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            {selectedDocIds.length} of {completedDocs.length} selected for AI chat
          </span>
          <button
            onClick={() => {
              if (allCompletedSelected) {
                onClearSelection();
              } else {
                onSelectAll(completedDocs.map((d) => d.id));
              }
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {allCompletedSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-slate-800/80 rounded-2xl text-slate-500">
            <FileText className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">No notes uploaded yet</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Upload your AKTU Quantum series, handwritten PDFs, or lecture notes to chat!
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isCompleted = doc.status === "completed";
            const isProcessing = doc.status === "processing" || doc.status === "pending";
            const isFailed = doc.status === "failed";

            return (
              <div
                key={doc.id}
                className={`group relative p-3 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-indigo-950/20 border-indigo-500/40 shadow-sm"
                    : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Select Checkbox for Completed Docs */}
                  {isCompleted ? (
                    <button
                      onClick={() => onToggleSelect(doc.id)}
                      className="mt-0.5 text-indigo-400 hover:text-indigo-300 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-indigo-500/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={doc.original_filename}
                      className="text-xs font-semibold text-slate-200 truncate leading-snug"
                    >
                      {doc.original_filename}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      {isCompleted && (
                        <>
                          <span>{doc.page_count} pages</span>
                          <span>•</span>
                          <span>{doc.chunk_count} chunks</span>
                        </>
                      )}
                      {isProcessing && (
                        <span className="text-amber-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" /> Processing...
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-rose-400 truncate" title={doc.error_message || "Processing failed"}>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (Download / Delete) */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <a
                      href={api.documents.downloadUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download PDF"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id, doc.original_filename)}
                      title="Delete document"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isFailed && doc.error_message && (
                  <p className="mt-2 text-[10px] text-rose-400 bg-rose-950/30 p-1.5 rounded-lg border border-rose-900/50">
                    {doc.error_message}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

