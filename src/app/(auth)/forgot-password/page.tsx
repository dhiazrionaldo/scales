"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, Check, ArrowLeft } from "lucide-react";
import Image from "next/image"
import logo from '@/asset/ico.png';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
      setEmail("");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Gradient background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Reset password card */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo/Header */}
          <div className="space-y-2 text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Image src={logo} alt="" className="h-5 w-5" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">SCALES</h1>
            <p className="text-slate-400 text-sm">Reset your password</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-4 text-sm text-emerald-400 mb-6 flex items-start gap-3">
              <Check size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-xs text-emerald-300 mt-1">We&apos;ve sent password reset instructions to your email address</p>
              </div>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium hover:from-emerald-700 hover:to-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Mail size={18} />
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm transition">
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 SCALES. All rights reserved.
        </p>
      </div>
    </div>
  );
}
