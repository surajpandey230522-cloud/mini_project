"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { ConversationItem } from "@/types";
import { MessageSquare, Plus, Trash2, Clock, Loader2 } from "lucide-react";

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
    if (!confirm("Are you sure you want to delete this chat session?")) return;

    try {
      await api.chats.deleteConversation(conversationId);
      success("Conversation deleted.");
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        onSelectConversation(null);
      }
    } catch (err: any) {
      error(err.message || "Failed to delete conversation.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/40 border-r border-slate-800/80 p-3 w-64 shrink-0">
      {/* New Chat Button */}
      <button
        onClick={() => onSelectConversation(null)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
      >
        <Plus className="w-4 h-4" />
        New Chat
      </button>

      {/* Conversations List Header */}
      <div className="mt-4 px-2 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <span>Recent Chats</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
      </div>

      {/* Conversations List */}
      <div className="mt-2 flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {conversations.length === 0 && !loading ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <MessageSquare className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
            No previous chats
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? "bg-slate-800/90 text-white font-medium border border-slate-700/80"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-indigo-400" : "text-slate-500"
                    }`}
                  />
                  <span className="truncate">{conv.title || "Untitled Chat"}</span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  title="Delete chat"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all shrink-0 ml-1"
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

