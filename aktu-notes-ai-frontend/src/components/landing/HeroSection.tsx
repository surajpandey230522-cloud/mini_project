"use client";

import React from "react";
import { BookOpen, Sparkles, ShieldCheck, FileText, CheckCircle2, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onOpenAuth: (mode: "login" | "register") => void;
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Built for Dr. A.P.J. Abdul Kalam Technical University Students</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
        Chat With Your <br />
        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
          AKTU Notes & Quantum Series
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
        Upload your semester lecture notes, Quantum series question banks, and lab manuals.
        Get instant, exam-ready answers with verified page-number citations powered by Gemini 2.5 Flash.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => onOpenAuth("register")}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenAuth("login")}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all"
        >
          Student Sign In
        </button>
      </div>

      {/* Features Grid */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Quantum & Notes Parsing</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Extracts clear text from AKTU syllabus PDFs, multi-page units, and lecture slides with PyMuPDF.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Exact Page Citations</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Never second-guess an answer. Every response lists the exact filename and original page number.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Isolated & Secure Storage</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Protected with Argon2id hashing, JWT authentication, and user-isolated NeonDB pgvector storage.
          </p>
        </div>
      </div>
    </div>
  );
}

