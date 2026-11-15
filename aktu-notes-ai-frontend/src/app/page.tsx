"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AuthModal } from "@/components/auth/AuthModal";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { FolderOpen, MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // App interaction state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshConvTrigger, setRefreshConvTrigger] = useState(0);

  // Responsive Drawer Toggles for Mobile / Smaller screens
  const [showDocsMobile, setShowDocsMobile] = useState(false);
  const [showChatsMobile, setShowChatsMobile] = useState(false);

  const openAuth = (mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleToggleDocSelect = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = (docIds: string[]) => {
    setSelectedDocIds(docIds);
  };

  const handleClearDocs = () => {
    setSelectedDocIds([]);
  };

  const handleConversationCreated = (newId: string) => {
    setActiveConversationId(newId);
    setRefreshConvTrigger((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse mb-3">
          <span className="text-indigo-400 font-bold text-lg">AI</span>
        </div>
        <p className="text-xs font-medium">Initializing AKTU Notes AI...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
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
            {/* Mobile Bar for toggling panels */}
            <div className="md:hidden absolute top-14 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs">
              <button
                onClick={() => setShowDocsMobile(!showDocsMobile)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                Notes ({selectedDocIds.length})
              </button>
              <button
                onClick={() => setShowChatsMobile(!showChatsMobile)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Chats
              </button>
            </div>

            {/* Left Column: Academic Notes & PDFs Manager */}
            <aside
              className={`${
                showDocsMobile ? "fixed inset-y-16 left-0 z-30 w-80 shadow-2xl" : "hidden"
              } md:block md:relative md:w-80 h-full shrink-0`}
            >
              <DocumentManager
                selectedDocIds={selectedDocIds}
                onToggleSelect={handleToggleDocSelect}
                onSelectAll={handleSelectAllDocs}
                onClearSelection={handleClearDocs}
              />
            </aside>

            {/* Middle Column: Chat Conversations Sidebar */}
            <aside
              className={`${
                showChatsMobile ? "fixed inset-y-16 right-0 z-30 w-72 shadow-2xl" : "hidden"
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

            {/* Right Column: Interactive Chat & RAG QA Area */}
            <section className="flex-1 flex flex-col h-full overflow-hidden">
              <ChatArea
                conversationId={activeConversationId}
                selectedDocIds={selectedDocIds}
                onConversationCreated={handleConversationCreated}
              />
            </section>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
