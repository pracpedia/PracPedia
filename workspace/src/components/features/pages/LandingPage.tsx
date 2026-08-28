'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import {
  ShieldCheck,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Palette,
  Trophy,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Microscope,
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
    Icon: Sparkles,
    title: 'Gemini AI Academy',
    desc: 'Ask questions 24/7 in English or Bangla. Get step-by-step lesson explanations, practice MCQs, and structured lessons.',
    tint: 'from-indigo-500 to-purple-500',
  },
  {
    Icon: ShieldCheck,
    title: 'Verified NCTB 2026 Curriculum',
    desc: 'Every experiment aligned with the latest NCTB board syllabus. No outdated procedures, no guesswork.',
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
  { n: 2, title: 'Browse subjects & open folders', desc: 'Pick a subject, open a curated experiment folder, and follow the verified procedure.' },
  { n: 3, title: 'Chat with AI & commission diagrams', desc: 'Ask Gemini for help, discuss in classroom chat, and commission an artist for perfect drawings.' },
];

const FAQ_ITEMS = [
  {
    q: 'Is PracPedia aligned with the NCTB 2026 syllabus?',
    a: 'Yes. Every experiment, observation sheet, and calculation formula is cross-verified against the latest NCTB standards and the current HSC practical examination format — no outdated procedures.',
  },
  {
    q: 'Can I ask the Gemini AI Academy questions in Bangla?',
    a: 'Yes. The Gemini AI Academy is fully bilingual — type your question in Bangla or English and receive step-by-step explanations, practice MCQs, and structured lessons in the same language, 24/7.',
  },
  {
    q: 'Can I commission an artist to draw in my physical notebook?',
    a: 'Yes. Pick a verified Bangladeshi STEM illustrator, send your diagram request, and they will deliver pencil-shaded drawings directly inside your physical notebook on high-grade sheet plates.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Completely. Sessions are encrypted, your AI Academy chats and marketplace bookings are visible only to you and the artist you choose, and any teacher or parent oversight requires your explicit consent — never sold, never shared.',
  },
];

const AVATAR_INITIALS = ['AR', 'MS', 'TN', 'ZH'];

const NAV_LINKS = [
  { href: '#subjects', label: 'Subjects' },
  { href: '#features', label: 'Features' },
  { href: '#marketplace', label: 'Marketplace' },
  { href: '#faq', label: 'FAQ' },
];

/* ---------------- AnimatedStat (kept — one-shot rAF count-up) ---------------- */

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

  /* GSAP refs for the 3D gradient-descent animation */
  const sceneRef = useRef<HTMLDivElement>(null);
  const paraboloidRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGGElement>(null);
  const lossLabelRef = useRef<HTMLSpanElement>(null);
  const stepLabelRef = useRef<HTMLSpanElement>(null);
  const stepRowsRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const glyphRefs = useRef<Array<HTMLSpanElement | null>>([null, null, null, null]);

  /* Close mobile drawer on Escape */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileNavOpen]);

  /* GSAP-animated 3D gradient descent — entrance + looping animations */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tweens: gsap.core.Tween[] = [];
    const timelines: gsap.core.Timeline[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Gradient descent trajectory: a ball rolling down a paraboloid bowl.
    // We model the loss as L(x,y) = x² + y² (perfect circular bowl) and
    // run gradient descent: θ ← θ − η ∇L  with η = 0.35 and a touch of momentum
    // for a smooth, organic path. The trajectory is projected from 3D
    // (x, y, L) into 2D screen coords using an orthographic projection tilted
    // by 30° around the X axis — that's what makes it look 3D.
    // ─────────────────────────────────────────────────────────────────────────

    // Build a list of descent steps in 3D space, then project to 2D.
    type Step = { x: number; y: number; loss: number };

    const start: Step = { x: 2.6, y: 1.8, loss: 0 }; // start near the rim
    // Compute initial loss (L = x² + y²)
    start.loss = start.x * start.x + start.y * start.y;

    const steps: Step[] = [start];
    const lr = 0.35; // learning rate
    const momentum = 0.55; // momentum coefficient for smooth path
    let vx = 0;
    let vy = 0;
    let cur = { ...start };
    for (let i = 0; i < 9; i++) {
      // ∇L = (2x, 2y)
      const gx = 2 * cur.x;
      const gy = 2 * cur.y;
      vx = momentum * vx - lr * gx;
      vy = momentum * vy - lr * gy;
      cur = {
        x: cur.x + vx,
        y: cur.y + vy,
        loss: 0,
      };
      cur.loss = cur.x * cur.x + cur.y * cur.y;
      steps.push({ ...cur });
    }
    // Force the last step to land near (0, 0) — gradient descent converges
    steps[steps.length - 1] = { x: 0.02, y: 0.01, loss: 0.0005 };

    // ── Project a 3D point (x, y, loss) to 2D screen coordinates ──
    // We rotate around the X axis by 30° (tilt the bowl toward the viewer):
    //   y' = y·cos(θ) - z·sin(θ)
    //   z' = y·sin(θ) + z·cos(θ)   (unused — we drop z' for orthographic)
    // Then map the math grid (-3..3 x, -3..3 y) onto the SVG canvas
    // (0..240, 0..160), with the paraboloid's lowest point at the centre.
    const SVG_W = 240;
    const SVG_H = 160;
    const CX = SVG_W / 2;
    const CY = SVG_H / 2 + 12; // a bit below center, to give tilt room
    const SCALE = 22; // px per math unit
    const TILT = Math.PI / 6; // 30°

    // Loss height for visual projection — we exaggerate it so the bowl has depth
    const LOSS_SCALE = 5; // px of "elevation" per loss unit

    function project(x: number, y: number, loss: number) {
      // Standard tilt: positive z (high loss) goes UP on screen (because SVG y
      // is inverted, we subtract).
      const z = loss * LOSS_SCALE;
      const yTilted = y * Math.cos(TILT) - z * Math.sin(TILT);
      // Map (x, yTilted) → SVG pixels
      return {
        x: CX + x * SCALE,
        y: CY - yTilted * SCALE,
      };
    }

    // ── Pre-render trail dots — they'll fade in during entrance ──
    if (trailRef.current) {
      // Clear existing dots
      while (trailRef.current.firstChild) trailRef.current.removeChild(trailRef.current.firstChild);
      steps.forEach((s, i) => {
        if (i === 0 || i === steps.length - 1) return; // skip start & final (final is the ball's home)
        const p = project(s.x, s.y, s.loss);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', String(p.x));
        dot.setAttribute('cy', String(p.y));
        dot.setAttribute('r', String(1.5 + i * 0.1));
        dot.setAttribute('fill', '#22d3ee');
        dot.setAttribute('opacity', '0.7');
        trailRef.current!.appendChild(dot);
      });
    }

    // ── Initial ball position (at the starting step) ──
    if (ballRef.current) {
      const p = project(steps[0].x, steps[0].y, steps[0].loss);
      gsap.set(ballRef.current, { x: p.x, y: p.y });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Entrance timeline (one-shot)
    // ─────────────────────────────────────────────────────────────────────────
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timelines.push(tl);

    // Scene fades + scales in
    if (sceneRef.current) {
      tl.fromTo(
        sceneRef.current,
        { scale: 0.92, opacity: 0, y: 24 },
        { scale: 1, opacity: 1, y: 0, duration: 0.7 },
      );
    }

    // Paraboloid contour lines draw themselves via strokeDashoffset
    if (paraboloidRef.current) {
      const contourPaths = paraboloidRef.current.querySelectorAll('ellipse');
      contourPaths.forEach((path, idx) => {
        const len = (path as SVGEllipseElement).getTotalLength();
        gsap.set(path as SVGEllipseElement, {
          strokeDasharray: len,
          strokeDashoffset: len,
        });
        tl.to(
          path as SVGEllipseElement,
          { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' },
          idx * 0.08,
        );
      });
    }

    // Trail dots fade in
    if (trailRef.current) {
      tl.fromTo(
        trailRef.current.children,
        { opacity: 0, scale: 0.3 },
        { opacity: 0.7, scale: 1, duration: 0.35, stagger: 0.06, ease: 'power2.out', svgOrigin: '50% 50%' },
        '-=0.3',
      );
    }

    // Step rows slide in
    if (stepRowsRef.current) {
      const rows = gsap.utils.toArray<HTMLElement>(stepRowsRef.current.children);
      tl.fromTo(
        rows,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.08, ease: 'power2.out' },
        '-=0.3',
      );
    }

    // AI chip pops
    if (chipRef.current) {
      tl.fromTo(
        chipRef.current,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
        '-=0.1',
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gradient descent ball drop — runs as part of the entrance timeline
    // ─────────────────────────────────────────────────────────────────────────
    if (ballRef.current && !prefersReduced) {
      // Ball moves through each step position, with the loss label updating
      const stepCount = steps.length;
      const lossProxy = { val: steps[0].loss };
      const stepProxy = { val: 0 };

      // Add ball movement
      steps.forEach((s, i) => {
        if (i === 0) return; // skip the start, ball is already there
        const p = project(s.x, s.y, s.loss);
        tl.to(
          ballRef.current!,
          { x: p.x, y: p.y, duration: 0.45, ease: 'power1.inOut' },
          0.7 + (i - 1) * 0.45,
        );
        // Update labels at each step
        tl.to(
          lossProxy,
          {
            val: s.loss,
            duration: 0.45,
            ease: 'none',
            onUpdate: () => {
              if (lossLabelRef.current) {
                lossLabelRef.current.textContent = lossProxy.val.toFixed(3);
              }
            },
          },
          0.7 + (i - 1) * 0.45,
        );
        tl.to(
          stepProxy,
          {
            val: i,
            duration: 0.05,
            ease: 'none',
            onUpdate: () => {
              if (stepLabelRef.current) {
                stepLabelRef.current.textContent = String(Math.round(stepProxy.val));
              }
            },
          },
          0.7 + (i - 1) * 0.45,
        );
      });

      // Pulse the ball at the minimum (scale bump)
      tl.to(
        ballRef.current!,
        { scale: 1.5, duration: 0.25, ease: 'back.out(2)', transformOrigin: '50% 50%' },
        0.7 + (stepCount - 1) * 0.45,
      );
      tl.to(
        ballRef.current!,
        { scale: 1.0, duration: 0.4, ease: 'power2.out' },
        0.7 + (stepCount - 1) * 0.45 + 0.25,
      );

      tweens.push(tl as unknown as gsap.core.Tween);
    }

    if (prefersReduced) {
      tl.progress(1);
      // Position ball at minimum
      if (ballRef.current) {
        const p = project(steps[steps.length - 1].x, steps[steps.length - 1].y, steps[steps.length - 1].loss);
        gsap.set(ballRef.current, { x: p.x, y: p.y });
      }
      if (lossLabelRef.current) lossLabelRef.current.textContent = '0.001';
      if (stepLabelRef.current) stepLabelRef.current.textContent = String(steps.length - 1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Loops (only if motion is allowed)
    // ─────────────────────────────────────────────────────────────────────────

    // Loop 1: gentle 3D scene tilt (rotateY -3° ↔ 3°, 6s yoyo)
    if (sceneRef.current && !prefersReduced) {
      const turnTl = gsap.timeline({
        repeat: -1,
        yoyo: true,
        delay: 1.5,
        defaults: { ease: 'sine.inOut' },
      });
      turnTl.fromTo(
        sceneRef.current,
        { rotateY: -3 },
        { rotateY: 3, duration: 6 },
      );
      timelines.push(turnTl);
    }

    // Loop 2: ball pulse at the minimum (subtle scale 1.0 ↔ 1.15)
    if (ballRef.current && !prefersReduced) {
      tweens.push(
        gsap.to(ballRef.current, {
          scale: 1.15,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: '50% 50%',
          delay: 1.5,
        }),
      );
    }

    // Loop 3: paraboloid contour hue shift (cyan ↔ indigo, 4s yoyo)
    if (paraboloidRef.current && !prefersReduced) {
      const contourPaths = paraboloidRef.current.querySelectorAll('ellipse');
      contourPaths.forEach((path, idx) => {
        tweens.push(
          gsap.to(path, {
            stroke: '#818cf8',
            duration: 4 + idx * 0.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
        );
      });
    }

    // Loop 4: floating math glyphs (∇, η, ∂, θ) — Lissajous drift, each unique
    if (!prefersReduced) {
      const glyphConfigs = [
        { xAmp: 12, yAmp: -14, xDur: 3.1, yDur: 4.3 },
        { xAmp: -14, yAmp: 10, xDur: 3.7, yDur: 4.9 },
        { xAmp: 8, yAmp: -10, xDur: 2.6, yDur: 3.4 },
        { xAmp: -10, yAmp: -8, xDur: 4.1, yDur: 5.2 },
      ];
      glyphConfigs.forEach((cfg, i) => {
        const el = glyphRefs.current[i];
        if (!el) return;
        tweens.push(
          gsap.to(el, {
            x: cfg.xAmp,
            duration: cfg.xDur,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
        );
        tweens.push(
          gsap.to(el, {
            y: cfg.yAmp,
            duration: cfg.yDur,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          }),
        );
      });
    }

    return () => {
      tweens.forEach((t) => t.kill());
      timelines.forEach((t) => t.kill());
    };
  }, []);

  /* Compute dynamic contextual statistics (preserves existing logic) */
  const physicsCount =
    folders.filter(
      (f: any) => f.subjectId === 'sub-physics' || (f.subjectId || '').toLowerCase().includes('phys'),
    ).length || 6;
  const biologyCount =
    folders.filter(
      (f: any) => f.subjectId === 'sub-biology' || (f.subjectId || '').toLowerCase().includes('bio'),
    ).length || 8;
  const totalLabSheets = folders.length || 14;

  /* Subjects to display (real subjects from props if provided, otherwise fallback) */
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

  /* Math glyphs array — gradient descent optimization symbols */
  const glyphs = [
    { glyph: '∇', className: 'absolute -top-3 -left-2 text-cyan-400 text-2xl sm:text-3xl lg:text-4xl' },
    { glyph: 'η', className: 'absolute -top-1 right-2 text-indigo-300 text-xl sm:text-2xl lg:text-3xl' },
    { glyph: '∂', className: 'absolute bottom-6 -right-3 text-amber-300 text-sm sm:text-base lg:text-lg' },
    { glyph: 'θ', className: 'absolute bottom-2 -left-1 text-emerald-300 text-xl sm:text-2xl lg:text-3xl' },
  ];

  /* Gradient descent optimization rows for the data table */
  const descentRows: Array<[string, string, string]> = [
    ['Init', 'θ₀ = (2.6, 1.8)', '9.000'],
    ['Step 1', 'η · ∇L', '4.095'],
    ['Step 2', 'θ ← θ − η∇L', '1.494'],
    ['Step 3', 'momentum update', '0.387'],
    ['Converge', '‖∇L‖ < ε', '0.001'],
  ];

  return (
    <div
      id="landing_page_container"
      className="w-full min-h-screen text-slate-200 bg-[#060814] relative font-sans flex flex-col overflow-y-auto overflow-x-hidden scroll-smooth selection:bg-cyan-500/20 selection:text-cyan-300"
    >
      {/* Single ambient gradient orb — the ONLY page-wide infinite animation
          (CSS keyframes, 20s loop, GPU-friendly transform). */}
      <div
        aria-hidden
        className="absolute top-[-15%] left-[-10%] w-[85%] h-[80%] rounded-full bg-gradient-to-br from-cyan-950/25 via-indigo-950/15 to-purple-950/10 blur-[180px] pointer-events-none select-none"
        style={{ animation: 'pp-orb-drift 20s ease-in-out infinite' }}
      />

      {/* Grid overlay with radial mask */}
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
        {/* Hero — 2-column (text left, GSAP notebook right) */}
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
              <span
                aria-hidden
                style={{
                  background: 'linear-gradient(90deg, #22d3ee 0%, #34d399 50%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.25))',
                  display: 'inline-block',
                }}
              >
                HSC science practicals
              </span>{' '}
              with AI precision.
            </motion.h1>

            {/* Subhead — focuses on the 5 real features (no scanner mention) */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto md:mx-0 leading-relaxed"
            >
              Ask Gemini questions 24/7 in Bangla or English, discuss with peers in live classroom
              chat, and commission pencil-shaded diagrams from Bangladeshi illustrators — all
              aligned with the verified NCTB 2026 syllabus, with your progress visible to your
              teachers.
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

          {/* GSAP-animated 3D gradient descent — fully responsive */}
          <div
            className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[440px] order-1 md:order-2"
            style={{ perspective: '1200px' }}
          >
            {/* Soft static glow under the scene */}
            <div
              aria-hidden
              className="absolute -inset-6 bg-gradient-to-br from-cyan-500/20 via-indigo-500/10 to-transparent blur-2xl pointer-events-none"
            />

            {/* Floating math glyphs — GSAP Lissajous float, each unique */}
            {glyphs.map((g, i) => (
              <span
                key={g.glyph}
                ref={(el) => {
                  glyphRefs.current[i] = el;
                }}
                aria-hidden
                className={`pointer-events-none select-none font-mono font-bold ${g.className}`}
              >
                {g.glyph}
              </span>
            ))}

            {/* The scene card itself — GSAP entrance + 3D tilt loop */}
            <div
              ref={sceneRef}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl shadow-cyan-950/40 overflow-hidden"
            >
              {/* Page content */}
              <div className="absolute inset-0 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-500">
                  <span>OPT-07 · GRADIENT DESCENT</span>
                  <span className="text-cyan-400">3D · η = 0.35</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white">
                  Gradient descent on L(θ) = x² + y²
                </div>

                {/* 3D paraboloid bowl + ball + trail — SVG scales fluidly */}
                <div className="relative rounded-lg bg-slate-950/60 border border-white/5 p-1.5 sm:p-2 flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 240 160" className="w-full h-auto" aria-hidden>
                    {/* ── 3D paraboloid — concentric tilted ellipse contours ──
                        Each contour is at a fixed loss level; the ellipse radii
                        shrink with sqrt(loss) because L = x² + y². We tilt
                        everything by 30° around the X axis (handled by the
                        GSAP `project()` function in JS) and use SVG <ellipse>
                        elements with their `cy` computed from the loss height. */}
                    <g ref={paraboloidRef}>
                      {/* Contour levels: 0.4, 1.6, 3.6, 6.4, 10 (computed as 0.4·k² for k=1..5) */}
                      {/* We project each contour: ellipse rx = scale * sqrt(loss), ry = scale * sqrt(loss) * cos(tilt) */}
                      {/* cy is shifted UP by loss * LOSS_SCALE * sin(tilt) */}
                      {(() => {
                        const SCALE = 22;
                        const TILT = Math.PI / 6;
                        const LOSS_SCALE = 5;
                        const CX = 120;
                        const CY = 80 + 12;
                        const levels = [10, 6.4, 3.6, 1.6, 0.4];
                        const colors = ['#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'];
                        return levels.map((loss, i) => {
                          const r = Math.sqrt(loss);
                          const rx = SCALE * r;
                          // SVG y is inverted: low-loss contours are at the bottom (higher y on screen),
                          // high-loss contours are at the top. We tilt the ellipse's center upward
                          // by loss * LOSS_SCALE * sin(tilt) to fake 3D perspective.
                          const elevationPx = loss * LOSS_SCALE * Math.sin(TILT);
                          const cy = CY - elevationPx;
                          // ry is the same as rx (circular bowl) but flattened by cos(tilt) on screen
                          const ry = SCALE * r * Math.cos(TILT);
                          return (
                            <ellipse
                              key={i}
                              cx={CX}
                              cy={cy}
                              rx={rx}
                              ry={ry}
                              fill="none"
                              stroke={colors[i]}
                              strokeWidth={0.7}
                              strokeOpacity={0.7 - i * 0.05}
                            />
                          );
                        });
                      })()}
                    </g>

                    {/* Minimum target marker — pulsing dot at the bowl's bottom */}
                    <circle cx="120" cy="92" r="2" fill="#fbbf24" opacity="0.9" />
                    <circle cx="120" cy="92" r="4" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.5" />

                    {/* Trail dots — populated by GSAP on mount */}
                    <g ref={trailRef} />

                    {/* Ball — the descent trajectory, GSAP-animated */}
                    <g ref={ballRef}>
                      {/* Soft glow around the ball */}
                      <circle cx="0" cy="0" r="6" fill="#22d3ee" opacity="0.25" />
                      <circle cx="0" cy="0" r="4" fill="#22d3ee" opacity="0.45" />
                      {/* Ball core */}
                      <circle cx="0" cy="0" r="2.5" fill="#67e8f9" stroke="#22d3ee" strokeWidth="0.5" />
                    </g>

                    {/* Axes labels */}
                    <text x="6" y="146" fill="#64748b" fontSize="6" fontFamily="monospace">θ₁</text>
                    <text x="216" y="146" fill="#64748b" fontSize="6" fontFamily="monospace">θ₂</text>
                    <text x="200" y="20" fill="#a78bfa" fontSize="7" fontFamily="monospace">L(θ)</text>
                  </svg>

                  {/* Live readout — positioned over the SVG, top-right corner */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 font-mono text-[7px] sm:text-[8px] text-cyan-300 leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-cyan-300 rounded-full animate-pulse" />
                      <span>step <span ref={stepLabelRef}>0</span></span>
                    </div>
                    <div>loss = <span ref={lossLabelRef}>9.000</span></div>
                  </div>
                </div>

                {/* Data table — gradient descent steps (rows slide in via GSAP) */}
                <div className="rounded-lg border border-white/5 overflow-hidden text-[7px] sm:text-[8px] font-mono">
                  <div className="grid grid-cols-3 bg-slate-950/60 text-slate-400">
                    <div className="px-1.5 sm:px-2 py-1 border-r border-white/5">Phase</div>
                    <div className="px-1.5 sm:px-2 py-1 border-r border-white/5">Update</div>
                    <div className="px-1.5 sm:px-2 py-1">Loss</div>
                  </div>
                  <div ref={stepRowsRef}>
                    {descentRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 text-slate-300 border-t border-white/5"
                      >
                        <div className="px-1.5 sm:px-2 py-1 border-r border-white/5 truncate">
                          {row[0]}
                        </div>
                        <div className="px-1.5 sm:px-2 py-1 border-r border-white/5 truncate">
                          {row[1]}
                        </div>
                        <div className="px-1.5 sm:px-2 py-1 text-emerald-400 truncate">
                          {row[2]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI verified chip — pops in via GSAP */}
                <div
                  ref={chipRef}
                  className="mt-auto flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 sm:px-2.5 py-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="font-mono">AI verified · converged in 9 steps</span>
                </div>
              </div>

              {/* Floating status indicator — CSS opacity pulse */}
              <div
                aria-hidden
                className="absolute right-2 sm:right-3 top-2 sm:top-3 flex items-center gap-1 text-[7px] sm:text-[8px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5 animate-pulse [animation-duration:1s]"
              >
                <span className="inline-block w-1.5 h-1.5 bg-cyan-300 rounded-full" />
                AI LIVE
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar — one-shot count-up only, no infinite animations */}
        <section id="stats" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
          <div id="stats_counter_banner" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
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

        {/* Subjects showcase */}
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
                className="group relative block rounded-2xl p-[1px] bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:from-cyan-500/30 hover:via-teal-500/30 hover:to-indigo-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="relative rounded-2xl bg-slate-950/70 backdrop-blur-md p-5 h-full flex items-start gap-4">
                  <div
                    className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${s.tint} border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <s.Icon className="relative w-6 h-6 text-cyan-300" />
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

        {/* Features — 5 cards, no scanner */}
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
              Five tools that replace the chaos of paper notebooks and guesswork — with one
              verified workflow.
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
                className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/5 to-transparent hover:from-cyan-500/40 hover:to-indigo-500/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="relative rounded-2xl bg-slate-950/70 backdrop-blur-md p-6 h-full flex flex-col gap-3">
                  <div
                    className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${f.tint} flex items-center justify-center shadow-lg`}
                  >
                    <f.Icon className="relative w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed flex-1">{f.desc}</p>
                  <button
                    type="button"
                    onClick={onEnter}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider font-mono mt-1 cursor-pointer min-h-[28px] self-start"
                  >
                    Learn more
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works — 3-step timeline with CSS-keyframe flowing dashed line */}
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
            {/* Flowing dashed connector (desktop only) — CSS keyframes, not framer-motion */}
            <svg
              aria-hidden
              className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px w-[66.66%]"
              preserveAspectRatio="none"
              viewBox="0 0 100 4"
              fill="none"
            >
              <line
                x1="0"
                y1="2"
                x2="100"
                y2="2"
                stroke="#22d3ee"
                strokeWidth="1"
                strokeDasharray="6 4"
                style={{ animation: 'pp-dash-flow 2.5s linear infinite' }}
              />
            </svg>

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

        {/* Announcements — keep existing logic, no infinite per-card animations */}
        <section
          id="announcements"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <div id="bulletin_announcements_section" className="space-y-10">
            <div className="text-center md:text-left space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
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
                    className="relative overflow-hidden rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md p-5 flex flex-col gap-4 hover:border-white/20 hover:-translate-y-0.5 transition-all"
                  >
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[8px] bg-indigo-500/15 text-indigo-300 font-bold uppercase py-0.5 px-2 rounded-md border border-indigo-500/25 font-mono tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                        Active bulletin
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="relative text-sm font-bold text-slate-100 leading-snug">{ann.title}</h3>
                    <p className="relative text-[12px] text-slate-400 leading-relaxed line-clamp-4 flex-1">
                      {ann.content}
                    </p>
                    <div className="relative pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
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

        {/* Marketplace highlight — buttons now both call onEnter */}
        <section
          id="marketplace"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-white/[0.06]"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-indigo-950/40 border border-indigo-500/20 p-6 sm:p-8 md:p-10 hover:-translate-y-1 transition-transform duration-300"
          >
            {/* Static decorative glow (no infinite animation) */}
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"
            />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 max-w-2xl">
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-500/30">
                  <Palette className="relative w-7 h-7 text-white" />
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 cursor-pointer min-h-[48px] transition-all"
                >
                  Consult Sketch Artists
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onEnter}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold tracking-wide rounded-xl hover:-translate-y-0.5 cursor-pointer min-h-[48px] transition-all"
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FAQ — accordion with 4 items (no scanner question) */}
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
            {/* Static decorative dot pattern (no infinite animation) */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* Static soft glows */}
            <div
              aria-hidden
              className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"
            />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to ace your HSC practical exam?
              </h2>
              <p className="text-cyan-100 text-base sm:text-lg leading-relaxed">
                Join 2,400+ Bangladeshi students who trust PracPedia for verified procedures,
                Gemini-powered help, and pro illustrations. Free to start — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  id="cta_final_btn"
                  onClick={heroCtaOnClick}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white text-slate-900 font-bold text-sm tracking-wide shadow-2xl hover:bg-slate-100 hover:-translate-y-0.5 transition-all cursor-pointer min-h-[48px]"
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

      {/* Footer (3-column) */}
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
            <button
              type="button"
              onClick={onEnter}
              className="block text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] text-left"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="block text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] text-left"
            >
              Terms
            </button>
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
