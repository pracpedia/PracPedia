// 'use client';

// import React, { useState } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import {
//   X,
//   Loader2,
//   Mail,
//   User as UserIcon,
//   Palette,
//   PenTool,
//   Sparkles,
//   Copy,
//   Check,
//   AlertCircle,
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// interface InviteAssistantModalProps {
//   open: boolean;
//   onClose: () => void;
//   onInvited?: () => void;
// }

// export const InviteAssistantModal: React.FC<InviteAssistantModalProps> = ({ open, onClose, onInvited }) => {
//   const { apiFetch } = useAuth();
//   const [step, setStep] = useState<'form' | 'success'>('form');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [inviteUrl, setInviteUrl] = useState<string | null>(null);
//   const [inviteeName, setInviteeName] = useState('');
//   const [inviteeEmail, setInviteeEmail] = useState('');
//   const [defaultRole, setDefaultRole] = useState<'drawing' | 'writing' | 'both'>('both');
//   const [defaultSplit, setDefaultSplit] = useState(40);
//   const [emailSent, setEmailSent] = useState(false);
//   const [copied, setCopied] = useState(false);

//   const reset = () => {
//     setStep('form');
//     setInviteUrl(null);
//     setError(null);
//     setInviteeName('');
//     setInviteeEmail('');
//     setDefaultRole('both');
//     setDefaultSplit(40);
//     setEmailSent(false);
//     setCopied(false);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!inviteeEmail.trim() || !inviteeEmail.includes('@')) {
//       setError('Please enter a valid email address.');
//       return;
//     }
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await apiFetch('/api/assistants/invite', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           inviteeEmail: inviteeEmail.trim(),
//           inviteeName: inviteeName.trim() || undefined,
//           defaultRole,
//           defaultSplitPercent: Number(defaultSplit),
//         }),
//       });
//       const data = await res.json().catch(() => ({}));
//       if (!res.ok) {
//         throw new Error(data.error || `HTTP ${res.status}`);
//       }
//       setInviteUrl(data.inviteUrl);
//       setEmailSent(!!data.emailSent);
//       setStep('success');
//       onInvited?.();
//     } catch (e: any) {
//       setError(e?.message || 'Could not create invite.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCopy = async () => {
//     if (!inviteUrl) return;
//     try {
//       await navigator.clipboard.writeText(inviteUrl);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//     } catch {
//       // fallback for older browsers
//       const ta = document.createElement('textarea');
//       ta.value = inviteUrl;
//       document.body.appendChild(ta);
//       ta.select();
//       document.execCommand('copy');
//       document.body.removeChild(ta);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//     }
//   };

//   const handleClose = () => {
//     reset();
//     onClose();
//   };

//   return (
//     <AnimatePresence>
//       {open && (
//         <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
//           <motion.div
//             initial={{ opacity: 0, scale: 0.95, y: 15 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.95, y: 15 }}
//             className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d121f] border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative my-auto"
//           >
//             {/* Header */}
//             <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
//               <div className="flex items-center gap-2 min-w-0">
//                 <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
//                   <Sparkles className="w-4 h-4" />
//                 </div>
//                 <div className="min-w-0">
//                   <h3 className="text-sm font-extrabold text-white truncate">Invite Assistant</h3>
//                   <p className="text-[10px] text-slate-400 truncate">Add a collaborator to your team</p>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={handleClose}
//                 className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
//                 aria-label="Close"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             {/* Error */}
//             {error && (
//               <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
//                 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
//                 <span className="break-words">{error}</span>
//               </div>
//             )}

//             {/* Form step */}
//             {step === 'form' && (
//               <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-bold text-slate-300 block">
//                     Assistant Name <span className="text-slate-500">(optional)</span>
//                   </label>
//                   <div className="relative flex items-center">
//                     <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
//                     <input
//                       type="text"
//                       value={inviteeName}
//                       onChange={(e) => setInviteeName(e.target.value)}
//                       placeholder="e.g. Mahin Ahmed"
//                       maxLength={100}
//                       className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
//                     />
//                   </div>
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-bold text-slate-300 block">
//                     Assistant Email <span className="text-rose-400">*</span>
//                   </label>
//                   <div className="relative flex items-center">
//                     <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
//                     <input
//                       type="email"
//                       required
//                       value={inviteeEmail}
//                       onChange={(e) => setInviteeEmail(e.target.value)}
//                       placeholder="assistant@gmail.com"
//                       className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
//                     />
//                   </div>
//                   <p className="text-[10px] text-slate-500 leading-relaxed">
//                     The assistant must sign up with this exact email address.
//                   </p>
//                 </div>

//                 <div className="space-y-1.5">
//                   <label className="text-[10px] font-bold text-slate-300 block">Default Role</label>
//                   <div className="grid grid-cols-3 gap-1.5">
//                     {([
//                       { val: 'drawing', label: 'Drawing', icon: Palette },
//                       { val: 'writing', label: 'Writing', icon: PenTool },
//                       { val: 'both', label: 'Both', icon: Sparkles },
//                     ] as const).map((opt) => {
//                       const Icon = opt.icon;
//                       const isActive = defaultRole === opt.val;
//                       return (
//                         <button
//                           key={opt.val}
//                           type="button"
//                           onClick={() => setDefaultRole(opt.val)}
//                           className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer inline-flex flex-col items-center gap-1 ${
//                             isActive
//                               ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
//                               : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
//                           }`}
//                         >
//                           <Icon className="w-4 h-4" />
//                           {opt.label}
//                         </button>
//                       );
//                     })}
//                   </div>
//                   <p className="text-[10px] text-slate-500">Can be overridden per-task.</p>
//                 </div>

//                 <div className="space-y-1.5">
//                   <div className="flex items-center justify-between gap-2">
//                     <label className="text-[10px] font-bold text-slate-300 block">Default Split %</label>
//                     <span className="text-[11px] font-mono text-cyan-400 font-bold">{defaultSplit}%</span>
//                   </div>
//                   <input
//                     type="range"
//                     min={5}
//                     max={90}
//                     step={5}
//                     value={defaultSplit}
//                     onChange={(e) => setDefaultSplit(Number(e.target.value))}
//                     className="w-full accent-cyan-500 cursor-pointer"
//                   />
//                   <p className="text-[10px] text-slate-500 leading-relaxed">
//                     Default share of each task's price. Can be adjusted per-task when assigning.
//                   </p>
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={loading || !inviteeEmail.trim()}
//                   className="w-full py-3 rounded-xl text-xs font-black tracking-wide uppercase bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
//                 >
//                   {loading ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Creating Invite…
//                     </>
//                   ) : (
//                     <>Create Invite Link</>
//                   )}
//                 </button>
//               </form>
//             )}

//             {/* Success step */}
//             {step === 'success' && inviteUrl && (
//               <div className="mt-4 space-y-4">
//                 <div className="text-center py-3">
//                   <div className="inline-flex p-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3">
//                     <Check className="w-6 h-6" />
//                   </div>
//                   <h3 className="text-sm font-bold text-white">Invite Created!</h3>
//                   <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
//                     {emailSent
//                       ? `An email was sent to ${inviteeEmail}. The assistant can click the link to sign up.`
//                       : `Share this link with ${inviteeEmail} via WhatsApp, Messenger, or email.`}
//                   </p>
//                 </div>

//                 <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-2">
//                   <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Invite Link</p>
//                   <div className="flex items-center gap-2">
//                     <code className="flex-1 text-[10px] sm:text-xs text-cyan-300 font-mono break-all bg-slate-900/60 p-2 rounded-lg border border-white/5">
//                       {inviteUrl}
//                     </code>
//                     <button
//                       type="button"
//                       onClick={handleCopy}
//                       className={`shrink-0 p-2.5 rounded-lg border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
//                         copied
//                           ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
//                           : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:border-white/20'
//                       }`}
//                       title={copied ? 'Copied!' : 'Copy link'}
//                     >
//                       {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
//                     </button>
//                   </div>
//                 </div>

//                 <div className="p-3 bg-amber-500/[0.04] border border-amber-500/15 rounded-xl">
//                   <p className="text-[10px] text-amber-300/90 leading-relaxed">
//                     ⚠️ This link expires in 7 days. The assistant must sign up using the email you entered: <strong>{inviteeEmail}</strong>
//                   </p>
//                 </div>

//                 <button
//                   type="button"
//                   onClick={handleClose}
//                   className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-white/10 text-slate-200 hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
//                 >
//                   Done
//                 </button>
//               </div>
//             )}
//           </motion.div>
//         </div>
//       )}
//     </AnimatePresence>
//   );
// };


// 



'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Loader2, Mail, User as UserIcon, Palette, PenTool, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InviteAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

export const InviteAssistantModal: React.FC<InviteAssistantModalProps> = ({ open, onClose, onInvited }) => {
  const { apiFetch } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [defaultRole, setDefaultRole] = useState<'drawing' | 'writing' | 'both'>('both');
  const [defaultSplit, setDefaultSplit] = useState(40);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep('form'); setInviteUrl(null); setError(null);
    setInviteeName(''); setInviteeEmail(''); setDefaultRole('both');
    setDefaultSplit(40); setEmailSent(false); setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await apiFetch('/api/assistants/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteeEmail: inviteeEmail.trim() || undefined,
          inviteeName: inviteeName.trim() || undefined,
          defaultRole, defaultSplitPercent: Number(defaultSplit),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setInviteUrl(data.inviteUrl);
      setEmailSent(!!data.emailSent);
      setStep('success');
      onInvited?.();
    } catch (e: any) {
      setError(e?.message || 'Could not create invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteUrl; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d121f] border border-slate-700/70 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate">Invite Assistant</h3>
                  <p className="text-[10px] text-slate-400 truncate">Add a collaborator to your team</p>
                </div>
              </div>
              <button type="button" onClick={handleClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {step === 'form' && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 block">Assistant Name <span className="text-slate-500">(optional)</span></label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input type="text" value={inviteeName} onChange={(e) => setInviteeName(e.target.value)} placeholder="e.g. Mahin Ahmed" maxLength={100}
                      className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 block">Assistant Email <span className="text-slate-500">(optional — for automated email)</span></label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input type="email" value={inviteeEmail} onChange={(e) => setInviteeEmail(e.target.value)} placeholder="assistant@gmail.com"
                      className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">If provided, Brevo sends an invite email automatically. Otherwise, share the link manually.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-300 block">Default Role</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([{ val: 'drawing', label: 'Drawing', icon: Palette }, { val: 'writing', label: 'Writing', icon: PenTool }, { val: 'both', label: 'Both', icon: Sparkles }] as const).map((opt) => {
                      const Icon = opt.icon;
                      const isActive = defaultRole === opt.val;
                      return (
                        <button key={opt.val} type="button" onClick={() => setDefaultRole(opt.val)}
                          className={`p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer inline-flex flex-col items-center gap-1 ${isActive ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                          <Icon className="w-4 h-4" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-300 block">Default Split %</label>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">{defaultSplit}%</span>
                  </div>
                  <input type="range" min={5} max={90} step={5} value={defaultSplit} onChange={(e) => setDefaultSplit(Number(e.target.value))} className="w-full accent-cyan-500 cursor-pointer" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-xs font-black tracking-wide uppercase bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Invite…</> : <>Create Invite Link</>}
                </button>
              </form>
            )}

            {step === 'success' && inviteUrl && (
              <div className="mt-4 space-y-4">
                <div className="text-center py-3">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3"><Check className="w-6 h-6" /></div>
                  <h3 className="text-sm font-bold text-white">Invite Created!</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {emailSent ? `An email was sent automatically via Brevo.` : `Share this link via WhatsApp, Messenger, or email.`}
                  </p>
                </div>
                <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] sm:text-xs text-cyan-300 font-mono break-all bg-slate-900/60 p-2 rounded-lg border border-white/5">{inviteUrl}</code>
                    <button type="button" onClick={handleCopy}
                      className={`shrink-0 p-2.5 rounded-lg border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${copied ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:border-white/20'}`}
                      title={copied ? 'Copied!' : 'Copy link'}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/[0.04] border border-amber-500/15 rounded-xl">
                  <p className="text-[10px] text-amber-300/90 leading-relaxed">⚠️ Expires in 7 days. Works for new users AND existing logged-in users.</p>
                </div>
                <button type="button" onClick={handleClose} className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-white/10 text-slate-200 hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]">Done</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};