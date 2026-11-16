"use client";

import React, { useState, useRef, useMemo } from "react";
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
  Search,
  Filter,
  Layers,
  FileCheck,
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
  const [searchQuery, setSearchQuery] = useState("");
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

  // Client-side search filtering (does not alter data or backend)
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    return documents.filter((d) =>
      d.original_filename.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [documents, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white/75 backdrop-blur-xl border-r border-slate-200/80 p-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/80 flex items-center justify-center shadow-2xs">
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Knowledge Base
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">
              {completedDocs.length} ready · {processingDocs.length} indexing
            </p>
          </div>
        </div>
        <button
          onClick={() => refreshDocuments(false)}
          title="Refresh documents"
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80 border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group mt-3.5 p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all duration-300 relative overflow-hidden ${
          dragActive
            ? "border-indigo-500 bg-indigo-50/90 scale-[1.02] shadow-md shadow-indigo-500/10"
            : "border-indigo-200/80 hover:border-indigo-400 bg-gradient-to-b from-slate-50/80 to-indigo-50/20 hover:bg-indigo-50/40 shadow-2xs hover:shadow-xs"
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
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center animate-pulse">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
              <p className="text-xs font-bold text-indigo-700">Uploading PDF...</p>
              <p className="text-[10px] text-indigo-500">Preparing text extraction</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5 shadow-2xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  Upload Notes or PDF
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Drag & drop or browse · up to 25MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Indexing Alert */}
      {processingDocs.length > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 shadow-2xs animate-fade-up">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <div className="flex gap-1">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            </div>
            <span>Indexing {processingDocs.length} document{processingDocs.length > 1 ? "s" : ""}</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1 font-medium">
            Generating embeddings · Will unlock automatically
          </p>
        </div>
      )}

      {/* Interactive Search Bar */}
      {documents.length > 3 && (
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
        </div>
      )}

      {/* Selection Control Bar */}
      {completedDocs.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="font-medium">
            <span className="text-indigo-600 font-bold">{selectedDocIds.length}</span>
            {" "}/ {completedDocs.length} active
          </span>
          <button
            onClick={() => {
              if (allCompletedSelected) clearSelection();
              else selectAllCompleted();
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors cursor-pointer"
          >
            {allCompletedSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="mt-2.5 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-slate-500 text-xs gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="font-medium">Loading documents...</span>
          </div>
        ) : filteredDocuments.length === 0 && documents.length > 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p>No documents match "{searchQuery}"</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 border border-dashed border-slate-200 rounded-2xl text-slate-500 bg-slate-50/50">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-2.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No documents yet</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Drop any PDF above to begin asking questions
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isCompleted = doc.status === "completed";
            const isProcessing = doc.status === "processing" || doc.status === "pending";
            const isFailed = doc.status === "failed";

            return (
              <div
                key={doc.id}
                className={`group relative p-3 rounded-2xl border transition-all duration-200 ${
                  isProcessing
                    ? "bg-amber-50/60 border-amber-200/90 shadow-2xs"
                    : isSelected
                    ? "bg-indigo-50/85 border-indigo-300 shadow-xs ring-1 ring-indigo-400/20"
                    : isFailed
                    ? "bg-rose-50/70 border-rose-200 shadow-2xs"
                    : "bg-white hover:bg-slate-50 border-slate-200/80 hover:border-indigo-200 shadow-2xs hover:shadow-xs"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Checkbox / Status Indicator */}
                  {isCompleted ? (
                    <button
                      onClick={() => toggleSelectDoc(doc.id)}
                      title={isSelected ? "Deselect for chat" : "Select for chat"}
                      className="mt-0.5 shrink-0 transition-transform active:scale-90 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4.5 h-4.5 text-indigo-600 fill-indigo-100" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-slate-400 hover:text-indigo-600 transition-colors" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      {isProcessing ? (
                        <Loader2 className="w-4.5 h-4.5 text-amber-600 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                      )}
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={doc.original_filename}
                      className={`text-xs font-bold truncate leading-snug ${
                        isSelected ? "text-indigo-950" : "text-slate-800"
                      }`}
                    >
                      {doc.original_filename}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {formatFileSize(doc.file_size)}
                      </span>
                      {isCompleted && (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            {doc.page_count} pages
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                            {doc.chunk_count} chunks
                          </span>
                        </>
                      )}
                      {isProcessing && (
                        <span className="text-amber-700 font-bold animate-pulse">Processing...</span>
                      )}
                      {isFailed && (
                        <span className="text-rose-600 font-bold">Failed</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {isFailed && (
                      <button
                        onClick={() => retryDocument(doc.id)}
                        title="Retry processing"
                        className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-100/70 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href={api.documents.downloadUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download PDF"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deleteDocument(doc.id, doc.original_filename)}
                      title="Delete document"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Error detail if failed */}
                {isFailed && doc.error_message && (
                  <div className="mt-2 text-[10px] text-rose-700 bg-rose-100/60 p-2 rounded-xl border border-rose-200 break-words leading-relaxed">
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
