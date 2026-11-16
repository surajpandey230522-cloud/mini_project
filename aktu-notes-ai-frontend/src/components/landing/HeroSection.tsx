"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  ArrowRight,
  MessageSquare,
  Zap,
  CheckCircle2,
  BookmarkCheck,
  Bot,
  User as UserIcon,
  Search,
  BookOpen,
} from "lucide-react";

interface HeroSectionProps {
  onOpenAuth: (mode: "login" | "register") => void;
}

const features = [
  {
    icon: FileText,
    accent: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 text-blue-600 border-blue-200/60",
    title: "Instant PDF Understanding",
    desc: "Upload standard syllabus, exam notes, textbooks or research papers. Extracts and indexes complex concepts instantly.",
    stat: "Up to 100+ pages",
  },
  {
    icon: BookmarkCheck,
    accent: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50 text-indigo-600 border-indigo-200/60",
    title: "Exact Page Citations",
    desc: "Every claim cites precise page numbers and file names so you can cross-verify without second-guessing.",
    stat: "100% Grounded",
  },
  {
    icon: ShieldCheck,
    accent: "from-purple-500 to-pink-600",
    bgLight: "bg-purple-50 text-purple-600 border-purple-200/60",
    title: "Isolated & Private",
    desc: "Your uploaded notes remain completely segregated within your account. No public leaks or training.",
    stat: "Encrypted & Secure",
  },
];

const demoTabs = [
  {
    id: "q1",
    label: "Operating Systems",
    question: "Explain the difference between Paging and Segmentation.",
    answer:
      "**Paging** divides physical memory into fixed-size blocks called frames and logical memory into pages of the same size, eliminating external fragmentation.\n\n**Segmentation** divides memory into variable-sized logical units (e.g., functions, arrays, objects) corresponding to a programmer's view of memory.",
    citation: { doc: "OS_Unit_3_Notes.pdf", page: 14 },
  },
  {
    id: "q2",
    label: "Data Structures",
    question: "What is the time complexity of AVL tree rotations?",
    answer:
      "AVL tree rotations (Single LL, RR and Double LR, RL) operate in **O(1)** constant time because only a constant number of pointer references are updated.",
    citation: { doc: "DSA_Exam_Summary.pdf", page: 28 },
  },
  {
    id: "q3",
    label: "Computer Networks",
    question: "How does TCP 3-way handshake work?",
    answer:
      "The 3-way handshake establishes a reliable TCP connection:\n1. **SYN**: Client sends SYN segment with initial sequence number `ISN(c)`.\n2. **SYN-ACK**: Server acknowledges with `ISN(c) + 1` and sends its `ISN(s)`.\n3. **ACK**: Client acknowledges with `ISN(s) + 1`.",
    citation: { doc: "Computer_Networks_Module2.pdf", page: 42 },
  },
];

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
  const [activeDemoTab, setActiveDemoTab] = useState(0);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-start overflow-y-auto px-4 sm:px-6 py-10 sm:py-16 custom-scrollbar w-full">
      {/* Radiant ambient mesh orbs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-indigo-200/40 via-purple-200/40 to-pink-200/30 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-6 shadow-2xs hover:shadow-xs transition-all duration-300 hover:scale-102 cursor-default animate-fade-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />
          <span>Powered by Google Gemini · RAG Architecture</span>
        </div>

        {/* Main Headline */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.08] animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Study Smarter.{" "}
          <br className="hidden sm:block" />
          <span className="gradient-text">Instant Answers From Your Notes.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          Upload your AKTU syllabi, lecture notes, or reference PDFs. Ask any complex
          question and get direct, verified answers with exact page citations in seconds.
        </p>

        {/* CTAs */}
        <div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <button
            onClick={() => onOpenAuth("register")}
            className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-600/35 hover:-translate-y-1 active:translate-y-0 active:scale-98 glow-indigo cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span>Get Started for Free</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
          </button>

          <button
            onClick={() => onOpenAuth("login")}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-indigo-300 text-slate-800 font-bold text-sm shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer"
          >
            Sign In to Workspace
          </button>
        </div>

        {/* Feature badges row */}
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>No credit card required</span>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Instant PDF indexing</span>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Strict zero-hallucination policy</span>
          </div>
        </div>

        {/* Interactive Live Demo Preview Box */}
        <div
          className="mt-12 w-full max-w-3xl rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-indigo-950/5 p-4 sm:p-6 text-left animate-fade-up"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Interactive Preview</p>
                <p className="text-[11px] text-slate-500">Click a subject to test simulated citation answering</p>
              </div>
            </div>

            {/* Interactive demo tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              {demoTabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDemoTab(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeDemoTab === idx
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive simulated chat dialogue */}
          <div className="mt-4 space-y-4">
            {/* User prompt preview */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[85%]">
                {demoTabs[activeDemoTab].question}
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Assistant response preview */}
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 max-w-[90%] shadow-2xs">
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {demoTabs[activeDemoTab].answer}
                </p>

                {/* Verified citation preview pill */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3" />
                    Verified Source:
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs">
                    <FileText className="w-3 h-3 text-indigo-600" />
                    <span className="truncate max-w-[150px]">{demoTabs[activeDemoTab].citation.doc}</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                      p.{demoTabs[activeDemoTab].citation.page}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Cards Grid */}
        <div
          className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left w-full max-w-4xl animate-fade-up pb-10"
          style={{ animationDelay: "0.6s" }}
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-950/5 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${f.bgLight}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {f.stat}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
                    {f.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 gap-1">
                  <span>Explore feature</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
