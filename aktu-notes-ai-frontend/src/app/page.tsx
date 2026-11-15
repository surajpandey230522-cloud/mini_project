"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/context/DocumentContext";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AuthModal } from "@/components/auth/AuthModal";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { Database, MessageSquare, Loader2, Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedDocIds, processingDocs } = useDocuments();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshConvTrigger, setRefreshConvTrigger] = useState(0);

  const [showDocsMobile, setShowDocsMobile] = useState(false);
  const [showChatsMobile, setShowChatsMobile] = useState(false);

  const openAuth = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleConversationCreated = (newId: string) => {
    setActiveConversationId(newId);
    setRefreshConvTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#030712] text-slate-400">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-2xl bg-indigo-600/15 animate-pulse" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Zap className="w-6 h-6 text-white" fill="white" />
          </div>
        </div>
        <p className="text-xs text-slate-600 font-medium tracking-wider uppercase">Loading NoteFlow AI</p>
        <Loader2 className="w-4 h-4 animate-spin text-indigo-500/50 mt-3" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#030712]">
      {/* Top Navigation */}
      <Navbar
        onOpenAuth={openAuth}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden relative">
        {!isAuthenticated ? (
          <HeroSection onOpenAuth={openAuth} />
        ) : (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* Mobile toggle bar */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-[#030712]/90 border-b border-slate-800/40 text-xs">
              <button
                onClick={() => { setShowDocsMobile(!showDocsMobile); setShowChatsMobile(false); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  showDocsMobile ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-900/60 text-slate-400 border border-slate-800/40"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Docs ({selectedDocIds.length})
                {processingDocs.length > 0 && (
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin ml-0.5" />
                )}
              </button>
              <button
                onClick={() => { setShowChatsMobile(!showChatsMobile); setShowDocsMobile(false); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  showChatsMobile ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-900/60 text-slate-400 border border-slate-800/40"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chats
              </button>
            </div>

            {/* Left: Document Manager */}
            <aside
              className={`${
                showDocsMobile ? "fixed inset-y-14 left-0 z-30 w-80 shadow-2xl shadow-black/60" : "hidden"
              } md:block md:relative md:w-80 h-full shrink-0`}
            >
              <DocumentManager />
            </aside>

            {/* Middle: Conversation Sidebar */}
            <aside
              className={`${
                showChatsMobile ? "fixed inset-y-14 right-0 z-30 w-72 shadow-2xl shadow-black/60" : "hidden"
              } lg:block lg:relative lg:w-64 h-full shrink-0`}
            >
              <ConversationSidebar
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => {
                  setActiveConversationId(id);
                  setShowChatsMobile(false);
                }}
                refreshTrigger={refreshConvTrigger}
              />
            </aside>

            {/* Right: Chat Area */}
            <section className="flex-1 flex flex-col h-full overflow-hidden">
              <ChatArea
                conversationId={activeConversationId}
                onConversationCreated={handleConversationCreated}
              />
            </section>
          </div>
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
