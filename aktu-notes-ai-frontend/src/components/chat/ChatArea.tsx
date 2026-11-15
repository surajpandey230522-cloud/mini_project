"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { CitationItem, MessageItem } from "@/types";
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  BookOpen,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  BookmarkCheck,
  HelpCircle,
} from "lucide-react";

interface ChatAreaProps {
  conversationId: string | null;
  selectedDocIds: string[];
  onConversationCreated: (newId: string) => void;
  onOpenDocumentsDrawer?: () => void;
}

export function ChatArea({
  conversationId,
  selectedDocIds,
  onConversationCreated,
  onOpenDocumentsDrawer,
}: ChatAreaProps) {
  const { error, info } = useToast();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load message history when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

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

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputQuestion;
    if (!textToSend.trim() || loading) return;

    if (selectedDocIds.length === 0) {
      error("Please select at least one completed PDF note to query!");
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

      // If this was a new conversation, notify parent so sidebar updates
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
      error(err.message || "Failed to generate answer from Gemini AI.");
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
    "Explain 3NF Normalization with examples from the notes.",
    "What are the most repeated 10-mark questions from Unit 2?",
    "Summarize the key algorithms and definitions covered in this chapter.",
    "Compare and contrast the architectures described on pages 10-15.",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 flex-1 relative overflow-hidden">
      {/* Top Context Bar */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">
            Selected Scope:
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              selectedDocIds.length > 0
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            {selectedDocIds.length} {selectedDocIds.length === 1 ? "PDF" : "PDFs"} active
          </span>
        </div>

        {selectedDocIds.length === 0 && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Select notes in the sidebar to chat
          </p>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
        {fetchingHistory ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mr-2" />
            Loading conversation history...
          </div>
        ) : messages.length === 0 ? (
          /* Empty Chat State */
          <div className="max-w-2xl mx-auto py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/20 mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              AKTU Notes AI Assistant
            </h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Ask questions about your uploaded AKTU notes, Quantum series, or lab manuals. Every answer includes exact PDF page citations.
            </p>

            {/* Quick Prompts */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={selectedDocIds.length === 0}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start gap-2.5 disabled:opacity-40 group"
                >
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="leading-relaxed">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 max-w-3xl ${
                msg.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`flex flex-col gap-2 rounded-2xl p-4 sm:p-5 text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 max-w-[85%]"
                    : "bg-slate-900 border border-slate-800 text-slate-200 max-w-full sm:max-w-[90%]"
                }`}
              >
                {/* Content */}
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-indigo max-w-none text-slate-200 text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Grounded Badge & Citations for Assistant Responses */}
                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Verified Citations from Uploaded Notes:</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cite, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-slate-300 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-medium text-slate-200 truncate max-w-[200px]" title={cite.filename}>
                            {cite.filename}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                            Page {cite.page_number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Spinner during Generation */}
        {loading && (
          <div className="flex gap-3 max-w-3xl mr-auto items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>
                Searching vector embeddings in NeonDB & generating answer with Gemini 2.5 Flash...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="max-w-4xl mx-auto relative flex items-end rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500 transition-colors p-2 shadow-xl">
          <textarea
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
            placeholder={
              selectedDocIds.length > 0
                ? "Ask a question about your selected AKTU notes... (Press Enter to send)"
                : "Select at least one PDF note from the sidebar to ask questions..."
            }
            className="w-full bg-transparent px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none resize-none custom-scrollbar disabled:opacity-50"
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !inputQuestion.trim() || selectedDocIds.length === 0}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 shrink-0 self-end ml-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-500 mt-2">
          Grounded answers backed by Google Gemini 2.5 Flash & NeonDB pgvector. Always verify answers against your university syllabus.
        </p>
      </div>
    </div>
  );
}

