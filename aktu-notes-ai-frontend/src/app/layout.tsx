import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { DocumentProvider } from "@/context/DocumentContext";

export const metadata: Metadata = {
  title: "NoteFlow AI — Chat With Your Documents",
  description:
    "AI-powered document assistant that answers your questions with verified page-level citations. Upload any PDF and get instant, grounded answers powered by Google Gemini.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-600 selection:text-white">
        <ToastProvider>
          <AuthProvider>
            <DocumentProvider>{children}</DocumentProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
