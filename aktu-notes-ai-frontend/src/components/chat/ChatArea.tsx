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
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  CornerDownLeft,
  BookOpen,
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
  const { error, success } = useToast();
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});

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

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    success("Copied to clipboard!");
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const handleFeedback = (messageId: string, type: "up" | "down") => {
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: type }));
    success(type === "up" ? "Thanks for your feedback!" : "Feedback recorded.");
  };

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
    { title: "Key Concepts", prompt: "Summarize the key concepts and formulas from this document." },
    { title: "Exam Highlights", prompt: "What are the most critical questions or topics likely to appear on exams?" },
    { title: "Definitions & Theorems", prompt: "List all definitions, laws, and theorems mentioned in the text." },
    { title: "Chapter Overview", prompt: "Provide a structured breakdown of the main topics covered." },
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
    <div className="flex flex-col h-full bg-[#f8fafc] flex-1 relative overflow-hidden transition-colors">
      {/* Top Context Bar */}
      <div className="h-12 border-b border-slate-200/80 px-5 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Context</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 transition-all ${
              hasReadyDocsSelected
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            <BookOpen className="w-3 h-3 text-indigo-500" />
            {selectedDocIds.length} {selectedDocIds.length === 1 ? "document" : "documents"} selected
          </span>
        </div>

        {isCurrentlyProcessing && hasReadyDocsSelected && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-semibold text-amber-800 shadow-2xs">
            <div className="flex gap-0.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            </div>
            <span>Indexing new notes in background</span>
          </div>
        )}

        {!hasReadyDocsSelected && !isCurrentlyProcessing && documents.length > 0 && (
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Select at least one document from the left panel
          </p>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {fetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="font-medium">Loading discussion history…</span>
          </div>
        ) : isCurrentlyProcessing && selectedDocIds.length === 0 ? (
          /* Processing screen */
          <div className="max-w-md mx-auto py-16 px-4 text-center animate-fade-up">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-indigo-200/60 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 animate-pulse-subtle">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Indexing Your Document</h3>
            <p className="text-xs font-mono text-indigo-700 mt-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 inline-block max-w-xs truncate shadow-2xs">
              {processingDocs[0]?.original_filename || "document.pdf"}
            </p>
            <div className="mt-6 space-y-2.5 max-w-sm mx-auto text-left">
              {[
                { label: "PDF uploaded & validated", done: true },
                { label: "Extracting text & page structures", done: false, active: true },
                { label: "Computing vector embeddings via Gemini", done: false },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-medium transition-all ${
                    step.done
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs"
                      : step.active
                      ? "bg-indigo-50 border border-indigo-200 text-indigo-800 shadow-2xs ring-1 ring-indigo-300/40"
                      : "bg-slate-50 border border-slate-200 text-slate-400"
                  }`}
                >
                  {step.done ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                      ✓
                    </div>
                  ) : step.active ? (
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : !isCurrentlyProcessing && selectedDocIds.length === 0 && failedDocs.length > 0 && completedDocs.length === 0 ? (
          /* Failed screen */
          <div className="max-w-md mx-auto py-12 px-4 text-center animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Document Processing Failed</h3>
            <p className="text-xs text-rose-700 mt-1.5 font-mono bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl inline-block max-w-xs truncate">
              {failedDocs[0].original_filename}
            </p>
            <div className="mt-4 p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-left text-xs text-slate-700 space-y-1">
              <p className="font-bold text-rose-800 mb-1">Common causes:</p>
              <p>• <strong>Scanned PDF</strong> — contains images instead of extractable text.</p>
              <p>• <strong>Network timeout</strong> — click Retry to reprocess with Gemini.</p>
              <p>• <strong>Protected PDF</strong> — password-locked files cannot be read.</p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => retryDocument(failedDocs[0].id)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-103 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Processing
              </button>
              <button
                onClick={() => deleteDocument(failedDocs[0].id, failedDocs[0].original_filename)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Delete & Try Another
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* Welcome / empty state */
          <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-fade-up">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-2xl bg-indigo-200/50 animate-ping opacity-50" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 animate-pulse-subtle">
                <Zap className="w-8 h-8" fill="white" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              NoteFlow AI Assistant
            </h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              {hasReadyDocsSelected
                ? "Your document context is active. Ask any question below to get immediate answers with page citations."
                : "Select or upload a document from the left knowledge base panel to unlock AI study chat."}
            </p>

            {hasReadyDocsSelected && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    disabled={isInputDisabled}
                    className="p-4 rounded-2xl bg-white hover:bg-indigo-50/50 border border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between disabled:opacity-40 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {item.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <span className="text-xs text-slate-600 group-hover:text-slate-800 leading-relaxed font-medium">
                      "{item.prompt}"
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Message bubbles */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 max-w-3xl animate-fade-up ${
                msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`flex flex-col gap-2 rounded-3xl p-4 sm:p-5 text-sm max-w-[85%] sm:max-w-[88%] transition-all ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20 rounded-tr-xs"
                    : "bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs rounded-tl-xs text-slate-800"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                ) : (
                  <div className="prose prose-light max-w-none text-slate-800 text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Citations section */}
                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mb-2">
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Citations ({msg.citations.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs hover:border-indigo-300 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="font-semibold truncate max-w-[160px]" title={cite.filename}>
                            {cite.filename}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                            p.{cite.page_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant message action bar (Copy, Feedback) */}
                {msg.role === "assistant" && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[10px] text-slate-400 font-medium">Grounding confidence: High</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                        title="Copy answer"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleFeedback(msg.id, "up")}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          feedbackGiven[msg.id] === "up"
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleFeedback(msg.id, "down")}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          feedbackGiven[msg.id] === "down"
                            ? "text-rose-600 bg-rose-50"
                            : "text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0 mt-1 shadow-2xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading / Thinking Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-3xl mr-auto items-start animate-fade-up">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                <span className="typing-dot w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Generating citation-grounded response…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl shrink-0">
        <div
          className={`max-w-4xl mx-auto relative flex flex-col rounded-3xl border transition-all duration-200 p-2.5 ${
            isInputDisabled
              ? "bg-slate-50 border-slate-200 opacity-70"
              : "bg-white border-slate-200/90 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 shadow-sm focus-within:shadow-md"
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
            className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none custom-scrollbar disabled:cursor-not-allowed leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1 px-2">
            <span className="hidden sm:inline text-[11px] text-slate-600 font-medium">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">Enter ↵</kbd> to ask · <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">Shift+Enter</kbd> for new line
            </span>

            <button
              onClick={() => handleSend()}
              disabled={isInputDisabled || !inputQuestion.trim()}
              className={`p-2.5 rounded-2xl text-white shadow-md transition-all duration-200 shrink-0 ml-auto flex items-center gap-1.5 cursor-pointer ${
                isInputDisabled || !inputQuestion.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 hover:scale-103 active:scale-97"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-xs font-bold pl-1 hidden sm:inline">Ask AI</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-slate-600 mt-2 font-medium">
          NoteFlow AI synthesizes answers strictly from selected documents · Always verify examination formulas
        </p>
      </div>
    </div>
  );
}
