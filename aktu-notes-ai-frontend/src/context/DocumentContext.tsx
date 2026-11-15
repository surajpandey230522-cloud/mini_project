"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DocumentItem } from "@/types";

interface DocumentContextType {
  documents: DocumentItem[];
  completedDocs: DocumentItem[];
  processingDocs: DocumentItem[];
  failedDocs: DocumentItem[];
  selectedDocIds: string[];
  loading: boolean;
  uploading: boolean;
  uploadDocument: (file: File) => Promise<boolean>;
  deleteDocument: (id: string, filename: string) => Promise<void>;
  retryDocument: (id: string) => Promise<void>;
  toggleSelectDoc: (id: string) => void;
  selectAllCompleted: () => void;
  clearSelection: () => void;
  refreshDocuments: (silent?: boolean) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { success, error, info } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Keep track of previously processing document IDs to detect completion transitions
  const prevProcessingIdsRef = useRef<Set<string>>(new Set());

  const completedDocs = documents.filter((d) => d.status === "completed");
  const processingDocs = documents.filter(
    (d) => d.status === "pending" || d.status === "processing"
  );
  const failedDocs = documents.filter((d) => d.status === "failed");

  const refreshDocuments = useCallback(
    async (silent = false) => {
      if (!isAuthenticated) return;
      if (!silent) setLoading(true);

      try {
        const resp = await api.documents.list(1, 100);
        const newDocs = resp.items || [];

        // Check for completed transitions from previously processing docs
        const currentProcessingIds = new Set(
          newDocs
            .filter((d) => d.status === "pending" || d.status === "processing")
            .map((d) => d.id)
        );

        for (const doc of newDocs) {
          if (
            prevProcessingIdsRef.current.has(doc.id) &&
            doc.status === "completed"
          ) {
            success(
              `"${doc.original_filename}" is ready! Indexed ${doc.page_count} pages (${doc.chunk_count} chunks).`
            );
            // Automatically select the newly ready document into active chat scope!
            setSelectedDocIds((prev) =>
              prev.includes(doc.id) ? prev : [...prev, doc.id]
            );
          } else if (
            prevProcessingIdsRef.current.has(doc.id) &&
            doc.status === "failed"
          ) {
            error(
              `"${doc.original_filename}" processing failed: ${
                doc.error_message || "Could not extract text."
              }`
            );
          }
        }

        prevProcessingIdsRef.current = currentProcessingIds;
        setDocuments(newDocs);

        // If no documents are currently selected, automatically select all completed docs
        setSelectedDocIds((prev) => {
          if (prev.length === 0 && newDocs.length > 0) {
            const ready = newDocs
              .filter((d) => d.status === "completed")
              .map((d) => d.id);
            return ready;
          }
          // Filter out any IDs that are no longer valid or completed
          const completedSet = new Set(
            newDocs.filter((d) => d.status === "completed").map((d) => d.id)
          );
          return prev.filter((id) => completedSet.has(id));
        });
      } catch (err: any) {
        if (!silent) {
          console.error("Failed to load documents:", err);
          error("Could not retrieve documents list.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isAuthenticated, success, error]
  );

  // Initial load when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshDocuments(false);
    } else {
      setDocuments([]);
      setSelectedDocIds([]);
      prevProcessingIdsRef.current.clear();
    }
  }, [isAuthenticated, refreshDocuments]);

  // Polling loop while any document is in pending or processing status
  useEffect(() => {
    if (!isAuthenticated || processingDocs.length === 0) return;

    const interval = setInterval(() => {
      refreshDocuments(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [isAuthenticated, processingDocs.length, refreshDocuments]);

  const uploadDocument = async (file: File): Promise<boolean> => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      error("Only PDF files are supported (.pdf)");
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      error("File size exceeds maximum allowed 25MB.");
      return false;
    }

    setUploading(true);
    try {
      const resp = await api.documents.upload(file);
      info(
        `Uploaded "${file.name}". Now processing text & pgvector embeddings...`
      );

      // Add to tracking set so we celebrate when it becomes completed
      prevProcessingIdsRef.current.add(resp.id);

      // Immediately refresh list
      await refreshDocuments(true);
      return true;
    } catch (err: any) {
      error(err.message || "Failed to upload document.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string, filename: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${filename}" and its vector embeddings?`
      )
    ) {
      return;
    }

    try {
      await api.documents.delete(id);
      success(`Deleted "${filename}".`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedDocIds((prev) => prev.filter((docId) => docId !== id));
      prevProcessingIdsRef.current.delete(id);
    } catch (err: any) {
      error(err.message || "Failed to delete document.");
    }
  };

  const retryDocument = async (id: string) => {
    try {
      info("Retrying text extraction and embedding generation...");
      await api.documents.retry(id);
      prevProcessingIdsRef.current.add(id);
      await refreshDocuments(true);
    } catch (err: any) {
      error(err.message || "Failed to retry document processing.");
    }
  };

  const toggleSelectDoc = (id: string) => {
    // Only completed documents can be selected
    const doc = documents.find((d) => d.id === id);
    if (!doc || doc.status !== "completed") {
      info("This document is still processing. It will be ready shortly!");
      return;
    }

    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCompleted = () => {
    setSelectedDocIds(completedDocs.map((d) => d.id));
  };

  const clearSelection = () => {
    setSelectedDocIds([]);
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        completedDocs,
        processingDocs,
        failedDocs,
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
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return context;
}

