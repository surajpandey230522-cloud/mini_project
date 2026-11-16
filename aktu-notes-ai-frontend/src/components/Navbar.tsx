"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, KeyRound, ChevronDown, Zap, Sparkles, Shield, Cpu } from "lucide-react";

interface NavbarProps {
  onOpenAuth: (mode?: "login" | "register") => void;
  onOpenChangePassword: () => void;
}

export function Navbar({ onOpenAuth, onOpenChangePassword }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-indigo-500/40">
            <Zap className="w-5 h-5 text-white" fill="white" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              NoteFlow{" "}
              <span className="gradient-text font-black">AI</span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 ml-0.5">
                v2.0
              </span>
            </span>
          </div>
        </div>

        {/* Center status pill with active pulse */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50/90 border border-slate-200/90 text-xs text-slate-600 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            Gemini Engine Online
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-500 font-medium">Page-Level Citations</span>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 text-slate-700 shadow-2xs hover:shadow-sm transition-all duration-200 text-sm font-medium group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-xs transition-transform group-hover:scale-105">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-slate-900 max-w-[120px] truncate">
                    {user.full_name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 max-w-[120px] truncate mt-0.5">
                    Pro Student
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-indigo-600" : ""}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 py-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{user.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenChangePassword();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 rounded-xl flex items-center gap-2.5 transition-all group font-medium cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <KeyRound className="w-3.5 h-3.5" />
                        </div>
                        <span>Change Password</span>
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50/80 rounded-xl flex items-center gap-2.5 transition-all group font-medium cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onOpenAuth("login")}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-all duration-200 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth("register")}
                className="group relative px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
                <span>Get Started</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
