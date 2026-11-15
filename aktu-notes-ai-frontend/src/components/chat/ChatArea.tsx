"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useDocuments } from "@/context/DocumentContext";
import { CitationItem, MessageItem } from "@/types";
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  FileText,
  AlertCircle,
  Loader2,
  BookmarkCheck,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";

interface ChatAreaProps {
  conversationId: string | null;
  onConversationCreated: (newId: string) => void;
  onOpenDocumentsDrawer?: () => void;
}

export function ChatArea({
  conversationId,
  onConversationCreated,
  onOpenDocumentsDrawer,
}: ChatAreaProps) {
  const { error } = useToast();
  const {
    documents,
    completedDocs,
    processingDocs,
    failedDocs,
    selectedDocIds,
    uploading,
    retryDocument,
    deleteDocument,
  } = useDocuments();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    const loadHistory = async () => {
      setFetchingHistory(true);
      try {
        const detail = await api.chats.getConversation(conversationId);
        setMessages(detail.messages || []);
      } catch (err: any) {
        error("Could not load message history.");
      } finally {
        setFetchingHistory(false);
      }
    };
    loadHistory();
  }, [conversationId]);

  useEffect(() => {
    if (selectedDocIds.length > 0 && processingDocs.length === 0) {
      textareaRef.current?.focus();
    }
  }, [selectedDocIds.length, processingDocs.length]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputQuestion;
    if (!textToSend.trim() || loading) return;

    if (selectedDocIds.length === 0) {
      error("Select at least one ready document to start chatting.");
      return;
    }

    const tempUserMsg: MessageItem = {
      id: "temp-" + Date.now(),
      conversation_id: conversationId || "",
      role: "user",
      content: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuestion("");
    setLoading(true);

    try {
      const resp = await api.chats.ask({
        question: textToSend.trim(),
        document_ids: selectedDocIds,
        conversation_id: conversationId,
      });

      if (!conversationId && resp.conversation_id) {
        onConversationCreated(resp.conversation_id);
      }

      const assistantMsg: MessageItem = {
        id: resp.message_id,
        conversation_id: resp.conversation_id,
        role: "assistant",
        content: resp.answer,
        citations: resp.citations,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      error(err.message || "Failed to generate answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const samplePrompts = [
    "Summarize the key concepts from this document.",
    "What are the main topics covered on pages 1–10?",
    "List all definitions and formulas mentioned.",
    "What are the most important points I should remember?",
  ];

  const isCurrentlyProcessing = processingDocs.length > 0;
  const hasReadyDocsSelected = selectedDocIds.length > 0;
  const isInputDisabled =
    loading ||
    uploading ||
    !hasReadyDocsSelected ||
    (isCurrentlyProcessing && selectedDocIds.length === 0);

  let inputPlaceholder = "Ask anything about your documents… (Enter to send)";
  if (uploading) {
    inputPlaceholder = "Uploading document…";
  } else if (isCurrentlyProcessing && selectedDocIds.length === 0) {
    inputPlaceholder = `Indexing "${processingDocs[0].original_filename}"… Chat unlocks when ready.`;
  } else if (documents.length === 0) {
    inputPlaceholder = "Upload a document from the left panel to begin.";
  } else if (!hasReadyDocsSelected) {
    inputPlaceholder = "Select a document from the left panel to chat.";
  }

  return (
    <div className="flex flex-col h-full bg-[#030712] flex-1 relative overflow-hidden">
      {/* Top Context Bar */}
      <div className="h-11 border-b border-slate-800/40 px-5 flex items-center justify-between bg-[#030712]/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Context</span>
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
              hasReadyDocsSelected
                ? "bg-indigo-500/12 text-indigo-400 border border-indigo-500/25"
                : "bg-slate-900/60 text-slate-600 border border-slate-800/40"
            }`}
          >
            {selectedDocIds.length} {selectedDocIds.length === 1 ? "doc" : "docs"} active
          </span>
        </div>

        {isCurrentlyProcessing && hasReadyDocsSelected && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-400">
            <div className="flex gap-0.5">
              <span className="typing-dot w-1 h-1 rounded-full bg-indigo-400 inline-block" />
              <span className="typing-dot w-1 h-1 rounded-full bg-indigo-400 inline-block" />
              <span className="typing-dot w-1 h-1 rounded-full bg-indigo-400 inline-block" />
            </div>
            <span>Indexing in background</span>
          </div>
        )}

        {!hasReadyDocsSelected && !isCurrentlyProcessing && documents.length > 0 && (
          <p className="text-[11px] text-amber-500/80 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Select a document to chat
          </p>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {fetchingHistory ? (
          <div className="flex items-center justify-center h-48 text-slate-600 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500/60" />
            Loading history…
          </div>
        ) : isCurrentlyProcessing && selectedDocIds.length === 0 ? (
          /* Processing screen */
          <div className="max-w-lg mx-auto py-16 px-4 text-center animate-in fade-in duration-300">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/15 animate-ping opacity-50" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 animate-pulse-glow">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Indexing Your Document</h3>
            <p className="text-xs font-mono text-indigo-300/70 mt-2 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-800/30 inline-block max-w-xs truncate">
              {processingDocs[0]?.original_filename || "document.pdf"}
            </p>
            <div className="mt-6 space-y-2 max-w-sm mx-auto text-left">
              {[
                { label: "Upload verified", done: true },
                { label: "Extracting & chunking text", done: false, active: true },
                { label: "Generating AI embeddings", done: false },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl text-xs transition-colors ${
                    step.done
                      ? "bg-emerald-950/20 border border-emerald-900/30"
                      : step.active
                      ? "bg-indigo-950/30 border border-indigo-500/25"
                      : "bg-slate-900/30 border border-slate-800/30"
                  }`}
                >
                  {step.done ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 text-[10px]">✓</span>
                    </div>
                  ) : step.active ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className={step.done ? "text-emerald-400" : step.active ? "text-indigo-300" : "text-slate-600"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : !isCurrentlyProcessing && selectedDocIds.length === 0 && failedDocs.length > 0 && completedDocs.length === 0 ? (
          /* Failed screen */
          <div className="max-w-lg mx-auto py-12 px-4 text-center animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Processing Failed</h3>
            <p className="text-xs text-rose-300/70 mt-1.5 font-mono bg-rose-950/30 border border-rose-900/30 px-3 py-1 rounded-lg inline-block max-w-xs truncate">
              {failedDocs[0].original_filename}
            </p>
            <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 text-left text-xs text-rose-200/70">
              <p className="font-semibold text-rose-400 mb-2">Possible reasons:</p>
              <p>• <strong>Scanned PDF</strong> — image-only file without selectable text</p>
              <p>• <strong>Server restart</strong> — click Retry below to re-process</p>
              <p>• <strong>Corrupted / encrypted</strong> — ensure the file opens normally</p>
            </div>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => retryDocument(failedDocs[0].id)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
              <button
                onClick={() => deleteDocument(failedDocs[0].id, failedDocs[0].original_filename)}
                className="px-5 py-2 rounded-xl glass-dark text-slate-300 text-xs font-semibold transition-colors hover:text-white"
              >
                Delete & Try Another
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Welcome / empty state */
          <div className="max-w-2xl mx-auto py-14 px-4 text-center">
            <div className="relative w-14 h-14 mx-auto mb-5">
              <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/25">
                <Zap className="w-7 h-7" fill="white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              NoteFlow AI
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              {hasReadyDocsSelected
                ? "Your documents are ready. Ask anything — I'll find the answer with exact citations."
                : "Select a document from the left panel, then ask me anything about it."}
            </p>

            {hasReadyDocsSelected && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={isInputDisabled}
                    className="p-3.5 rounded-xl glass-dark hover:border-indigo-500/40 hover:bg-indigo-500/5 text-xs text-slate-400 hover:text-white transition-all text-left flex items-start gap-2.5 disabled:opacity-30 group"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="leading-relaxed">{prompt}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600 shrink-0 mt-0.5 ml-auto group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Messages */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 max-w-3xl ${
                msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`flex flex-col gap-2 rounded-2xl p-4 sm:p-5 text-sm max-w-[85%] sm:max-w-[88%] ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20"
                    : "glass-dark text-slate-200"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-200 text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Citations */}
                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-2">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Source Citations</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-700/40 text-[11px] text-slate-300"
                        >
                          <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="font-medium truncate max-w-[160px]" title={cite.filename}>
                            {cite.filename}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-mono text-[10px] shrink-0">
                            p.{cite.page_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-slate-400 shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex gap-3 max-w-3xl mr-auto items-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl glass-dark flex items-center gap-3">
              <div className="flex gap-1">
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              </div>
              <span className="text-xs text-slate-500">Generating answer…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-slate-800/40 bg-[#030712]/90 backdrop-blur-xl shrink-0">
        <div
          className={`max-w-4xl mx-auto relative flex items-end rounded-2xl border transition-all duration-150 p-2 ${
            isInputDisabled
              ? "bg-slate-900/20 border-slate-800/30 opacity-60"
              : "glass-dark border-slate-700/40 focus-within:border-indigo-500/50 focus-within:shadow-lg focus-within:shadow-indigo-500/5"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            rows={2}
            placeholder={inputPlaceholder}
            className="w-full bg-transparent px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none resize-none custom-scrollbar disabled:cursor-not-allowed"
          />

          <button
            onClick={() => handleSend()}
            disabled={isInputDisabled || !inputQuestion.trim()}
            className={`p-2.5 rounded-xl text-white shadow-md transition-all shrink-0 self-end ml-2 ${
              isInputDisabled || !inputQuestion.trim()
                ? "bg-slate-800/40 text-slate-600 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/20 hover:scale-[1.05]"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-700 mt-2">
          Answers are grounded in your uploaded documents · Always verify critical information
        </p>
      </div>
    </div>
  );
}
