"use client";

import React from "react";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  ArrowRight,
  MessageSquare,
  Layers,
  Zap,
} from "lucide-react";

interface HeroSectionProps {
  onOpenAuth: (mode: "login" | "register") => void;
}

const features = [
  {
    icon: FileText,
    color: "indigo",
    title: "Instant Document Understanding",
    desc: "Upload any PDF and get intelligent answers grounded in your exact content — no hallucinations.",
  },
  {
    icon: MessageSquare,
    color: "violet",
    title: "Cited Page References",
    desc: "Every answer comes with verified citations — exact filenames and page numbers, always.",
  },
  {
    icon: ShieldCheck,
    color: "purple",
    title: "Private & Secure",
    desc: "Your documents live in your personal, isolated workspace. No data is ever shared.",
  },
];

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px] animate-float" />
        <div
          className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px] animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-purple-600/6 blur-[80px] animate-float"
          style={{ animationDelay: "4s" }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold mb-8 animate-fade-up">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Powered by Google Gemini · RAG Architecture</span>
        </div>

        {/* Main Headline */}
        <h1
          className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.05] animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Your Documents,{" "}
          <br className="hidden sm:block" />
          <span className="gradient-text">Answers Instant.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Upload a PDF. Ask anything. Get precise, citation-backed answers from
          your own documents — powered by AI that actually reads and understands
          your content.
        </p>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <button
            onClick={() => onOpenAuth("register")}
            className="group w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.03] hover:-translate-y-0.5 glow-indigo"
          >
            <Sparkles className="w-4 h-4" />
            Start for Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onOpenAuth("login")}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl glass-dark hover:border-slate-600/60 text-slate-200 font-semibold text-sm transition-all hover:text-white"
          >
            Sign In
          </button>
        </div>

        {/* Social proof strip */}
        <p
          className="mt-5 text-xs text-slate-600 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          No credit card required · Your data stays private
        </p>

        {/* Features Grid */}
        <div
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            const colorMap: Record<string, string> = {
              indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
              violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
            };
            return (
              <div
                key={i}
                className="p-5 rounded-2xl glass-dark hover:border-slate-600/60 transition-all group hover:-translate-y-1"
              >
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3.5 ${colorMap[f.color]}`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <h4 className="font-bold text-white text-sm leading-snug">
                  {f.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
