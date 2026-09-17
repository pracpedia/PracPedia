'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles, Mail, Lock, ArrowRight, Loader2,
  AlertCircle, Star, TrendingUp, Eye, EyeOff,
} from 'lucide-react';

export default function AssistantLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('invite');
    if (!code) {
      setError('No invite code found in URL.');
      setLoading(false);
      return;
    }
    setInviteCode(code);

    (async () => {
      try {
        const res = await fetch(`/api/assistants/invite/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.valid && data.invite) {
          setInviteData(data.invite);
          if (data.invite.inviteeEmail) setEmail(data.invite.inviteeEmail);
        } else {
          setError(data.error || 'Invalid or expired invite link.');
        }
      } catch {
        setError('Failed to load invite details.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || !email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // 1. Log the user in
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error(loginData.error || 'Invalid credentials.');

      // 2. Save token to localStorage so apiFetch works
      if (typeof window !== 'undefined') {
        localStorage.setItem('png_token', loginData.token);
      }

      // 3. Accept the invitation
      const acceptRes = await fetch('/api/assistants/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`,
        },
        body: JSON.stringify({ code: inviteCode }),
      });
      const acceptData = await acceptRes.json().catch(() => ({}));

      if (!acceptRes.ok) {
        // If invite fails, log them in anyway but show the error
        login(loginData.token, loginData.user);
        throw new Error(acceptData.error || 'Could not accept invite, but you are logged in.');
      }

      // 4. Update context with new token (which has parentArtistId) and redirect
      login(acceptData.token || loginData.token, acceptData.user || loginData.user);
      router.push('/?view=assistant_dashboard');

    } catch (e: any) {
      setError(e?.message || 'Could not complete login.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl bg-[#0d121f] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2"
      >
        {/* ── LEFT PANEL: Invitation Context ── */}
        <div className="p-8 md:p-10 bg-gradient-to-br from-cyan-500/[0.04] to-transparent border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold w-fit">
            <Sparkles className="w-3 h-3" /> Assistant Invitation
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back to <span className="text-cyan-400">{inviteData?.parentArtist?.name}</span>'s team
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Log in to your existing account to accept this invitation and access your Assistant Studio.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.04] space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {inviteData?.parentArtist?.profilePic ? (
                  <img src={inviteData.parentArtist.profilePic} alt={inviteData.parentArtist.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                    {inviteData?.parentArtist?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d121f]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{inviteData?.parentArtist?.name || 'Artist'}</p>
                <p className="text-[10px] text-slate-500">Team Lead & Founder</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> 5.0
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-cyan-400" /> Verified Lead
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[8px] font-bold text-emerald-300 uppercase tracking-wider shrink-0">
                Online
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
              <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Default Split</p>
              <p className="text-xl font-black text-white">{inviteData?.defaultSplitPercent || 40}%</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
              <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Role</p>
              <p className="text-xl font-black text-cyan-400 capitalize">{inviteData?.defaultRole || 'Both'}</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Login Form ── */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <h2 className="text-xl font-bold text-white mb-1">Log in to accept</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your existing PracPedia credentials.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-300 block">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

                        <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-300 block">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-cyan-500/40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Log In & Accept
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => router.replace(`/assistant-signup?invite=${inviteCode}`)}
              className="text-cyan-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              Create one <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}