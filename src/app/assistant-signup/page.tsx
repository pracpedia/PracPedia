'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, User, Mail, Lock, Phone, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, Star, Shield, Zap, TrendingUp,
  Eye, EyeOff,
} from 'lucide-react';
import { MeshGradientBackground } from '@/components/MeshGradientBackground';

export default function AssistantSignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

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
          if (data.invite.inviteeName) setName(data.invite.inviteeName);
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
    if (!inviteCode || !name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/assistants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inviteCode, name, email, password, phone: phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      if (data.token && data.user) {
        login(data.token, data.user);
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <MeshGradientBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center bg-transparent text-slate-300">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      </>
    );
  }

  // ── SUCCESS STATE ──
  if (success) {
    return (
      <>
        <MeshGradientBackground />
      <div className="relative z-10 min-h-screen bg-transparent flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-[#0d121f]/90 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden"
        >
            {/* ── Success Header ── */}
            <div className="p-8 text-center space-y-6">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold"
              >
                <Sparkles className="w-3 h-3" /> Synergy Handshake Complete
              </motion.div>

              {/* ── Animated SVG: Aurora Wave ── */}
              <div className="relative h-40 flex items-center justify-center">
                <svg width="180" height="160" viewBox="0 0 200 180">
                  <defs>
                    <linearGradient id="auroraG1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                      <stop offset="30%" stopColor="#06b6d4" stopOpacity="1" />
                      <stop offset="70%" stopColor="#8b5cf6" stopOpacity="1" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="auroraG2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="auroraG3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                      <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    <radialGradient id="auroraCore">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Glow core */}
                  <motion.circle
                    cx="100" cy="90" r="50"
                    fill="url(#auroraCore)"
                    animate={{ r: [45, 55, 45], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Wave 1 — primary, slow undulation */}
                  <motion.path
                    d="M 20 90 Q 60 50, 100 90 T 180 90"
                    fill="none"
                    stroke="url(#auroraG1)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    animate={{
                      d: [
                        'M 20 90 Q 60 50, 100 90 T 180 90',
                        'M 20 90 Q 60 130, 100 90 T 180 90',
                        'M 20 90 Q 60 50, 100 90 T 180 90',
                      ],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Wave 2 — secondary, offset timing */}
                  <motion.path
                    d="M 20 90 Q 60 70, 100 90 T 180 90"
                    fill="none"
                    stroke="url(#auroraG2)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    animate={{
                      d: [
                        'M 20 90 Q 60 70, 100 90 T 180 90',
                        'M 20 90 Q 60 110, 100 90 T 180 90',
                        'M 20 90 Q 60 70, 100 90 T 180 90',
                      ],
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Wave 3 — tertiary, gentle shimmer */}
                  <motion.path
                    d="M 20 90 Q 60 80, 100 90 T 180 90"
                    fill="none"
                    stroke="url(#auroraG3)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    animate={{
                      d: [
                        'M 20 90 Q 60 80, 100 90 T 180 90',
                        'M 20 90 Q 60 100, 100 90 T 180 90',
                        'M 20 90 Q 60 80, 100 90 T 180 90',
                      ],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Center dot */}
                  <motion.circle
                    cx="100" cy="90" r="5"
                    fill="#22d3ee"
                    animate={{ r: [3, 7, 3], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Sparkle particles */}
                  {[
                    { cx: 40, cy: 50, delay: 0 },
                    { cx: 160, cy: 50, delay: 0.7 },
                    { cx: 40, cy: 130, delay: 1.4 },
                    { cx: 160, cy: 130, delay: 2.1 },
                  ].map((p, i) => (
                    <motion.circle
                      key={i}
                      cx={p.cx} cy={p.cy} r="1.5"
                      fill="#22d3ee"
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
                    />
                  ))}
                </svg>
              </div>

              {/* Welcome message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Welcome to the Team, {name.split(' ')[0]}!
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  You are now registered as an Assistant to <span className="text-cyan-400 font-bold">{inviteData?.parentArtist?.name}</span> with a <span className="text-cyan-400 font-bold">{inviteData?.defaultSplitPercent}%</span> revenue split.
                </p>
              </motion.div>
            </div>

            {/* ── Smart Contract Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mx-5 mb-5 p-4 rounded-2xl bg-slate-950/60 border border-white/[0.06] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Smart Workspace Contract #{Math.floor(Math.random() * 9000) + 1000}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Active & Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Team Lead</p>
                  <p className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> {inviteData?.parentArtist?.name || 'Artist'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Assistant</p>
                  <p className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> {name || 'You'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Revenue Split</p>
                  <p className="text-cyan-400 font-black">{inviteData?.defaultSplitPercent || 40}% Assistant Share</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Role</p>
                  <p className="text-slate-200 font-bold capitalize">{inviteData?.defaultRole || 'Both'}</p>
                </div>
              </div>
            </motion.div>

            {/* ── CTA Button ── */}
            <div className="p-5 pt-0">
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => router.push('/?view=assistant_dashboard')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 hover:shadow-cyan-500/40"
              >
                <Zap className="w-4 h-4" />
                Enter Assistant Dashboard
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── REGISTRATION FORM (Split Screen) ──
  return (
    <>
      <MeshGradientBackground />
      <div className="relative z-10 min-h-screen bg-transparent flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl bg-[#0d121f]/90 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2"
        >
          {/* ── LEFT PANEL: Invitation Context ── */}
          <div className="p-8 md:p-10 bg-gradient-to-br from-cyan-500/[0.04] to-transparent border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col justify-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold w-fit">
              <Sparkles className="w-3 h-3" /> Assistant Invitation
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Join <span className="text-cyan-400">{inviteData?.parentArtist?.name}</span>'s team
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Complete your registration to start receiving tasks, track your earnings, and collaborate with {inviteData?.parentArtist?.name}.
              </p>
            </div>

            {/* Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.04] space-y-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {inviteData?.parentArtist?.profilePic ? (
                    <img
                      src={inviteData.parentArtist.profilePic}
                      alt={inviteData.parentArtist.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                      {inviteData?.parentArtist?.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d121f]" />
                </div>
                {/* Info */}
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
                {/* Online tag */}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[8px] font-bold text-emerald-300 uppercase tracking-wider shrink-0">
                  Online
                </span>
              </div>
            </div>

            {/* Data Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Split Card */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Default Split</p>
                <p className="text-xl font-black text-white">{inviteData?.defaultSplitPercent || 40}%</p>
                <p className="text-[9px] text-slate-500">of task value</p>
              </div>
              {/* Role Card */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Role</p>
                <p className="text-xl font-black text-cyan-400 capitalize">{inviteData?.defaultRole || 'Both'}</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Registration Form ── */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-xs text-slate-400 mb-6">Use any email address you own.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 block">Full Name</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                    placeholder="e.g. Mahin Ahmed"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password + Phone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 block">Phone (Optional)</label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit" disabled={submitting}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-cyan-500/40"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create Assistant Account
              </button>
            </form>

            {/* Footer Link */}
                        <div className="mt-6 text-center text-[11px] text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => router.replace(`/assistant-login?invite=${inviteCode}`)}
                className="text-cyan-400 hover:underline font-bold inline-flex items-center gap-1"
              >
                Log in instead <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
