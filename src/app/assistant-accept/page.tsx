// 'use client';

// import React, { useState, useEffect } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { useRouter } from 'next/navigation';
// import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
// import { motion } from 'framer-motion';

// export default function AssistantAcceptPage() {
//   const { isAuthenticated, isLoading, apiFetch, login } = useAuth();
//   const router = useRouter();
//   const [inviteCode, setInviteCode] = useState<string | null>(null);
//   const [inviteData, setInviteData] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [accepting, setAccepting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   useEffect(() => {
//     if (typeof window === 'undefined') return;
//     const code = new URLSearchParams(window.location.search).get('invite');
//     if (!code) { setError('No invite code found in the URL.'); setLoading(false); return; }
//     setInviteCode(code);

//     (async () => {
//       try {
//         const res = await fetch(`/api/assistants/invite/${encodeURIComponent(code)}`);
//         const data = await res.json().catch(() => ({}));
//         if (res.ok && data.valid && data.invite) {
//           setInviteData(data.invite);
//         } else {
//           setError(data.error || 'Invalid or expired invite link.');
//         }
//       } catch { setError('Failed to load invite details.'); }
//       finally { setLoading(false); }
//     })();
//   }, []);

//   const handleAccept = async () => {
//     if (!inviteCode) return;
//     setAccepting(true); setError(null);
//     try {
//       const res = await apiFetch('/api/assistants/accept', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ code: inviteCode }),
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) throw new Error(data.error || 'Failed to accept invite.');
//       if (data.token && data.user) { login(data.token, data.user); }
//       setSuccess(data.message || 'Invitation accepted successfully!');
//       setTimeout(() => router.push('/?view=assistant_dashboard'), 2000);
//     } catch (e: any) { setError(e?.message || 'Could not accept invite.'); }
//     finally { setAccepting(false); }
//   };

//   if (isLoading || loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[#05070e] text-slate-300">
//         <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#05070e] text-slate-200 p-4">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95, y: 15 }}
//         animate={{ opacity: 1, scale: 1, y: 0 }}
//         className="w-full max-w-md bg-[#0d121f] border border-white/[0.06] rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
//         <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
//         <div className="text-center">
//           <div className="inline-flex p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 mb-3">
//             <Sparkles className="w-6 h-6" />
//           </div>
//           <h1 className="text-xl font-extrabold text-white">Assistant Invitation</h1>
//           <p className="text-xs text-slate-400 mt-1">Join {inviteData?.parentArtist?.name}'s team</p>
//         </div>

//         {error && (
//           <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
//             <AlertCircle className="w-4 h-4 shrink-0" /> {error}
//           </div>
//         )}

//         {success && (
//           <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
//             <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
//           </div>
//         )}

//         {inviteData && !success && (
//           <>
//             <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
//               <div className="flex justify-between"><span className="text-slate-500 text-xs">Invited By</span><span className="text-white text-sm font-bold">{inviteData.parentArtist?.name}</span></div>
//               <div className="flex justify-between"><span className="text-slate-500 text-xs">Default Split</span><span className="text-cyan-300 text-sm font-bold">{inviteData.defaultSplitPercent}%</span></div>
//             </div>

//                         {isAuthenticated ? (
//               <button onClick={handleAccept} disabled={accepting}
//                 className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
//                 {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
//                 Accept Invitation
//               </button>
//             ) : (
//               <div className="space-y-3">
//                 <button 
//                   onClick={() => router.replace(`/assistant-signup?invite=${inviteCode}`)}
//                   className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
//                 >
//                   Create New Account <ArrowRight className="w-4 h-4" />
//                 </button>
//                 <div className="text-center text-[11px] text-slate-500">
//                   Already have an account?{' '}
//                   <button
//                     onClick={() => router.replace(`/assistant-login?invite=${inviteCode}`)}
//                     className="text-cyan-400 hover:underline font-bold"
//                   >
//                     Log in
//                   </button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </motion.div>
//     </div>
//   );
// }




'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, ArrowRight, Sparkles,
  Star, TrendingUp, Zap,
} from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  // ── SUCCESS STATE ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-[#0d121f] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden"
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

            <div className="relative h-40 flex items-center justify-center">
              <svg width="160" height="160" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="handshakeGradSuccess" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <radialGradient id="coreGlowSuccess">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <motion.circle
                  cx="100" cy="100" r="75"
                  fill="none" stroke="url(#handshakeGradSuccess)" strokeWidth="1.5"
                  strokeDasharray="4 8" strokeLinecap="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '100px 100px' }}
                />
                <motion.circle
                  cx="100" cy="100" r="55"
                  fill="none" stroke="url(#handshakeGradSuccess)" strokeWidth="1"
                  strokeDasharray="2 6" strokeLinecap="round" opacity="0.6"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '100px 100px' }}
                />

                <motion.circle
                  cx="100" cy="100" r="35"
                  fill="url(#coreGlowSuccess)"
                  animate={{ r: [30, 40, 30], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                >
                  <path d="M 100 100 L 75 85 Q 65 80 60 90 Q 55 100 65 105 L 80 110" fill="none" stroke="url(#handshakeGradSuccess)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 100 100 L 125 85 Q 135 80 140 90 Q 145 100 135 105 L 120 110" fill="none" stroke="url(#handshakeGradSuccess)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <motion.circle cx="100" cy="100" r="6" fill="#22d3ee" animate={{ r: [4, 8, 4], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
                </motion.g>

                {[
                  { cx: 45, cy: 50, delay: 0 },
                  { cx: 155, cy: 50, delay: 0.5 },
                  { cx: 50, cy: 150, delay: 1 },
                  { cx: 150, cy: 150, delay: 1.5 },
                ].map((p, i) => (
                  <motion.circle key={i} cx={p.cx} cy={p.cy} r="2" fill="#22d3ee" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
                ))}
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
    );
  }

  // ── ACCEPT FORM (Split Screen) ──
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
            
            {/* Premium SVG Animation: Network Connection */}
            <div className="relative h-32 w-32">
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="connectGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <radialGradient id="centerGlow">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Pulsing Core */}
                <motion.circle
                  cx="100" cy="100" r="40"
                  fill="url(#centerGlow)"
                  animate={{ r: [35, 45, 35], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Left Node (Artist) */}
                <motion.circle
                  cx="50" cy="100" r="8"
                  fill="#22d3ee"
                  animate={{ cx: [60, 50, 60] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                
                {/* Right Node (You) */}
                <motion.circle
                  cx="150" cy="100" r="8"
                  fill="#a855f7"
                  animate={{ cx: [140, 150, 140] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Connecting Line */}
                <motion.path
                  d="M 60 100 L 140 100"
                  stroke="url(#connectGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [0, -16] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />

                {/* Orbiting Particle 1 */}
                <motion.circle
                  cx="100" cy="100" r="60"
                  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <motion.circle r="3" fill="#22d3ee">
                  <animateMotion dur="4s" repeatCount="indefinite" path="M 100 40 A 60 60 0 1 1 100 160 A 60 60 0 1 1 100 40" />
                </motion.circle>

                {/* Orbiting Particle 2 */}
                <motion.circle
                  cx="100" cy="100" r="80"
                  fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"
                  strokeDasharray="2 6"
                />
                <motion.circle r="2" fill="#a855f7">
                  <animateMotion dur="6s" repeatCount="indefinite" path="M 100 20 A 80 80 0 1 0 100 180 A 80 80 0 1 0 100 20" />
                </motion.circle>
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
  );
}