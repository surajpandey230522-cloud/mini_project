"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, LogOut, KeyRound, User as UserIcon, CheckCircle2, ChevronDown } from "lucide-react";

interface NavbarProps {
  onOpenAuth: (mode?: "login" | "register") => void;
  onOpenChangePassword: () => void;
}

export function Navbar({ onOpenAuth, onOpenChangePassword }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">AKTU Notes AI</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                v1.0 RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Chat with Quantum & Lecture Notes</p>
          </div>
        </div>

        {/* Center: Live Backend Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-400">Backend:</span>
          <span className="font-mono text-emerald-400 text-[11px]">Render + NeonDB (pgvector)</span>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition-all text-sm font-medium"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline max-w-[140px] truncate">{user.full_name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-20 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-800/80">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/70 hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      Change Password
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth("login")}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth("register")}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

