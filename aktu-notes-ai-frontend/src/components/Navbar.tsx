"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, KeyRound, User as UserIcon, ChevronDown, Zap } from "lucide-react";

interface NavbarProps {
  onOpenAuth: (mode?: "login" | "register") => void;
  onOpenChangePassword: () => void;
}

export function Navbar({ onOpenAuth, onOpenChangePassword }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/50 bg-[#030712]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 animate-pulse-glow">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight">
              NoteFlow{" "}
              <span className="gradient-text">AI</span>
            </span>
          </div>
        </div>

        {/* Center status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-700/40 text-[11px] text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-slate-300">AI Online</span>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-slate-700/40 hover:border-indigo-500/40 text-slate-200 transition-all text-sm font-medium"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-sm">
                  {user.full_name.split(" ")[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-dark border border-slate-700/50 shadow-2xl shadow-black/50 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-800/60">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate mt-0.5">{user.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-indigo-500/10 hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                      Change Password
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth("register")}
                className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.03] hover:-translate-y-px"
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
