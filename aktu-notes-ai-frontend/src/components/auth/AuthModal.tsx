"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Zap,
  ShieldCheck,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "forgot" | "reset";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, register } = useAuth();
  const { success, error } = useToast();

  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (!isOpen) return null;

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]/\\~`]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  const passwordStrength = [hasMinLength, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  const strengthColor = passwordStrength <= 2 ? "bg-rose-500" : passwordStrength <= 3 ? "bg-amber-500" : "bg-emerald-500";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      success("Welcome back!");
      onClose();
    } catch (err: any) {
      error(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) { error("Please meet all password requirements."); return; }
    setLoading(true);
    try {
      await register({ full_name: fullName, email, password });
      success("Account created! Welcome aboard.");
      onClose();
    } catch (err: any) {
      error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.auth.forgotPassword({ email });
      success(resp.message || "Reset token sent to your email.");
      setMode("reset");
    } catch (err: any) {
      error(err.message || "Could not request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.auth.resetPassword({ token: resetToken, new_password: newPassword });
      success(resp.message || "Password reset! Please sign in.");
      setMode("login");
    } catch (err: any) {
      error(err.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-slate-950 text-sm transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0a0f1e] border border-slate-800/60 p-6 sm:p-8 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo + header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Zap className="w-4.5 h-4.5 text-white" fill="white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create account"}
              {mode === "forgot" && "Reset password"}
              {mode === "reset" && "New password"}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === "login" && "Sign in to access your documents"}
              {mode === "register" && "Start chatting with your documents"}
              {mode === "forgot" && "We'll send a reset token to your email"}
              {mode === "reset" && "Enter your token and choose a new password"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 p-1 mb-5 rounded-xl bg-slate-950/60 border border-slate-800/40">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === m
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="button" onClick={() => setMode("forgot")}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors -mt-2 inline-block">
              Forgot password?
            </button>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* REGISTER */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text" required value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className={`${inputClass} pr-10`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= passwordStrength ? strengthColor : "bg-slate-800"}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                    {[
                      { label: "8+ chars", met: hasMinLength },
                      { label: "Uppercase", met: hasUpper },
                      { label: "Lowercase", met: hasLower },
                      { label: "Number", met: hasDigit },
                      { label: "Symbol", met: hasSpecial },
                    ].map((r) => (
                      <span key={r.label} className={`transition-colors ${r.met ? "text-emerald-400" : "text-slate-600"}`}>
                        {r.met ? "✓" : "○"} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading || !isPasswordValid}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ShieldCheck className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* FORGOT */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Token"}
            </button>
            <button type="button" onClick={() => setMode("login")}
              className="w-full text-center text-xs text-slate-500 hover:text-white transition-colors">
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* RESET */}
        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="text" required value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste reset token from email"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all"
            />
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password" required value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New strong password"
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
            </button>
            <button type="button" onClick={() => setMode("login")}
              className="w-full text-center text-xs text-slate-500 hover:text-white transition-colors">
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
