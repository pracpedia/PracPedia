'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, ArrowRight, Sparkles,
  Star, TrendingUp, Zap,
} from 'lucide-react';
import { MeshGradientBackground } from '@/components/MeshGradientBackground';

export default function AssistantAcceptPage() {
  const { isAuthenticated, isLoading, apiFetch, login } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('invite');
    if (!code) { setError('No invite code found in the URL.'); setLoading(false); return; }
    setInviteCode(code);

    (async () => {
      try {
        const res = await fetch(`/api/assistants/invite/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.valid && data.invite) {
          setInviteData(data.invite);
        } else {
          setError(data.error || 'Invalid or expired invite link.');
        }
      } catch { setError('Failed to load invite details.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleAccept = async () => {
    if (!inviteCode) return;
    setAccepting(true); setError(null);
    try {
      const res = await apiFetch('/api/assistants/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to accept invite.');
      if (data.token && data.user) { login(data.token, data.user); }
      setSuccess(true);
      setTimeout(() => router.push('/?view=assistant_dashboard'), 2500);
    } catch (e: any) { setError(e?.message || 'Could not accept invite.'); }
    finally { setAccepting(false); }
  };

  if (isLoading || loading) {
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
            <div className="p-8 text-center space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold"
              >
                <Sparkles className="w-3 h-3" /> Synergy Handshake Complete
              </motion.div>

              {/* ── Animated SVG: Constellation ── */}
              <div className="relative h-40 flex items-center justify-center">
                <svg width="180" height="160" viewBox="0 0 200 180">
                  <defs>
                    <linearGradient id="constGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <radialGradient id="constCore">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Core glow */}
                  <motion.circle
                    cx="100" cy="90" r="45"
                    fill="url(#constCore)"
                    animate={{ r: [40, 50, 40], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Connection lines — node to center */}
                  <motion.line x1="50" y1="50" x2="100" y2="90" stroke="url(#constGrad)" strokeWidth="1"
                    animate={{ strokeOpacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.line x1="150" y1="50" x2="100" y2="90" stroke="url(#constGrad)" strokeWidth="1"
                    animate={{ strokeOpacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }} />
                  <motion.line x1="50" y1="130" x2="100" y2="90" stroke="url(#constGrad)" strokeWidth="1"
                    animate={{ strokeOpacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1, ease: 'easeInOut' }} />
                  <motion.line x1="150" y1="130" x2="100" y2="90" stroke="url(#constGrad)" strokeWidth="1"
                    animate={{ strokeOpacity: [0.1, 0.5, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1.5, ease: 'easeInOut' }} />

                  {/* Connection lines — node to node (outer ring) */}
                  <motion.line x1="50" y1="50" x2="150" y2="50" stroke="url(#constGrad)" strokeWidth="0.5"
                    animate={{ strokeOpacity: [0.03, 0.2, 0.03] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.line x1="50" y1="130" x2="150" y2="130" stroke="url(#constGrad)" strokeWidth="0.5"
                    animate={{ strokeOpacity: [0.03, 0.2, 0.03] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1, ease: 'easeInOut' }} />
                  <motion.line x1="50" y1="50" x2="50" y2="130" stroke="url(#constGrad)" strokeWidth="0.5"
                    animate={{ strokeOpacity: [0.03, 0.2, 0.03] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }} />
                  <motion.line x1="150" y1="50" x2="150" y2="130" stroke="url(#constGrad)" strokeWidth="0.5"
                    animate={{ strokeOpacity: [0.03, 0.2, 0.03] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1.5, ease: 'easeInOut' }} />

                  {/* Outer nodes */}
                  {[
                    { cx: 50, cy: 50, delay: 0 },
                    { cx: 150, cy: 50, delay: 0.5 },
                    { cx: 50, cy: 130, delay: 1 },
                    { cx: 150, cy: 130, delay: 1.5 },
                  ].map((p, i) => (
                    <motion.circle
                      key={i}
                      cx={p.cx} cy={p.cy} r="3"
                      fill="#22d3ee"
                      animate={{ r: [2, 4, 2], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
                    />
                  ))}

                  {/* Center node */}
                  <motion.circle
                    cx="100" cy="90" r="6"
                    fill="url(#constGrad)"
                    animate={{ r: [4, 8, 4], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </svg>
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome to the Team!</h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                  You are now an Assistant to <span className="text-cyan-400 font-bold">{inviteData?.parentArtist?.name}</span> with a <span className="text-cyan-400 font-bold">{inviteData?.defaultSplitPercent}%</span> revenue split.
                </p>
              </motion.div>
            </div>
            
            <div className="p-5 pt-0">
               <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} onClick={() => router.push('/?view=assistant_dashboard')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 hover:shadow-cyan-500/40">
                <Zap className="w-4 h-4" /> Enter Assistant Dashboard <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // ── ACCEPT FORM (Split Screen) ──
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold w-fit">
              <Sparkles className="w-3 h-3" /> Assistant Invitation
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Join <span className="text-cyan-400">{inviteData?.parentArtist?.name}</span>'s team
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                You've been invited to collaborate. Accept this invitation to start receiving tasks, track your earnings, and work together.
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

          {/* ── RIGHT PANEL: Accept Action ── */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col items-center text-center space-y-6">
              
              {/* ── Premium SVG Animation: Two Nodes Connecting ── */}
              <div className="relative h-40 w-40 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="nodeGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                    <linearGradient id="nodeGradViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <linearGradient id="connectionLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <radialGradient id="nodeGlowCyan">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="nodeGlowViolet">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="mergedGlow">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Background glow — pulses stronger when nodes merge */}
                  <motion.circle
                    cx="100" cy="100" r="60"
                    fill="url(#mergedGlow)"
                    animate={{
                      r: [40, 75, 40],
                      opacity: [0.2, 0.7, 0.2],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />

                  {/* Outer dashed ring — slow rotation (magic aura) */}
                  <motion.circle
                    cx="100" cy="100" r="75"
                    fill="none"
                    stroke="rgba(34, 211, 238, 0.15)"
                    strokeWidth="1"
                    strokeDasharray="3 6"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '100px 100px' }}
                  />
                  <motion.circle
                    cx="100" cy="100" r="60"
                    fill="none"
                    stroke="rgba(168, 85, 247, 0.12)"
                    strokeWidth="1"
                    strokeDasharray="2 5"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '100px 100px' }}
                  />

                  {/* Connecting line — fades in as nodes approach, stays after */}
                  <motion.line
                    x1="40" y1="100" x2="160" y2="100"
                    stroke="url(#connectionLine)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    animate={{
                      strokeOpacity: [0, 0, 1, 1, 1, 0.6, 0],
                      pathLength: [0, 0, 0.5, 1, 1, 1, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.2, 0.4, 0.5, 0.7, 0.85, 1],
                    }}
                  />

                  {/* Pulse ring at moment of connection */}
                  <motion.circle
                    cx="100" cy="100" r="0"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    animate={{
                      r: [0, 0, 0, 35, 50, 0, 0],
                      opacity: [0, 0, 0, 1, 0, 0, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeOut',
                      times: [0, 0.4, 0.45, 0.5, 0.7, 0.85, 1],
                    }}
                  />

                  {/* Left node (Artist) — Cyan, drifts from left to center */}
                  <g>
                    {/* Glow halo */}
                    <motion.circle
                      cx="40" cy="100" r="25"
                      fill="url(#nodeGlowCyan)"
                      animate={{
                        cx: [40, 40, 75, 100, 100, 75, 40],
                        opacity: [0.6, 0.6, 0.8, 0.9, 0.8, 0.6, 0.6],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                    {/* Solid node */}
                    <motion.circle
                      cx="40" cy="100" r="10"
                      fill="url(#nodeGradCyan)"
                      animate={{
                        cx: [40, 40, 75, 100, 100, 75, 40],
                        r: [10, 10, 11, 12, 11, 10, 10],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                    {/* Inner highlight */}
                    <motion.circle
                      cx="40" cy="100" r="4"
                      fill="#cffafe"
                      animate={{
                        cx: [40, 40, 75, 100, 100, 75, 40],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                  </g>

                  {/* Right node (You / Assistant) — Violet, drifts from right to center */}
                  <g>
                    {/* Glow halo */}
                    <motion.circle
                      cx="160" cy="100" r="25"
                      fill="url(#nodeGlowViolet)"
                      animate={{
                        cx: [160, 160, 125, 100, 100, 125, 160],
                        opacity: [0.6, 0.6, 0.8, 0.9, 0.8, 0.6, 0.6],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                    {/* Solid node */}
                    <motion.circle
                      cx="160" cy="100" r="10"
                      fill="url(#nodeGradViolet)"
                      animate={{
                        cx: [160, 160, 125, 100, 100, 125, 160],
                        r: [10, 10, 11, 12, 11, 10, 10],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                    {/* Inner highlight */}
                    <motion.circle
                      cx="160" cy="100" r="4"
                      fill="#f3e8ff"
                      animate={{
                        cx: [160, 160, 125, 100, 100, 125, 160],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        times: [0, 0.3, 0.45, 0.5, 0.7, 0.85, 1],
                      }}
                    />
                  </g>

                  {/* Labels (tiny text below each node's starting position) */}
                  <motion.text
                    x="40" y="130"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#67e8f9"
                    fontWeight="bold"
                    letterSpacing="0.5"
                    animate={{
                      opacity: [1, 1, 0, 0, 0, 1, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.3, 0.45, 0.5, 0.85, 0.95, 1],
                    }}
                  >
                    ARTIST
                  </motion.text>
                  <motion.text
                    x="160" y="130"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#d8b4fe"
                    fontWeight="bold"
                    letterSpacing="0.5"
                    animate={{
                      opacity: [1, 1, 0, 0, 0, 1, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      times: [0, 0.3, 0.45, 0.5, 0.85, 0.95, 1],
                    }}
                  >
                    YOU
                  </motion.text>

                  {/* "CONNECTED" label that appears when nodes merge */}
                  <motion.text
                    x="100" y="148"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#a5f3fc"
                    fontWeight="bold"
                    letterSpacing="1.5"
                    animate={{
                      opacity: [0, 0, 0, 1, 1, 0, 0],
                      scale: [0.8, 0.8, 0.8, 1.1, 1, 0.9, 0.8],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeOut',
                      times: [0, 0.45, 0.5, 0.55, 0.7, 0.85, 1],
                    }}
                  >
                    ✓ CONNECTED
                  </motion.text>

                  {/* Sparkle burst at moment of connection */}
                  {[
                    { cx: 100, cy: 100, dx: 0, dy: -30, delay: 0.5, dur: 1 },
                    { cx: 100, cy: 100, dx: 25, dy: -20, delay: 0.5, dur: 1.1 },
                    { cx: 100, cy: 100, dx: -25, dy: -20, delay: 0.5, dur: 1.2 },
                    { cx: 100, cy: 100, dx: 30, dy: 10, delay: 0.5, dur: 1 },
                    { cx: 100, cy: 100, dx: -30, dy: 10, delay: 0.5, dur: 1.1 },
                    { cx: 100, cy: 100, dx: 20, dy: 25, delay: 0.5, dur: 1.2 },
                    { cx: 100, cy: 100, dx: -20, dy: 25, delay: 0.5, dur: 1 },
                    { cx: 100, cy: 100, dx: 0, dy: 35, delay: 0.5, dur: 1.1 },
                  ].map((p, i) => (
                    <motion.circle
                      key={i}
                      cx={p.cx}
                      cy={p.cy}
                      r="2"
                      fill="#22d3ee"
                      animate={{
                        cx: [p.cx, p.cx + p.dx, p.cx],
                        cy: [p.cy, p.cy + p.dy, p.cy],
                        opacity: [0, 1, 0],
                        scale: [0, 1.2, 0],
                      }}
                      transition={{
                        duration: p.dur,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </svg>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Accept Invitation</h2>
                <p className="text-xs text-slate-400 max-w-xs">
                  {isAuthenticated ? "Confirm your acceptance to join the team and start collaborating." : "You need to be logged in to accept this invitation."}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {isAuthenticated ? (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-cyan-500/40"
                >
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Accept & Join Team
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => router.replace(`/assistant-signup?invite=${inviteCode}`)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-black tracking-wide uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 hover:shadow-cyan-500/40"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create New Account
                  </button>
                  <div className="text-center text-[11px] text-slate-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => router.replace(`/assistant-login?invite=${inviteCode}`)}
                      className="text-cyan-400 hover:underline font-bold"
                    >
                      Log in
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
