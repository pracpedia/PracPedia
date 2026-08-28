'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  CheckCircle2,
  ScanLine,
  Sparkles,
  MessageCircle,
  Palette,
  Trophy,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Microscope,
  Star,
  Quote,
  Mail,
  ChevronDown,
  Menu,
  X,
  Clock,
} from 'lucide-react';
import { Logo } from '@/components/features/Logo';

interface BannerConfig {
  enabled: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  size: 'sm' | 'md' | 'lg';
}

interface LandingPageProps {
  onEnter: () => void;
  isAuthenticated: boolean;
  onGoToDashboard: () => void;
  subjects?: any[];
  bannerConfig?: BannerConfig;
  folders?: any[];
  announcements?: any[];
}

/* ---------------- helpers ---------------- */

type IconType = React.ComponentType<{ className?: string }>;

const subjectIconFor = (name: string): IconType => {
  const n = (name || '').toLowerCase();
  if (n.includes('phys')) return Atom;
  if (n.includes('chem')) return FlaskConical;
  if (n.includes('bio')) return Microscope;
  if (n.includes('math')) return Calculator;
  if (n.includes('ict') || n.includes('computer') || n.includes('tech')) return BookOpen;
  return BookOpen;
};

const FALLBACK_SUBJECTS = [
  { id: 'physics', name: 'Physics', count: 6, Icon: Atom, tint: 'from-cyan-500/20 to-cyan-400/5' },
  { id: 'chemistry', name: 'Chemistry', count: 8, Icon: FlaskConical, tint: 'from-teal-500/20 to-teal-400/5' },
  { id: 'biology', name: 'Biology', count: 10, Icon: Microscope, tint: 'from-emerald-500/20 to-emerald-400/5' },
  { id: 'higher-math', name: 'Higher Math', count: 4, Icon: Calculator, tint: 'from-indigo-500/20 to-indigo-400/5' },
  { id: 'ict', name: 'ICT', count: 5, Icon: BookOpen, tint: 'from-amber-500/20 to-amber-400/5' },
];

const FEATURES = [
  {
    Icon: ScanLine,
    title: 'AI Notebook Scanner',
    desc: 'Photograph your practical notebook and get instant AI analysis of diagrams, calculations, and data tables.',
    tint: 'from-cyan-500 to-teal-500',
  },
  {
    Icon: Sparkles,
    title: 'Gemini AI Academy',
    desc: 'Ask questions 24/7 in English or Bangla. Get step-by-step lesson explanations, practice MCQs, and structured lessons.',
    tint: 'from-indigo-500 to-purple-500',
  },
  {
    Icon: ShieldCheck,
    title: 'Verified Curriculum',
    desc: 'Every experiment aligned with the latest NCTB 2026 board syllabus. No outdated procedures.',
    tint: 'from-emerald-500 to-teal-500',
  },
  {
    Icon: MessageCircle,
    title: 'Live Classroom Chat',
    desc: 'Discuss with peers and educators in real time. Long-polling keeps the conversation flowing without lag.',
    tint: 'from-sky-500 to-cyan-500',
  },
  {
    Icon: Palette,
    title: 'STEM Illustrator Marketplace',
    desc: 'Commission experienced Bangladeshi artists to draw perfect diagrams in your physical notebook.',
    tint: 'from-amber-500 to-orange-500',
  },
  {
    Icon: Trophy,
    title: 'Progress Tracking',
    desc: 'Study time, completed modules, and AI credits visible to your teachers and parents.',
    tint: 'from-violet-500 to-indigo-500',
  },
];

const HOW_IT_WORKS = [
  { n: 1, title: 'Sign up with your email', desc: 'Create your free account in seconds with any email address.' },
  { n: 2, title: 'Browse subjects & scan', desc: 'Pick a subject, then photograph your handwritten practicals.' },
  { n: 3, title: 'Get AI feedback & diagrams', desc: 'Receive instant corrections and commission artist-drawn diagrams.' },
];

const TESTIMONIALS = [
  {
    initials: 'AR',
    name: 'Aarav R.',
    role: 'HSC 2025 candidate',
    city: 'Dhaka',
    quote: 'The AI scanner caught a calculation error in my physics practical that would have cost me 4 marks.',
    tint: 'from-cyan-500 to-indigo-600',
  },
  {
    initials: 'TN',
    name: 'Tasnim N.',
    role: 'HSC 2024 candidate',
    city: 'Chittagong',
    quote: "Commissioned a calculus integration diagram in 2 days. The artist's pencil shading was perfect.",
    tint: 'from-amber-500 to-orange-600',
  },
  {
    initials: 'MH',
    name: 'Mehedi H.',
    role: 'Physics teacher',
    city: 'Rajshahi',
    quote: "I assign my students PracPedia's AI Academy lessons for revision. The Bangla explanations are excellent.",
    tint: 'from-emerald-500 to-teal-600',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is PracPedia aligned with the NCTB 2026 syllabus?',
    a: 'Yes. Every experiment, observation sheet, and calculation formula is cross-verified against the latest NCTB standards and the current HSC practical examination format — no outdated procedures.',
  },
  {
    q: 'How does the AI scanner check my calculations?',
    a: 'Photograph your notebook page with your phone. The Gemini multimodal AI instantly highlights calculation errors, plotting mistakes, and scale discrepancies — and suggests the correct values.',
  },
  {
    q: 'Can I commission an artist to draw in my physical notebook?',
    a: 'Yes. Pick a verified Bangladeshi STEM illustrator, send your diagram request, and they will deliver pencil-shaded drawings directly inside your physical notebook on high-grade sheet plates.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Completely. Sessions are encrypted, your notebook scans are visible only to you, and any teacher or parent oversight requires your explicit consent — never sold, never shared.',
  },
];

const AVATAR_INITIALS = ['AR', 'MS', 'TN', 'ZH'];

const NAV_LINKS = [
  { href: '#subjects', label: 'Subjects' },
  { href: '#features', label: 'Features' },
  { href: '#marketplace', label: 'Marketplace' },
  { href: '#faq', label: 'FAQ' },
];

/* ---------------- AnimatedStat ---------------- */

const AnimatedStat: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <span ref={ref} className={className}>{display}</span>;
};

/* ---------------- LandingPage ---------------- */

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  isAuthenticated,
  onGoToDashboard,
  subjects = [],
  bannerConfig,
  folders = [],
  announcements = [],
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileNavOpen]);

  // Compute dynamic contextual statistics (preserves existing logic)
  const physicsCount =
    folders.filter(
      (f: any) => f.subjectId === 'sub-physics' || (f.subjectId || '').toLowerCase().includes('phys'),
    ).length || 6;
  const biologyCount =
    folders.filter(
      (f: any) => f.subjectId === 'sub-biology' || (f.subjectId || '').toLowerCase().includes('bio'),
    ).length || 8;
  const totalLabSheets = folders.length || 14;

  // Subjects to display (real subjects from props if provided, otherwise fallback)
  const realSubjects = (subjects || []).map((s: any, i: number) => ({
    id: s?.id ?? String(s?.name ?? Math.random()),
    name: s?.name ?? 'Untitled subject',
    count: folders.filter((f: any) => f.subjectId === s?.id).length,
    Icon: subjectIconFor(s?.name ?? ''),
    tint: FALLBACK_SUBJECTS[i % FALLBACK_SUBJECTS.length].tint,
  }));
  const displaySubjects = realSubjects.length > 0 ? realSubjects : FALLBACK_SUBJECTS;

  const heroCtaLabel = isAuthenticated ? 'Go to Dashboard' : 'Get Started Free';
  const heroCtaOnClick = isAuthenticated ? onGoToDashboard : onEnter;
  const heroCtaId = isAuthenticated ? 'cta_dashboard_btn' : 'cta_authenticate_btn';

  const stats = [
    { value: totalLabSheets, label: 'Lab experiment modules', color: 'text-white', Icon: BookOpen },
    { value: physicsCount, label: 'Physics experiments', color: 'text-cyan-400', Icon: Atom },
    { value: biologyCount, label: 'Biology specimens', color: 'text-amber-400', Icon: Microscope },
    { value: 3, label: 'Drawing specialists online', color: 'text-indigo-400', Icon: Palette },
  ];

  return (
    <div
      id="landing_page_container"
      className="w-full min-h-screen text-slate-200 bg-[#060814] relative font-sans flex flex-col overflow-y-auto overflow-x-hidden scroll-smooth selection:bg-cyan-500/20 selection:text-cyan-300"
    >
      {/* Ambient gradient blobs */}
      <motion.div
        aria-hidden
        className="absolute top-[-10%] left-[-15%] w-[80%] h-[70%] rounded-full bg-gradient-to-br from-cyan-950/20 to-indigo-950/15 blur-[160px] pointer-events-none select-none"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[5%] right-[-15%] w-[80%] h-[70%] rounded-full bg-gradient-to-tr from-indigo-950/15 to-purple-950/15 blur-[160px] pointer-events-none select-none"
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid overlay with mask */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_52%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none"
      />

      {/* Top banner — customizable by super admin */}
      {bannerConfig?.enabled !== false && (
        <div
          className="relative z-30 w-full border-b py-2.5 text-center px-4"
          style={{
            backgroundColor: bannerConfig?.bgColor || 'rgba(8, 47, 73, 0.4)',
            borderColor: 'rgba(6, 182, 212, 0.1)',
          }}
        >
          <span
            className={`inline-flex flex-wrap items-center justify-center gap-2 font-mono uppercase tracking-wider font-extrabold ${
              bannerConfig?.size === 'lg'
                ? 'text-sm md:text-base'
                : bannerConfig?.size === 'sm'
                  ? 'text-[9px]'
                  : 'text-[10px] md:text-xs'
            }`}
            style={{ color: bannerConfig?.textColor || '#22d3ee' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
              style={{ backgroundColor: bannerConfig?.textColor || '#22d3ee' }}
            />
            {bannerConfig?.text ||
              '★ 2026 Bangladesh National Board Curriculum Standards Fully Integrated for HSC Candidates'}
          </span>
        </div>
      )}

      {/* Sticky header */}
      <header
        id="landing_header"
        className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#060814]/70 border-b border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <a
            href="#hero"
            className="flex items-center gap-2 shrink-0 min-h-[40px]"
            aria-label="PracPedia home"
          >
            <Logo size="lg" />
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors min-h-[40px] flex items-center"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {!isAuthenticated && (
              <button
                onClick={onEnter}
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[40px]"
              >
                Sign in
              </button>
            )}
            <button
              onClick={heroCtaOnClick}
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/20 transition-all cursor-pointer min-h-[40px]"
            >
              {isAuthenticated && <Layout className="w-4 h-4" />}
              <span>{isAuthenticated ? 'Dashboard' : 'Get Started'}</span>
              {!isAuthenticated && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-50 w-72 bg-[#0a0e1f] border-l border-white/10 p-6 flex flex-col gap-2 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between mb-4">
                <Logo size="md" />
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] flex items-center"
                >
                  {l.label}
                </a>
              ))}
              <div className="border-t border-white/10 my-3" />
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    onEnter();
                  }}
                  className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] text-left"
                >
                  Sign in
                </button>
              )}
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  heroCtaOnClick();
                }}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-sm font-bold tracking-wide cursor-pointer min-h-[44px] text-center"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Hero */}
        <section
          id="hero"
          className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 grid md:grid-cols-2 gap-10 md:gap-12 items-center"
        >
          <div className="text-center md:text-left space-y-6 order-2 md:order-1">
            {/* Trust badge with avatar stack */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-950/60 border border-white/10 backdrop-blur-md"
            >
              <div className="flex -space-x-2">
                {AVATAR_INITIALS.map((i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#060814]"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-300 uppercase tracking-wider font-bold">
                Trusted by 2,400+ HSC students
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]"
            >
              Master your{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                HSC science practicals
              </span>{' '}
              with AI precision.
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto md:mx-0 leading-relaxed"
            >
              Scan your notebook for instant AI feedback on diagrams and calculations, ask Gemini
              questions 24/7 in Bangla or English, and commission perfect pencil-shaded drawings — all
              aligned with the NCTB 2026 syllabus.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3 sm:justify-center md:justify-start"
            >
              <button
                id={heroCtaId}
                onClick={heroCtaOnClick}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_14px_36px_rgba(6,182,212,0.45)] transition-all cursor-pointer min-h-[48px]"
              >
                {isAuthenticated ? <Layout className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{heroCtaLabel}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#subjects"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm border border-white/10 hover:border-white/20 transition-all cursor-pointer min-h-[48px]"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Browse subjects</span>
              </a>
            </motion.div>

            {/* Mini trust row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center justify-center md:justify-start gap-4 pt-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold font-mono"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400" /> Real-time sync
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" /> NCTB 2026 verified
              </span>
            </motion.div>
          </div>

          {/* Notebook mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotateY: 8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            whileHover={{ rotateY: -4, rotateX: 2, scale: 1.02 }}
            style={{ transformPerspective: 1200 }}
            className="relative mx-auto w-full max-w-md order-1 md:order-2"
          >
            {/* Glow under mockup */}
            <div
              aria-hidden
              className="absolute -inset-6 bg-gradient-to-br from-cyan-500/20 via-indigo-500/10 to-transparent blur-2xl pointer-events-none"
            />

            <div className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl shadow-cyan-950/40 overflow-hidden">
              {/* Spiral binding */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-slate-800/80 border-r border-white/10 flex flex-col justify-evenly items-center py-3 z-10">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full bg-slate-700 border border-white/10 shadow-inner"
                  />
                ))}
              </div>

              {/* Page content */}
              <div className="absolute inset-0 pl-10 pr-5 py-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>EXP-04 · INTEGRATION</span>
                  <span className="text-cyan-400">2026.01.14</span>
                </div>
                <div className="text-xs font-bold text-white">Definite integral — area under curve</div>

                {/* Diagram — y = x² shaded from x=0 to x=2 */}
                <div className="rounded-lg bg-slate-950/60 border border-white/5 p-3 flex items-center justify-center">
                  <svg viewBox="0 0 200 90" className="w-full h-auto" aria-hidden>
                    {/* Axes */}
                    <line x1="14" y1="78" x2="190" y2="78" stroke="#475569" strokeWidth="0.6" />
                    <line x1="14" y1="78" x2="14" y2="10" stroke="#475569" strokeWidth="0.6" />
                    {/* y = x² scaled: 0..2 maps to x 14..150, y 78..14 (parabola opening upward) */}
                    <path
                      d="M14,78 L24,77.6 L34,76.6 L44,75 L54,72.8 L64,70 L74,66.6 L84,62.6 L94,58 L104,52.8 L114,47 L124,40.6 L134,33.6 L144,26 L154,17.8 L160,14"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Shaded area under curve between x=0 and x=2 */}
                    <path
                      d="M14,78 L24,77.6 L34,76.6 L44,75 L54,72.8 L64,70 L74,66.6 L84,62.6 L94,58 L104,52.8 L114,47 L124,40.6 L134,33.6 L144,26 L154,17.8 L160,14 L160,78 Z"
                      fill="url(#integralShade)"
                      stroke="#22d3ee"
                      strokeWidth="0.6"
                      strokeOpacity="0.6"
                    />
                    {/* Gradient def */}
                    <defs>
                      <linearGradient id="integralShade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.06" />
                      </linearGradient>
                    </defs>
                    {/* Bounds labels */}
                    <text x="10" y="86" fill="#64748b" fontSize="7" fontFamily="monospace">0</text>
                    <text x="155" y="86" fill="#64748b" fontSize="7" fontFamily="monospace">2</text>
                    <text x="166" y="18" fill="#a78bfa" fontSize="8" fontFamily="monospace">y = x²</text>
                  </svg>
                </div>

                {/* Data table — integration calculation steps */}
                <div className="rounded-lg border border-white/5 overflow-hidden text-[8px] font-mono">
                  <div className="grid grid-cols-3 bg-slate-950/60 text-slate-400">
                    <div className="px-2 py-1 border-r border-white/5">Step</div>
                    <div className="px-2 py-1 border-r border-white/5">Expression</div>
                    <div className="px-2 py-1">Value</div>
                  </div>
                  {[
                    ['∫₀² x² dx', '[x³/3]', '—'],
                    ['Upper bound', '[8/3]', '2.667'],
                    ['Lower bound', '[0/3]', '0.000'],
                    ['Area = F(2) − F(0)', '8/3 − 0', '2.67'],
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 text-slate-300 border-t border-white/5">
                      <div className="px-2 py-1 border-r border-white/5">{row[0]}</div>
                      <div className="px-2 py-1 border-r border-white/5">{row[1]}</div>
                      <div className="px-2 py-1 text-emerald-400">{row[2]}</div>
                    </div>
                  ))}
                </div>

                {/* AI feedback chip */}
                <div className="mt-auto flex items-center gap-2 text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2.5 py-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="font-mono">AI verified · integral evaluated correctly</span>
                </div>
              </div>

              {/* Floating scan indicator */}
              <motion.div
                aria-hidden
                className="absolute right-3 top-3 flex items-center gap-1 text-[8px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ScanLine className="w-2.5 h-2.5" /> SCANNING
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Stats bar */}
        <section id="stats" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
          <div id="stats_counter_banner" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md group hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <AnimatedStat
                  value={stat.value}
                  className={`block text-2xl sm:text-3xl font-black font-mono tracking-tight ${stat.color}`}
                />
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider block mt-1">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Subjects */}
        <section id="subjects" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-2 max-w-2xl mx-auto mb-10">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              Subjects
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Master every HSC science subject
            </h2>
            <p className="text-sm text-slate-400">
              From Physics practicals to ICT programming — every experiment, organised.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {displaySubjects.map((s, i) => (
              <motion.a
                key={s.id}
                href="#features"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group relative block rounded-2xl p-[1px] bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:from-cyan-500/30 hover:via-teal-500/30 hover:to-indigo-500/30 transition-all duration-300 cursor-pointer"
              >
                <div className="rounded-2xl bg-slate-950/70 backdrop-blur-md p-5 h-full flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.tint} border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <s.Icon className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1">{s.name}</h3>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                      {s.count} folders
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              Features
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Built for the 2026 HSC practical exam
            </h2>
            <p className="text-sm text-slate-400">
              Six tools that replace the chaos of paper notebooks, scanned PDFs, and guesswork — with
              one verified workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/5 to-transparent hover:from-cyan-500/40 hover:to-indigo-500/40 transition-all duration-300"
              >
                <div className="rounded-2xl bg-slate-950/70 backdrop-blur-md p-6 h-full flex flex-col gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.tint} flex items-center justify-center shadow-lg`}
                  >
                    <f.Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed flex-1">{f.desc}</p>
                  <a
                    href="#features"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider font-mono mt-1 cursor-pointer min-h-[28px]"
                  >
                    Learn more
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              How it works
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Three steps to a perfect notebook
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* Dashed connector line on desktop */}
            <div
              aria-hidden
              className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(34,211,238,0.5) 50%, transparent 50%), linear-gradient(to right, rgba(99,102,241,0.5) 50%, transparent 50%)',
                backgroundSize: '12px 1px, 12px 1px',
                backgroundPosition: '0 0, 0 0',
              }}
            />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="relative text-center space-y-3 px-4"
              >
                <div className="relative mx-auto w-14 h-14 rounded-full bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center text-xl font-black font-mono text-cyan-400 shadow-lg shadow-cyan-500/20">
                  {step.n}
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              Testimonials
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Loved by students and teachers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-md p-6 space-y-4 hover:border-white/20 transition-colors"
              >
                <Quote className="w-6 h-6 text-cyan-500/40" aria-hidden />
                <div className="flex gap-0.5" aria-label="Rated 5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{t.quote}</p>
                <footer className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.tint} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{t.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {t.role} · {t.city}
                    </div>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section
          id="announcements"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div id="bulletin_announcements_section" className="space-y-10">
            <div className="text-center md:text-left space-y-2">
              <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-400 font-bold">
                Notice board
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Live educator notice board
              </h2>
              <p className="text-sm text-slate-400 max-w-xl">
                Recent circulars, schedule adjustments, and bulletin notices published live by senior
                administrators.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {announcements && announcements.length > 0 ? (
                announcements.slice(0, 3).map((ann: any, i: number) => (
                  <motion.article
                    key={ann.id ?? i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md p-5 flex flex-col gap-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] bg-indigo-500/15 text-indigo-300 font-bold uppercase py-0.5 px-2 rounded-md border border-indigo-500/25 font-mono tracking-wider">
                        Active bulletin
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 leading-snug">{ann.title}</h3>
                    <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-4 flex-1">
                      {ann.content}
                    </p>
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
                      <span className="truncate">
                        By <strong className="text-slate-300">{ann.createdByName || 'Faculty Host'}</strong>
                      </span>
                      {ann.deadline && (
                        <span className="text-amber-400 font-bold whitespace-nowrap">
                          Due: {ann.deadline}
                        </span>
                      )}
                    </div>
                  </motion.article>
                ))
              ) : (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-2xl bg-slate-950/40 border border-dashed border-white/10 p-10 text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    No active notices published on the central notice board.
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1 font-mono">
                    Check back closer to exam season for circulars.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Marketplace highlight */}
        <section
          id="marketplace"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-indigo-950/40 border border-indigo-500/20 p-6 sm:p-8 md:p-10"
          >
            {/* Decorative glow */}
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"
            />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-500/30">
                  <Palette className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-2">
                  <span className="inline-block text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-400/20">
                    STEM Illustrator Marketplace
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Flawless lab drawing plates drawn for you
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Skip the drawing anxiety. Commission veteran Bangladeshi notebook illustrators to
                    construct hand-shaded scientific drawings on high-grade sheet plates, delivered
                    securely inside your physical notebook.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
                <button
                  onClick={onEnter}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer min-h-[48px] transition-all"
                >
                  Consult Sketch Artists
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {}}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold tracking-wide rounded-xl cursor-pointer min-h-[48px] transition-all"
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div className="text-center space-y-2 max-w-2xl mx-auto mb-10">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border backdrop-blur-md overflow-hidden transition-colors ${
                    isOpen
                      ? 'bg-slate-950/70 border-white/15'
                      : 'bg-slate-950/50 border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer min-h-[56px]"
                  >
                    <span className="text-sm sm:text-base font-bold text-white">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        id={`faq-panel-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-[13px] sm:text-sm text-slate-400 leading-relaxed">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <p className="text-[12px] text-slate-500 font-mono uppercase tracking-wider">
              Still have questions?{' '}
              <a
                href="mailto:hello@pracpedia.bd"
                className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[28px]"
              >
                <Mail className="w-3.5 h-3.5" /> Contact us
              </a>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section
          id="final-cta"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-700 p-8 sm:p-12 md:p-16 text-center"
          >
            {/* Decorative dot pattern */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* Soft glows */}
            <div
              aria-hidden
              className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-500/30 blur-3xl pointer-events-none"
            />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to ace your HSC practical exam?
              </h2>
              <p className="text-cyan-100 text-base sm:text-lg leading-relaxed">
                Join 2,400+ Bangladeshi students who trust PracPedia for verified procedures, AI
                feedback, and pro illustrations. Free to start — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  id="cta_final_btn"
                  onClick={heroCtaOnClick}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white text-slate-900 font-bold text-sm tracking-wide shadow-2xl hover:bg-slate-100 transition-all cursor-pointer min-h-[48px]"
                >
                  {isAuthenticated ? (
                    <Layout className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                  )}
                  <span>{heroCtaLabel}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-cyan-100/80 uppercase tracking-wider font-mono font-bold flex-wrap">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> No card needed
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> 24/7 access
                </span>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer
        id="landing_footer"
        className="relative z-10 border-t border-white/[0.06] bg-[#060814]/80 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Logo size="lg" />
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              The premium practical notebook portal for Bangladesh HSC science students — verified,
              AI-assisted, and pro-illustrated.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Officially linked with student communities
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] text-slate-300 font-bold uppercase tracking-wider font-mono">
              Quick links
            </h4>
            <ul className="space-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] inline-flex items-center"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] inline-flex items-center"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] text-slate-300 font-bold uppercase tracking-wider font-mono">
              Contact
            </h4>
            <a
              href="mailto:hello@pracpedia.bd"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px]"
            >
              <Mail className="w-4 h-4" /> hello@pracpedia.bd
            </a>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] inline-flex items-center"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] inline-flex items-center"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center">
            <span>© 2026 Bangladesh HSC Science Practical Portal · All Rights Reserved</span>
            <span>Built with care in Dhaka</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
