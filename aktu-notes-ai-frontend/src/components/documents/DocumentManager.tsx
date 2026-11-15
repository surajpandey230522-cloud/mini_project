"use client";

import React, { useState, useRef } from "react";
import { useDocuments } from "@/context/DocumentContext";
import { api } from "@/lib/api";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  Database,
  Sparkles,
} from "lucide-react";

export function DocumentManager() {
  const {
    documents,
    completedDocs,
    processingDocs,
    selectedDocIds,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    retryDocument,
    toggleSelectDoc,
    selectAllCompleted,
    clearSelection,
    refreshDocuments,
  } = useDocuments();

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    await uploadDocument(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allCompletedSelected =
    completedDocs.length > 0 &&
    completedDocs.every((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex flex-col h-full bg-[#030712]/80 border-r border-slate-800/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
            Knowledge Base
          </h2>
        </div>
        <button
          onClick={() => refreshDocuments(false)}
          title="Refresh"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all duration-200 ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/8 scale-[1.02] glow-indigo"
            : "border-slate-800/60 hover:border-indigo-500/40 bg-slate-900/30 hover:bg-slate-900/50"
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
              <div className="w-9 h-9 rounded-xl bg-indigo-600/15 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
              <p className="text-xs font-semibold text-indigo-300">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 transition-transform group-hover:scale-110">
                <UploadCloud className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Drop a PDF here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  or click to browse · up to 25MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Processing Notice */}
      {processingDocs.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <div className="flex gap-0.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            </div>
            <span>Indexing {processingDocs.length} document{processingDocs.length > 1 ? "s" : ""}</span>
          </div>
          <p className="text-[11px] text-indigo-200/50 mt-1">
            Chat unlocks automatically when ready
          </p>
        </div>
      )}

      {/* Selection Actions */}
      {completedDocs.length > 0 && (
        <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500 px-0.5">
          <span>
            <span className="text-indigo-400 font-semibold">{selectedDocIds.length}</span>
            {" "}/ {completedDocs.length} selected
          </span>
          <button
            onClick={() => {
              if (allCompletedSelected) clearSelection();
              else selectAllCompleted();
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {allCompletedSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500/50" />
            Loading...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center p-4 border border-dashed border-slate-800/50 rounded-2xl text-slate-600">
            <Sparkles className="w-7 h-7 text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-500">No documents yet</p>
            <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
              Upload a PDF to start chatting with your content
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
                className={`group relative p-3 rounded-xl border transition-all duration-150 ${
                  isProcessing
                    ? "bg-indigo-950/15 border-indigo-500/25"
                    : isSelected
                    ? "bg-indigo-600/8 border-indigo-500/40 shadow-sm"
                    : isFailed
                    ? "bg-rose-950/10 border-rose-500/20"
                    : "bg-slate-900/30 border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Checkbox / Status Icon */}
                  {isCompleted ? (
                    <button
                      onClick={() => toggleSelectDoc(doc.id)}
                      title={isSelected ? "Deselect" : "Select for chat"}
                      className="mt-0.5 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400 fill-indigo-500/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400 transition-colors" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
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

                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 flex-wrap">
                      <span>{formatFileSize(doc.file_size)}</span>
                      {isCompleted && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400">{doc.page_count}p</span>
                          <span>·</span>
                          <span className="text-indigo-400/80">{doc.chunk_count} chunks</span>
                        </>
                      )}
                      {isProcessing && (
                        <span className="text-amber-400/80 font-medium animate-pulse">Indexing...</span>
                      )}
                      {isFailed && (
                        <span className="text-rose-400 font-medium">Failed</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {isFailed && (
                      <button
                        onClick={() => retryDocument(doc.id)}
                        title="Retry"
                        className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href={api.documents.downloadUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download"
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deleteDocument(doc.id, doc.original_filename)}
                      title="Delete"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Error detail */}
                {isFailed && doc.error_message && (
                  <div className="mt-2 text-[10px] text-rose-300/80 bg-rose-950/30 p-2 rounded-lg border border-rose-900/40 break-words leading-relaxed">
                    {doc.error_message}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
