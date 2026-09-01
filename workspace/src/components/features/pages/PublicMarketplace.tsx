'use client';

/**
 * PublicMarketplace — a no-auth browsing view of the STEM illustrator
 * marketplace. Fetches `/api/artists` (a public GET endpoint that requires
 * no authentication) and renders a premium dark grid of artist cards.
 *
 * Visitors who have not signed in can browse freely. Each card's "Hire"
 * button is replaced with a "Sign up to hire" CTA that opens a
 * RegistrationPrompt modal; confirming it calls the parent's `onRegister`
 * prop (which opens the AuthPage in register mode).
 *
 * A header carries a "Back to home" button (→ onBack) and a "Sign up free"
 * button (→ onRegister). The footer mirrors the landing page footer
 * aesthetic.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Check,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  Pen,
  PenLine,
  X,
  UserPlus,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/features/Logo';

interface PublicArtist {
  id: string;
  name: string;
  email: string;
  profilePic: string;
  bio: string;
  role: 'artist';
  rateDrawingOnly: number;
  rateDrawingWriting: number;
  notebookCost: number;
  specialties: string[];
  isAvailable: boolean;
  rating: number;
  completedOrders: number;
  phoneNumber?: string;
}

interface PublicMarketplaceProps {
  onRegister: () => void;
  onBack: () => void;
}

/* ---------------- helpers ---------------- */

const avatarUrl = (a: PublicArtist): string => {
  if (a.profilePic && a.profilePic.trim()) return a.profilePic;
  const seed = encodeURIComponent(a.name || a.id);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e293b,0f172a,f59e0b,312e81&textColor=ffffff`;
};

const avatarInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};

const fmtRating = (r: any): string => {
  const n = typeof r === 'number' ? r : Number(r ?? 0);
  if (!isFinite(n)) return '0.0';
  return n.toFixed(1);
};

const fmtPrice = (v: any): string => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  if (!isFinite(n)) return '0';
  return String(n);
};

/* ---------------- PublicMarketplace ---------------- */

export const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({ onRegister, onBack }) => {
  const [artists, setArtists] = useState<PublicArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/artists')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load marketplace'))))
      .then((data: PublicArtist[]) => {
        if (cancelled) return;
        setArtists(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || 'Could not load the marketplace.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHireClick = () => setPromptOpen(true);

  const handleConfirmRegister = () => {
    setPromptOpen(false);
    onRegister();
  };

  return (
    <div className="w-full min-h-screen text-slate-200 bg-[#05070e] relative font-sans flex flex-col overflow-y-auto overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Ambient gradient orb (matches LandingPage) */}
      <div
        aria-hidden
        className="absolute top-[-15%] left-[-10%] w-[85%] h-[80%] rounded-full bg-gradient-to-br from-cyan-950/25 via-indigo-950/15 to-purple-950/10 blur-[180px] pointer-events-none select-none"
        style={{ animation: 'pp-orb-drift 20s ease-in-out infinite' }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#060814]/70 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[40px] shrink-0"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="hidden md:block w-px h-6 bg-white/10 shrink-0" />
            <div className="hidden md:block shrink-0">
              <Logo size="lg" />
            </div>
            <div className="md:hidden shrink-0">
              <Logo size="md" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRegister}
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/20 transition-colors cursor-pointer min-h-[40px]"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Sign up free</span>
              <span className="sm:hidden">Sign up</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
        {/* Heading */}
        <div className="space-y-3 mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Browse our{' '}
            <span
              aria-hidden
              style={{
                background: 'linear-gradient(90deg, #fbbf24 0%, #fb923c 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              STEM illustrators
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            Preview the verified Bangladeshi notebook illustrators below. To commission a drawing or
            send a request, sign up for a free account — it takes seconds.
          </p>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-950/60 border border-white/10 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-slate-800 rounded" />
                    <div className="h-2 w-1/3 bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded mb-2" />
                <div className="h-2 w-2/3 bg-slate-800 rounded mb-4" />
                <div className="h-9 w-full bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-6 sm:p-8 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-semibold mb-1">
              Couldn&apos;t load the marketplace
            </p>
            <p className="text-xs text-slate-500 font-mono">{error}</p>
            <button
              onClick={onBack}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && artists.length === 0 && (
          <div className="rounded-2xl bg-slate-950/40 border border-dashed border-white/10 p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400 font-medium">
              No illustrators have joined the marketplace yet.
            </p>
            <p className="text-[11px] text-slate-600 mt-1 font-mono">Please check back later.</p>
          </div>
        )}

        {/* Artist grid */}
        {!loading && !error && artists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {artists.map((a, i) => (
              <motion.article
                key={a.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="relative rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md p-5 flex flex-col gap-4 hover:border-white/20 hover:-translate-y-0.5 transition-all"
              >
                {/* Top: avatar + name + rating */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-white/10 shrink-0">
                    <AvatarImage src={avatarUrl(a)} alt={a.name} />
                    <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                      {avatarInitials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{a.name}</span>
                      {a.isAvailable && (
                        <BadgeCheck
                          className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                          aria-label="Available"
                        />
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold mt-0.5 flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-400" />
                      {fmtRating(a.rating)}
                      <span className="text-slate-600">·</span>
                      <span>{a.completedOrders ?? 0} orders</span>
                    </p>
                  </div>
                </div>

                {/* Bio */}
                {a.bio && (
                  <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-2">{a.bio}</p>
                )}

                {/* Specialties */}
                {a.specialties && a.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {a.specialties.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-bold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price row — two tiers */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                      <Pen className="w-2.5 h-2.5" /> Drawing
                    </p>
                    <p className="text-xs font-bold text-white truncate">{fmtPrice(a.rateDrawingOnly)} BDT</p>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold flex items-center gap-1">
                      <PenLine className="w-2.5 h-2.5" /> Draw + Write
                    </p>
                    <p className="text-xs font-bold text-white truncate">{fmtPrice(a.rateDrawingWriting)} BDT</p>
                  </div>
                </div>

                {/* Availability + Sign-up-to-hire button */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 ${
                      a.isAvailable ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        a.isAvailable ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    />
                    {a.isAvailable ? 'Available' : 'Busy'}
                  </span>
                  <Button
                    onClick={handleHireClick}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold tracking-wide min-h-[36px] px-3 py-2 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Sign up to hire
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Bottom info strip */}
        {!loading && !error && artists.length > 0 && (
          <div className="mt-10 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950/60 border border-indigo-500/20 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Want to commission one of these illustrators?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Create a free PracPedia account to send diagram requests, chat with your illustrator,
                and track your bookings in real time.
              </p>
            </div>
            <button
              onClick={onRegister}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 transition-all cursor-pointer min-h-[44px] shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Sign up free
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#060814]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center">
          <span>© 2026 PracPedia Marketplace · Public Preview</span>
          <button
            type="button"
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px]"
          >
            ← Back to home
          </button>
        </div>
      </footer>

      {/* Registration prompt modal */}
      <AnimatePresence>
        {promptOpen && (
          <>
            <motion.div
              key="pm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setPromptOpen(false)}
              aria-hidden
            />
            <motion.div
              key="pm-dialog"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Sign up to hire an illustrator"
                className="pointer-events-auto w-full max-w-md rounded-2xl bg-[#0a0e1f] border border-white/15 shadow-2xl p-6 sm:p-8 relative"
              >
                <button
                  onClick={() => setPromptOpen(false)}
                  className="absolute right-3 top-3 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Sign up to hire
                    </p>
                    <h3 className="text-base font-bold text-white">Create a free account</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  You need a free PracPedia account to commission an illustrator. Sign up in seconds
                  with any email address — no credit card required — then send your diagram request
                  and pick your favorite artist.
                </p>
                <ul className="space-y-2 mb-5">
                  {[
                    'Browse verified STEM illustrators',
                    'Send diagram requests directly to artists',
                    'Track your bookings in real time',
                    'Secure chat with your illustrator',
                  ].map((b) => (
                    <li key={b} className="text-xs text-slate-300 flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleConfirmRegister}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold tracking-wide min-h-[44px] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Sign up free
                  </Button>
                  <Button
                    onClick={() => setPromptOpen(false)}
                    variant="outline"
                    className="sm:flex-1 border-white/15 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold min-h-[44px] cursor-pointer"
                  >
                    Maybe later
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
