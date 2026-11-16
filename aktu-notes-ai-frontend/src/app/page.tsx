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
import { Database, MessageSquare, Loader2, Zap, Sparkles } from "lucide-react";

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
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#f8fafc] text-slate-600 relative overflow-hidden">
        {/* Ambient subtle light glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-200/50 blur-[100px] animate-ambient-1 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-200/50 blur-[100px] animate-ambient-2 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-2xl bg-indigo-400/20 animate-ping opacity-60" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 animate-pulse-subtle">
              <Zap className="w-7 h-7 text-white" fill="white" />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-800 tracking-wider uppercase">Loading NoteFlow AI</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-indigo-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Initializing workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc] text-slate-800 relative selection:bg-indigo-600 selection:text-white">
      {/* Background ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-200/40 blur-[140px] animate-ambient-1" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-200/35 blur-[130px] animate-ambient-2" />
        <div className="absolute bottom-[-10%] left-[25%] w-[550px] h-[550px] rounded-full bg-sky-200/35 blur-[140px] animate-ambient-3" />
        {/* Subtle patterned dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Navigation */}
      <Navbar
        onOpenAuth={openAuth}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        {!isAuthenticated ? (
          <HeroSection onOpenAuth={openAuth} />
        ) : (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* Mobile toggle bar */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm text-xs">
              <button
                onClick={() => { setShowDocsMobile(!showDocsMobile); setShowChatsMobile(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                  showDocsMobile
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Docs ({selectedDocIds.length})
                {processingDocs.length > 0 && (
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin ml-0.5" />
                )}
              </button>
              <button
                onClick={() => { setShowChatsMobile(!showChatsMobile); setShowDocsMobile(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                  showChatsMobile
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Conversations
              </button>
            </div>

            {/* Left: Document Manager */}
            <aside
              className={`${
                showDocsMobile ? "fixed inset-y-14 left-0 z-30 w-80 shadow-2xl shadow-slate-900/15" : "hidden"
              } md:block md:relative md:w-80 h-full shrink-0 border-r border-slate-200/80 bg-white/70 backdrop-blur-xl transition-all duration-300`}
            >
              <DocumentManager />
            </aside>

            {/* Middle: Conversation Sidebar */}
            <aside
              className={`${
                showChatsMobile ? "fixed inset-y-14 right-0 z-30 w-72 shadow-2xl shadow-slate-900/15" : "hidden"
              } lg:block lg:relative lg:w-64 h-full shrink-0 border-r border-slate-200/80 bg-slate-50/60 backdrop-blur-xl transition-all duration-300`}
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
            <section className="flex-1 flex flex-col h-full overflow-hidden bg-white/40 backdrop-blur-md">
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
