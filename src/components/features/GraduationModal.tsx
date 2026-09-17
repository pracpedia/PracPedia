'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  GraduationCap,
  Palette,
  PenTool,
  Pen,
  PenLine,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface GraduationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (data: {
    rateDrawingOnly: number;
    rateDrawingWriting: number;
    notebookCost: number;
    specialties: string;
    bio: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

/**
 * GraduationModal — a beautiful modal that lets an Assistant "graduate"
 * to become an Independent Artist on the marketplace.
 *
 * Collects: base rate, writing rate, notebook cost, specialties, bio
 * Calls: PUT /api/profile with { graduateToIndependent: true, ...rates }
 *
 * Includes an animated SVG rocket / graduation cap animation.
 */
export const GraduationModal: React.FC<GraduationModalProps> = ({ open, onClose, onSuccess, onSubmit }) => {
  const [step, setStep] = useState<'intro' | 'form' | 'success'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [rateDrawingOnly, setRateDrawingOnly] = useState(150);
  const [rateDrawingWriting, setRateDrawingWriting] = useState(300);
  const [notebookCost, setNotebookCost] = useState(100);
  const [specialties, setSpecialties] = useState('');
  const [bio, setBio] = useState('');

  const reset = () => {
    setStep('intro');
    setError(null);
    setRateDrawingOnly(150);
    setRateDrawingWriting(300);
    setNotebookCost(100);
    setSpecialties('');
    setBio('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGraduate = async () => {
    if (rateDrawingOnly < 50 || rateDrawingWriting < 100) {
      setError('Base rate must be at least ৳50 and Writing rate at least ৳100.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit({
        rateDrawingOnly,
        rateDrawingWriting,
        notebookCost,
        specialties,
        bio,
      });

      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Could not complete graduation. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not complete graduation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#0d121f] border border-slate-700/70 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative my-auto"
          >
            {/* ── Animated SVG Header ── */}
            <div className="relative h-40 sm:h-48 bg-gradient-to-br from-amber-500/10 via-cyan-500/5 to-transparent border-b border-white/[0.06] overflow-hidden flex items-center justify-center">
              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer z-10 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Animated Graduation Cap SVG */}
              <svg
                width="120"
                height="120"
                viewBox="0 0 200 200"
                className="relative z-0"
              >
                {/* Glow circle */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="60"
                  fill="url(#gradGlow)"
                  animate={{ r: [55, 65, 55], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <defs>
                  <radialGradient id="gradGlow">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="capBody" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>

                {/* Graduation cap - animated floating */}
                <motion.g
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Cap top (mortarboard) */}
                  <polygon
                    points="100,50 160,75 100,100 40,75"
                    fill="#1e293b"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Cap band */}
                  <path
                    d="M 65 85 L 65 110 Q 100 125 135 110 L 135 85"
                    fill="url(#capBody)"
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                  />
                  {/* Tassel */}
                  <motion.line
                    x1="160"
                    y1="75"
                    x2="160"
                    y2="100"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeLinecap="round"
                    animate={{ x2: [160, 165, 160] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.circle
                    cx="160"
                    cy="103"
                    r="4"
                    fill="#fbbf24"
                    animate={{ cy: [103, 108, 103] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.g>

                {/* Sparkles around cap */}
                <motion.g
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <circle cx="50" cy="60" r="2" fill="#22d3ee" />
                </motion.g>
                <motion.g
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <circle cx="150" cy="55" r="2" fill="#fbbf24" />
                </motion.g>
                <motion.g
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                >
                  <circle cx="145" cy="130" r="2" fill="#22d3ee" />
                </motion.g>
              </svg>
            </div>

            {/* ── Content ── */}
            <div className="p-5 sm:p-6 space-y-5">
              {error && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {/* ── Intro Step ── */}
              {step === 'intro' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-extrabold text-white flex items-center justify-center gap-2">
                      <GraduationCap className="w-5 h-5 text-amber-400" />
                      Become an Independent Artist
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You're currently an Assistant. By graduating, you'll appear on the public marketplace,
                      get your own Artist Dashboard, and take direct client orders — while keeping your
                      assistant earnings history.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { icon: TrendingUp, text: 'Get listed on the public marketplace' },
                      { icon: Palette, text: 'Set your own rates for Drawing & Writing' },
                      { icon: CheckCircle2, text: 'Keep your existing assistant earnings' },
                      { icon: Sparkles, text: 'Access both Artist Dashboard + Assistant Studio' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs text-slate-300 font-medium">{item.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-black tracking-wide uppercase shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Set Up My Artist Profile
                  </button>
                </motion.div>
              )}

              {/* ── Form Step ── */}
              {step === 'form' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-extrabold text-white text-center">
                    Set Your Artist Rates
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-300 block flex items-center gap-1">
                        <Pen className="w-3 h-3 text-amber-400" /> Drawing Only (৳ BDT)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={2000}
                        value={rateDrawingOnly}
                        onChange={(e) => setRateDrawingOnly(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-300 block flex items-center gap-1">
                        <PenLine className="w-3 h-3 text-cyan-400" /> Drawing + Writing (৳ BDT)
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={4000}
                        value={rateDrawingWriting}
                        onChange={(e) => setRateDrawingWriting(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950/60 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      Notebook Cost (if you provide) ৳ BDT
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={notebookCost}
                      onChange={(e) => setNotebookCost(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950/60 border border-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      Specialties (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      placeholder="Physics Optics, Biology, Chemistry..."
                      className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      Artist Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 1000))}
                      rows={2}
                      placeholder="Tell students about your drawing precision, pencil grading, and turnaround speed..."
                      className="w-full bg-slate-950/60 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep('intro')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleGraduate}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                      Graduate Now
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Success Step ── */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-flex p-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h2 className="text-lg font-extrabold text-white">You're Now an Independent Artist! 🎉</h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Your profile is now live on the marketplace. You can take direct client orders
                    AND continue working as an assistant.
                  </p>
                  <button
                    type="button"
                    onClick={() => { reset(); onSuccess(); }}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer min-h-[44px]"
                  >
                    Go to Artist Dashboard
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};