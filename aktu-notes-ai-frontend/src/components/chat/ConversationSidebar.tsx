"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ConversationItem } from "@/types";
import { MessageSquare, Plus, Trash2, Loader2, Search, Sparkles } from "lucide-react";

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  refreshTrigger: number;
}

export function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  refreshTrigger,
}: ConversationSidebarProps) {
  const { error, success } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const resp = await api.chats.listConversations(0, 50);
      setConversations(resp || []);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.chats.deleteConversation(conversationId);
      success("Chat deleted.");
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        onSelectConversation(null);
      }
    } catch (err: any) {
      error(err.message || "Failed to delete.");
    }
  };

  // Client-side search for conversations
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations;
    return conversations.filter((c) =>
      (c.title || "Untitled Chat").toLowerCase().includes(searchFilter.toLowerCase().trim())
    );
  }, [conversations, searchFilter]);

  return (
    <div className="flex flex-col h-full bg-slate-50/70 backdrop-blur-xl border-r border-slate-200/80 p-3.5 w-64 shrink-0 transition-colors">
      {/* New Chat Button */}
      <button
        onClick={() => onSelectConversation(null)}
        className="group relative w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
      >
        <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
        <span>New Conversation</span>
      </button>

      {/* Filter chats input if more than 4 */}
      {conversations.length > 4 && (
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter chats..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-all"
          />
        </div>
      )}

      {/* Section Header */}
      <div className="mt-4 px-1.5 flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">
          Recent Discussions
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
        {conversations.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-600">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-600">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No chats yet</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Start a new query anytime</p>
          </div>
        ) : filteredConversations.length === 0 && searchFilter ? (
          <div className="text-center py-6 text-slate-600 text-xs">
            No chats match "{searchFilter}"
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all duration-200 ${
                  isActive
                    ? "bg-white text-indigo-950 font-bold border border-indigo-200/90 shadow-xs"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900 border border-transparent hover:border-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                      isActive
                        ? "bg-indigo-600 shadow-xs shadow-indigo-500 scale-110"
                        : "bg-slate-300 group-hover:bg-slate-400"
                    }`}
                  />
                  <span className="truncate">
                    {conv.title || "Untitled Discussion"}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
