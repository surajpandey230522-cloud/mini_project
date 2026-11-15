"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ConversationItem } from "@/types";
import { MessageSquare, Plus, Trash2, Loader2 } from "lucide-react";

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
    if (!confirm("Delete this chat?")) return;
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

  return (
    <div className="flex flex-col h-full bg-[#030712]/60 border-r border-slate-800/50 p-3 w-64 shrink-0">
      {/* New Chat Button */}
      <button
        onClick={() => onSelectConversation(null)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:-translate-y-px"
      >
        <Plus className="w-3.5 h-3.5" />
        New Chat
      </button>

      {/* Section Header */}
      <div className="mt-5 px-1 flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Recent
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-500/60" />}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
        {conversations.length === 0 && !loading ? (
          <div className="text-center py-10 text-slate-600">
            <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-30" />
            <p className="text-[11px]">No chats yet</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600/15 text-white border border-indigo-500/30"
                    : "text-slate-500 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                      isActive ? "bg-indigo-400" : "bg-slate-700 group-hover:bg-slate-500"
                    }`}
                  />
                  <span className="truncate font-medium">
                    {conv.title || "Untitled Chat"}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Delete"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800/60 transition-all shrink-0 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
