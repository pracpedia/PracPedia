'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
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
  onRegister: () => void;
  onSignIn: () => void;
  onBrowseMarketplace: () => void;
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

/* ---------------- Fourier series constants ---------------- */

// Square wave Fourier series:  f(t) = (4/π) · Σ_{k=1..7} sin((2k-1)·ω·t) / (2k−1)
// 7 harmonics — odd multiples of the base frequency (1, 3, 5, 7, 9, 11, 13).
const HARMONIC_KS = [1, 3, 5, 7, 9, 11, 13];
const HARMONIC_AMPS = HARMONIC_KS.map((k) => (4 / Math.PI) / k);

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

const toSubscript = (n: number): string =>
  String(n).split('').map((c) => SUBSCRIPTS[c] ?? c).join('');

const HARMONIC_ROWS: Array<[string, string, string]> = HARMONIC_KS.map((k, i) => [
  String(k),
  `A${toSubscript(k)} sin(${k}ωt)`,
  HARMONIC_AMPS[i].toFixed(3),
]);

// 7 epicycle stroke colors — smooth cyan → teal → indigo gradient.
const CIRCLE_COLORS = [
  '#22d3ee', // cyan-400
  '#14b8a6', // teal-500
  '#2dd4bf', // teal-400
  '#5eead4', // teal-300
  '#818cf8', // indigo-400
  '#6366f1', // indigo-500
  '#a78bfa', // violet-400
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

/* ---------------- ParallaxSectionHeading (desktop only — GSAP scroll-linked transform, no framer-motion) ---------------- */

const ParallaxSectionHeading: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Only apply parallax on desktop — on mobile, scroll listeners + transforms cause scroll jank
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  useEffect(() => {
    if (!isDesktop) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const center = rect.top + rect.height / 2 - viewportH / 2;
      const progress = Math.max(-1, Math.min(1, center / viewportH));
      el.style.transform = `translateY(${-progress * 40}px)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isDesktop]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

/* ---------------- GsapHeading (SplitText char stagger on scroll-in — one-shot) ---------------- */

const GsapHeading: React.FC<{
  as: 'h1' | 'h2';
  children: React.ReactNode;
  className?: string;
}> = ({ as, children, className }) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const splitRef = useRef<SplitText | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(SplitText);

    // Ensure the heading is visible immediately (in case the IntersectionObserver
    // doesn't fire on mount — e.g. element is already in viewport on load).
    gsap.set(el, { opacity: 1 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const split = new SplitText(el, { type: 'chars,words' });
            splitRef.current = split;
            // Character-by-character reveal: each char flies in from below
            // with a slight rotation + scale for a premium staggered effect.
            gsap.from(split.chars, {
              opacity: 0,
              y: 20,
              rotationX: -90,
              scale: 0.5,
              duration: 0.6,
              stagger: 0.025,
              ease: 'back.out(1.7)',
              transformOrigin: '50% 100%',
            });
            observer.unobserve(el);
          }
        });
      },
      { rootMargin: '-40px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (splitRef.current) splitRef.current.revert();
    };
  }, []);
  const Tag = as;
  return (
    <Tag ref={ref} className={className} style={{ opacity: 1 }}>
      {children}
    </Tag>
  );
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
  onRegister,
  onSignIn,
  onBrowseMarketplace,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  /* GSAP refs for the Fourier series epicycle animation */
  const sceneRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<Array<SVGCircleElement | null>>(Array(7).fill(null));
  const lineRefs = useRef<Array<SVGLineElement | null>>(Array(7).fill(null));
  const tipRef = useRef<SVGCircleElement>(null);
  const trailLineRef = useRef<SVGLineElement>(null);
  const waveformRef = useRef<SVGPolylineElement>(null);
  const tLabelRef = useRef<HTMLSpanElement>(null);
  const sumLabelRef = useRef<HTMLSpanElement>(null);
  const stepRowsRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  /* CTA dots + glow animation refs */
  const ctaDotsRef = useRef<HTMLDivElement>(null);
  const ctaGlow1Ref = useRef<HTMLDivElement>(null);
  const ctaGlow2Ref = useRef<HTMLDivElement>(null);

  /* Parallax transforms — only on desktop (≥768px) to prevent mobile scroll jank.
     On mobile, will-change:transform + useScroll listeners cause the scroll to
     stutter badly. We detect the viewport and conditionally apply parallax. */
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const { scrollY } = useScroll();
  const heroTextY = useTransform(scrollY, [0, 700], isDesktop ? [0, -210] : [0, 0]);
  const heroVizY = useTransform(scrollY, [0, 700], isDesktop ? [0, -350] : [0, 0]);

  /* Deep-space parallax layers — each moves at a different speed to create
     depth (distant stars slowest, near dust + shooting stars fastest). */
  const bgFarMountainY = useTransform(scrollY, [0, 4000], isDesktop ? [0, 350] : [0, 0]);
  const bgMidMountainY = useTransform(scrollY, [0, 4000], isDesktop ? [0, 500] : [0, 0]);
  const bgNearHillY = useTransform(scrollY, [0, 4000], isDesktop ? [0, 700] : [0, 0]);

  /* ── State-of-the-art mouse parallax ──
     The cursor position drives a spring-smoothed motion value that's mapped
     to horizontal + vertical offsets for each star layer at different rates
     (distant slow, near fast). Combined with the scroll-Y parallax above,
     this creates a buttery 3D depth effect as the user moves their mouse.
     Uses requestAnimationFrame throttling to avoid scroll jank. */
  const mouseX = useMotionValue(0);
  const springMouseX = useSpring(mouseX, { stiffness: 60, damping: 20, mass: 0.6 });
  // Distant layer — moves slowest (0.3x of mouse delta)
  const farMouseX = useTransform(springMouseX, [-0.5, 0.5], [-10, 10]);
  // Mid layer — medium (0.7x)
  const midMouseX = useTransform(springMouseX, [-0.5, 0.5], [-25, 25]);
  // Near layer — fastest (1.2x)
  const nearMouseX = useTransform(springMouseX, [-0.5, 0.5], [-40, 40]);

  // Throttled mouse handler — uses rAF to avoid flooding the main thread.
  const rafRef = useRef<number | null>(null);
  const handleMouseParallax = (e: React.MouseEvent) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const x = e.clientX / window.innerWidth - 0.5;
      mouseX.set(x);
    });
  };
  const resetMouseParallax = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    mouseX.set(0);
  };

  /* Close mobile drawer on Escape */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileNavOpen]);

  /* GSAP-animated Fourier series epicycles — infinite rotation.
     NOTE: the floating math glyphs (∑ π ω ƒ) were removed per user request
     (they looked like "floating balls"). Only the epicycles + waveform remain. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tweens: gsap.core.Tween[] = [];
    const timelines: gsap.core.Timeline[] = [];

    const FOURIER_SCALE = 36;
    const FOURIER_OMEGA_BASE = 1.4;
    const WAVE_SAMPLES = 120;
    const WAVE_WINDOW = 6;
    const WAVE_X_START = 120;
    const WAVE_X_END = 240;
    const WAVE_X_RANGE = WAVE_X_END - WAVE_X_START;
    const EPICYCLE_CENTER_X = 60;
    const EPICYCLE_CENTER_Y = 80;

    const omegas = HARMONIC_KS.map((k) => k * FOURIER_OMEGA_BASE);

    function fourierSum(s: number): number {
      let sum = 0;
      for (let i = 0; i < HARMONIC_KS.length; i++) {
        sum += HARMONIC_AMPS[i] * Math.sin(omegas[i] * s);
      }
      return sum;
    }

    let t = 0;
    let lastFrameTime = performance.now();

    function renderFrame(currentTime: number) {
      const dt = Math.min((currentTime - lastFrameTime) / 1000, 0.05);
      lastFrameTime = currentTime;
      t += dt;

      let prevX = EPICYCLE_CENTER_X;
      let prevY = EPICYCLE_CENTER_Y;
      let sumValue = 0;

      for (let i = 0; i < HARMONIC_KS.length; i++) {
        const angle = omegas[i] * t;
        const dx = HARMONIC_AMPS[i] * FOURIER_SCALE * Math.cos(angle);
        const dy = -HARMONIC_AMPS[i] * FOURIER_SCALE * Math.sin(angle);
        const tipX = prevX + dx;
        const tipY = prevY + dy;

        const circleEl = circleRefs.current[i];
        if (circleEl) {
          circleEl.setAttribute('cx', prevX.toFixed(2));
          circleEl.setAttribute('cy', prevY.toFixed(2));
        }
        const lineEl = lineRefs.current[i];
        if (lineEl) {
          lineEl.setAttribute('x1', prevX.toFixed(2));
          lineEl.setAttribute('y1', prevY.toFixed(2));
          lineEl.setAttribute('x2', tipX.toFixed(2));
          lineEl.setAttribute('y2', tipY.toFixed(2));
        }

        prevX = tipX;
        prevY = tipY;
        sumValue += HARMONIC_AMPS[i] * Math.sin(omegas[i] * t);
      }

      if (tipRef.current) {
        tipRef.current.setAttribute('cx', prevX.toFixed(2));
        tipRef.current.setAttribute('cy', prevY.toFixed(2));
      }

      if (waveformRef.current) {
        let points = '';
        for (let i = 0; i < WAVE_SAMPLES; i++) {
          const x = WAVE_X_START + (i / (WAVE_SAMPLES - 1)) * WAVE_X_RANGE;
          const timeAtX = t - (1 - i / (WAVE_SAMPLES - 1)) * WAVE_WINDOW;
          const y = EPICYCLE_CENTER_Y - fourierSum(timeAtX) * FOURIER_SCALE;
          points += `${x.toFixed(1)},${y.toFixed(1)} `;
        }
        waveformRef.current.setAttribute('points', points.trim());
      }

      if (trailLineRef.current) {
        trailLineRef.current.setAttribute('x1', prevX.toFixed(2));
        trailLineRef.current.setAttribute('y1', prevY.toFixed(2));
        trailLineRef.current.setAttribute('x2', String(WAVE_X_END));
        trailLineRef.current.setAttribute('y2', prevY.toFixed(2));
      }

      if (tLabelRef.current) tLabelRef.current.textContent = (t % 10).toFixed(2);
      if (sumLabelRef.current) sumLabelRef.current.textContent = sumValue.toFixed(3);
    }

    renderFrame(performance.now());

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timelines.push(tl);
    if (sceneRef.current) {
      tl.fromTo(sceneRef.current, { scale: 0.92, opacity: 0, y: 24 }, { scale: 1, opacity: 1, y: 0, duration: 0.7 });
    }
    const allCircleEls = circleRefs.current.filter(Boolean) as SVGCircleElement[];
    const allLineEls = lineRefs.current.filter(Boolean) as SVGLineElement[];
    if (allCircleEls.length) {
      tl.fromTo(allCircleEls, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.2);
    }
    if (allLineEls.length) {
      tl.fromTo(allLineEls, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.2);
    }
    if (chipRef.current) {
      tl.fromTo(chipRef.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }, '-=0.1');
    }
    if (stepRowsRef.current) {
      const rows = gsap.utils.toArray<HTMLElement>(stepRowsRef.current.children);
      tl.fromTo(rows, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }, '-=0.3');
    }

    if (!prefersReduced) {
      let fourierVisible = true;
      const fourierObserver = new IntersectionObserver(
        (entries) => {
          fourierVisible = entries[0]?.isIntersecting ?? false;
        },
        { threshold: 0.01 },
      );
      if (sceneRef.current) fourierObserver.observe(sceneRef.current);

      const tickerFn = () => {
        if (fourierVisible) renderFrame(performance.now());
      };
      gsap.ticker.add(tickerFn);
      tweens.push({
        kill: () => {
          gsap.ticker.remove(tickerFn);
          fourierObserver.disconnect();
        },
      } as unknown as gsap.core.Tween);
    }

    if (prefersReduced) {
      tl.progress(1);
      renderFrame(performance.now());
    }

    return () => {
      tweens.forEach((t) => t.kill());
      timelines.forEach((t) => t.kill());
    };
  }, []);

  /* GSAP batch reveal — a single IntersectionObserver drives ALL .gsap-reveal cards
     at once (replaces 7 framer-motion whileInView triggers + their observers).
     Feature cards get a dedicated stagger entrance (when the first one intersects,
     ALL feature cards animate together with stagger 0.08s). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.gsap-reveal'));
    const featureCards = Array.from(document.querySelectorAll<HTMLElement>('.feature-card'));

    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              { opacity: 0, y: 24 },
              {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: 'power2.out',
                onComplete: () => {
                  (entry.target as HTMLElement).style.willChange = 'auto';
                },
              },
            );
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-40px' },
    );

    const featureObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          gsap.fromTo(
            featureCards,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.08,
              ease: 'power2.out',
              onComplete: () => {
                featureCards.forEach((c) => (c.style.willChange = 'auto'));
              },
            },
          );
          featureCards.forEach((c) => featureObserver.unobserve(c));
        }
      },
      { rootMargin: '-40px' },
    );

    reveals.forEach((el) => {
      el.style.willChange = 'opacity, transform';
      if (featureCards.includes(el)) {
        featureObserver.observe(el);
      } else {
        cardObserver.observe(el);
      }
    });

    return () => {
      cardObserver.disconnect();
      featureObserver.disconnect();
    };
  }, []);

  /* GSAP infinite animations for the final CTA — dots scroll loop + glow pulses.
     These are the only infinite loops alongside the Fourier ticker. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tweens: gsap.core.Tween[] = [];
    if (ctaDotsRef.current) {
      tweens.push(
        gsap.to(ctaDotsRef.current, {
          backgroundPosition: '24px 24px',
          duration: 2,
          repeat: -1,
          ease: 'none',
        }),
      );
    }
    if (ctaGlow1Ref.current) {
      tweens.push(
        gsap.to(ctaGlow1Ref.current, {
          opacity: 0.4,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        }),
      );
    }
    if (ctaGlow2Ref.current) {
      tweens.push(
        gsap.to(ctaGlow2Ref.current, {
          opacity: 0.4,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.5,
        }),
      );
    }
    return () => tweens.forEach((t) => t.kill());
  }, []);

  /* ── RANDOM SHOOTING STARS ──
     Spawns a meteor every 0.6-1.8 s at a random position + angle, animates it
     across the sky with a fading tail, then removes it. Driven by JS timers
     (not CSS) so the angles + timings stay genuinely unpredictable. */
  const [shootingStars, setShootingStars] = useState<
    Array<{
      id: number;
      top: number;
      left: number;
      angle: number;
      distance: number;
      duration: number;
      delay: number;
      thickness: number;
      color: string;
    }>
  >([]);
  const shootingStarIdRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const spawnStar = () => {
      if (cancelled) return;
      // Star enters at a random position anywhere on screen and flies in a
      // truly random direction (0..360 deg).
      const top = Math.random() * 90 + 2;             // 2..92 % from top
      const left = Math.random() * 92 + 2;            // 2..94 % from left
      const angle = Math.random() * 360;              // any direction 0..360 deg
      const distance = 320 + Math.random() * 420;    // 320..740 px travel
      const duration = 700 + Math.random() * 800;    // 0.7..1.5 s
      const delay = 0;
      const thickness = 1 + Math.random() * 1.2;     // 1..2.2 px
      const palette = ['#e0f2fe', '#a5f3fc', '#c4b5fd', '#fde68a'];
      const color = palette[Math.floor(Math.random() * palette.length)];

      const id = shootingStarIdRef.current++;
      setShootingStars((prev) => [
        ...prev,
        { id, top, left, angle, distance, duration, delay, thickness, color },
      ]);
      // Auto-evict after the animation completes (so the array doesn't grow).
      setTimeout(() => {
        setShootingStars((prev) => prev.filter((s) => s.id !== id));
      }, duration + 200);

      // Schedule the NEXT spawn — random 0.6..1.8 s gap for a high meteor
      // shower feel (multiple stars often in flight simultaneously).
      const nextGap = 600 + Math.random() * 1200;
      timer = setTimeout(spawnStar, nextGap);
    };

    // First spawn after a short initial delay.
    timer = setTimeout(spawnStar, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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

  return (
    <div
      id="landing_page_container"
      onMouseMove={isDesktop ? handleMouseParallax : undefined}
      onMouseLeave={isDesktop ? resetMouseParallax : undefined}
      className="w-full min-h-screen text-slate-200 bg-[#05070e] relative font-sans flex flex-col overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300"
    >
      {/* ── REAL SPACE BACKGROUND ──
         A pure starfield — no nebula clouds, no 3D canvas (removed for performance).
         Layered parallax creates depth:
         1. Distant star field (slow parallax) — small twinkling pinpricks
         2. Mid star field (medium parallax) — brighter closer stars
         3. Near dust + shooting stars — fastest, foreground */}

      {/* Layer 2: Distant star field — slow parallax (scroll-Y + mouse-X) */}
      <motion.div
        aria-hidden
        style={{ y: bgFarMountainY, x: farMouseX }}
        className="absolute inset-0 pointer-events-none"
      >
        {Array.from({ length: 220 }).map((_, i) => {
          const seed = (i * 137) % 100;
          const top = ((i * 53) % 100);
          const left = ((i * 91) % 100);
          const size = 1 + (seed / 100) * 2; // 1-3px — bigger for real star visibility
          const dur = 3 + (seed % 5);
          // Multi-layer glow: tight core + medium halo + wide diffuse glow
          const glow = `0 0 ${size * 2}px rgba(255,255,255,0.8), 0 0 ${size * 4}px rgba(255,255,255,0.4), 0 0 ${size * 8}px rgba(99,179,237,0.2)`;
          return (
            <span
              key={`far-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.6,
                animation: `pp-twinkle ${dur}s ease-in-out infinite`,
                animationDelay: `-${(seed / 10).toFixed(1)}s`,
                boxShadow: glow,
              }}
            />
          );
        })}
      </motion.div>

      {/* Layer 3: Mid star field — medium parallax (scroll-Y + mouse-X) */}
      <motion.div
        aria-hidden
        style={{ y: bgMidMountainY, x: midMouseX }}
        className="absolute inset-0 pointer-events-none"
      >
        {Array.from({ length: 130 }).map((_, i) => {
          const top = ((i * 71) % 100);
          const left = ((i * 47) % 100);
          const size = 1.5 + (i % 3) * 0.8; // 1.5-3.9px — bigger + brighter
          const dur = 2.5 + (i % 4);
          const tint = i % 4 === 0 ? '#a5f3fc' : i % 4 === 1 ? '#c4b5fd' : i % 4 === 2 ? '#fde68a' : '#ffffff';
          // Color-matched multi-layer glow for each star tint
          const glowColor = i % 4 === 0 ? 'rgba(165,243,252' : i % 4 === 1 ? 'rgba(196,181,253' : i % 4 === 2 ? 'rgba(253,230,138' : 'rgba(255,255,255';
          const glow = `0 0 ${size * 2}px ${glowColor},0.9), 0 0 ${size * 5}px ${glowColor},0.4), 0 0 ${size * 10}px ${glowColor},0.15)`;
          return (
            <span
              key={`mid-${i}`}
              className="absolute rounded-full"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: tint,
                opacity: 0.7,
                animation: `pp-twinkle ${dur}s ease-in-out infinite`,
                animationDelay: `-${(i % 7 * 0.4).toFixed(1)}s`,
                boxShadow: glow,
              }}
            />
          );
        })}
      </motion.div>

      {/* Layer 4: Near dust + shooting stars — fast parallax (scroll-Y + mouse-X) */}
      <motion.div
        aria-hidden
        style={{ y: bgNearHillY, x: nearMouseX }}
        className="absolute inset-0 pointer-events-none"
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const top = ((i * 31) % 100);
          const left = ((i * 67) % 100);
          const size = 2 + (i % 3) * 0.5; // 2-3.5px — largest, closest stars
          const glow = `0 0 ${size * 3}px rgba(255,255,255,0.9), 0 0 ${size * 6}px rgba(255,255,255,0.5), 0 0 ${size * 12}px rgba(99,179,237,0.25)`;
          return (
            <span
              key={`near-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.85,
                animation: `pp-twinkle ${1.8 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `-${(i % 5 * 0.3).toFixed(1)}s`,
                boxShadow: glow,
              }}
            />
          );
        })}

        {/* Shooting stars — random angle/position/duration from the spawn effect */}
        {shootingStars.map((s) => (
          <span
            key={s.id}
            className="absolute pointer-events-none"
            style={
              {
                top: `${s.top}%`,
                left: `${s.left}%`,
                height: `${s.thickness}px`,
                width: '120px',
                background: `linear-gradient(to right, transparent 0%, ${s.color} 80%, ${s.color} 100%)`,
                borderRadius: '9999px',
                transform: `rotate(${s.angle}deg)`,
                transformOrigin: '0% 50%',
                '--ss-distance': `${s.distance}px`,
                boxShadow: `0 0 6px ${s.color}, 0 0 12px ${s.color}`,
                animation: `pp-shooting-star ${s.duration}ms cubic-bezier(0.4, 0.0, 0.2, 1) ${s.delay}ms forwards`,
              } as React.CSSProperties
            }
          />
        ))}
      </motion.div>

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
              className="w-1.5 h-1.5 rounded-full inline-block"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-3">
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
                onClick={onSignIn}
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[40px]"
              >
                Sign in
              </button>
            )}
            <button
              onClick={heroCtaOnClick}
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/20 transition-colors cursor-pointer min-h-[40px]"
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
              className="fixed inset-0 z-50 bg-black/60 md:hidden"
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
                <>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      onSignIn();
                    }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] text-left"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      onRegister();
                    }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-cyan-300 hover:text-cyan-200 hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] text-left"
                  >
                    Sign up free
                  </button>
                </>
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
        {/* Hero — 2-column (text left, Fourier animation right) */}
        <section
          id="hero"
          className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center"
        >
          {/* Text column — parallax (heroTextY), first on mobile AND first on desktop */}
          <motion.div
            style={{ y: heroTextY }}
            className="text-center md:text-left space-y-6 order-1 md:order-1"
          >
            {/* Trust badge with avatar stack — smaller on mobile */}
            <div
              className="gsap-reveal inline-flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-950/80 border border-white/10"
              style={{ opacity: 0 }}
            >
              <div className="flex -space-x-1.5 sm:-space-x-2">
                {AVATAR_INITIALS.map((i) => (
                  <span
                    key={i}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 text-white text-[8px] sm:text-[9px] font-bold flex items-center justify-center border-2 border-[#060814]"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-300 uppercase tracking-wider font-bold">
                Trusted by 2,400+ HSC students
              </span>
            </div>

            {/* Headline — text-3xl on mobile, sm:text-5xl, lg:text-6xl */}
            <GsapHeading
              as="h1"
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]"
            >
              Master your{' '}
              <span
                aria-hidden
                className="text-cyan-300"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.4))',
                  display: 'inline-block',
                }}
              >
                HSC science practicals
              </span>{' '}
              with AI precision.
            </GsapHeading>

            {/* Subhead — text-xs on mobile, sm:text-sm, md:text-[13.5px] */}
            <p
              className="gsap-reveal text-slate-400 text-xs sm:text-sm md:text-[13.5px] max-w-xl mx-auto md:mx-0 leading-relaxed"
              style={{ opacity: 0 }}
            >
              Ask Gemini questions 24/7 in Bangla or English, discuss with peers in live classroom
              chat, and commission pencil-shaded diagrams from Bangladeshi illustrators — all
              aligned with the verified NCTB 2026 syllabus, with your progress visible to your
              teachers.
            </p>

            {/* CTAs — full-width on mobile, side-by-side on sm+ */}
            <div
              className="gsap-reveal flex flex-col sm:flex-row gap-3 sm:justify-center md:justify-start"
              style={{ opacity: 0 }}
            >
              <button
                id={heroCtaId}
                onClick={heroCtaOnClick}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(6,182,212,0.3)] hover:shadow-[0_14px_36px_rgba(6,182,212,0.45)] transition-colors cursor-pointer min-h-[48px] w-full sm:w-auto"
              >
                {isAuthenticated ? <Layout className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{heroCtaLabel}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#subjects"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm border border-white/10 hover:border-white/20 transition-colors cursor-pointer min-h-[48px] w-full sm:w-auto"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Browse subjects</span>
              </a>
            </div>

            {/* Mini trust row — hidden on mobile, shown on sm+ */}
            <div
              className="gsap-reveal hidden sm:flex items-center justify-center md:justify-start gap-4 pt-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold font-mono"
              style={{ opacity: 0 }}
            >
              <span className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400" /> Real-time sync
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" /> NCTB 2026 verified
              </span>
            </div>
          </motion.div>

          {/* Fourier series animation — parallax (heroVizY), BELOW text on mobile, RIGHT on desktop.
              Floating math glyphs (∑ π ω ƒ) were removed per user request ("floating balls"). */}
          <motion.div
            style={{ y: heroVizY }}
            className="relative mx-auto w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[440px] order-2 md:order-2"
          >
            {/* Soft static glow under the scene */}
            <div
              aria-hidden
              className="absolute -inset-6 bg-gradient-to-br from-cyan-500/20 via-indigo-500/10 to-transparent blur-2xl pointer-events-none"
            />

            {/* The scene card itself — GSAP entrance */}
            <div
              ref={sceneRef}
              className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl shadow-cyan-950/40 overflow-hidden"
            >
              <div className="absolute inset-0 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
                <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-500">
                  <span>FOURIER · EPICYCLES</span>
                  <span className="text-cyan-400">7 harmonics · square wave</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-white truncate">
                  f(t) = (4/π) · Σ sin((2k−1)ωt)/(2k−1)
                </div>

                {/* SVG — epicycles on left (0-120), waveform on right (120-240) */}
                <div className="relative rounded-lg bg-slate-950/60 border border-white/5 p-1.5 sm:p-2 flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 240 160" className="w-full h-auto" aria-hidden>
                    <line
                      x1="120"
                      y1="8"
                      x2="120"
                      y2="152"
                      stroke="#1e293b"
                      strokeDasharray="2 2"
                      strokeWidth="0.8"
                    />
                    <circle cx="60" cy="80" r="0.8" fill="#475569" />
                    <polyline
                      ref={waveformRef}
                      fill="none"
                      stroke="#e0f2fe"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    {HARMONIC_KS.map((k, i) => (
                      <g key={`h${k}`}>
                        <circle
                          ref={(el) => { circleRefs.current[i] = el; }}
                          r={HARMONIC_AMPS[i] * 36}
                          fill={CIRCLE_COLORS[i]}
                          fillOpacity="0.05"
                          stroke={CIRCLE_COLORS[i]}
                          strokeWidth="1.5"
                          strokeOpacity="0.8"
                        />
                        <line
                          ref={(el) => { lineRefs.current[i] = el; }}
                          stroke={CIRCLE_COLORS[i]}
                          strokeWidth="1.2"
                          strokeOpacity="0.95"
                        />
                      </g>
                    ))}
                    <line
                      ref={trailLineRef}
                      stroke="#fbbf24"
                      strokeWidth="1.0"
                      strokeDasharray="1.5 1.5"
                      strokeOpacity="0.85"
                    />
                    <circle ref={tipRef} r="3" fill="#fde68a" stroke="#fbbf24" strokeWidth="1" />
                  </svg>

                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 font-mono text-[7px] sm:text-[8px] text-cyan-300 leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-cyan-300 rounded-full" />
                      <span>t = <span ref={tLabelRef}>0.00</span>s</span>
                    </div>
                    <div>Σ = <span ref={sumLabelRef}>0.000</span></div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/5 overflow-hidden text-[6px] sm:text-[7px] font-mono">
                  <div className="grid grid-cols-3 bg-slate-950/60 text-slate-400">
                    <div className="px-1.5 py-1 border-r border-white/5">k</div>
                    <div className="px-1.5 py-1 border-r border-white/5">Term</div>
                    <div className="px-1.5 py-1">A_k</div>
                  </div>
                  <div ref={stepRowsRef}>
                    {HARMONIC_ROWS.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 text-slate-300 border-t border-white/5"
                      >
                        <div className="px-1.5 py-0.5 border-r border-white/5 truncate">
                          {row[0]}
                        </div>
                        <div className="px-1.5 py-0.5 border-r border-white/5 truncate">
                          {row[1]}
                        </div>
                        <div className="px-1.5 py-0.5 text-emerald-400 truncate">
                          {row[2]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  ref={chipRef}
                  className="mt-auto flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 sm:px-2.5 py-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="font-mono">Fourier series · square wave approximation with 7 harmonics</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Stats bar — one-shot count-up only, no infinite animations */}
        <section id="stats" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
          <div id="stats_counter_banner" className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="gsap-reveal relative p-3 sm:p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-transform duration-200 overflow-hidden"
                style={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <AnimatedStat
                  value={stat.value}
                  className={`block text-2xl sm:text-3xl font-black font-mono tracking-tight ${stat.color}`}
                />
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-bold tracking-wider block mt-1">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Subjects showcase */}
        <section id="subjects" className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24">
          <ParallaxSectionHeading className="text-center space-y-2 max-w-2xl mx-auto mb-10">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              Subjects
            </span>
            <GsapHeading as="h2" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Master every HSC science subject
            </GsapHeading>
            <p className="text-sm text-slate-400">
              From Physics practicals to ICT programming — every experiment, organised.
            </p>
          </ParallaxSectionHeading>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {displaySubjects.map((s) => (
              <a
                key={s.id}
                href="#features"
                className="gsap-reveal group relative block rounded-2xl p-[1px] bg-gradient-to-br from-white/5 via-white/5 to-white/5 hover:from-cyan-500/30 hover:via-teal-500/30 hover:to-indigo-500/30 hover:-translate-y-1 transition-transform duration-300 cursor-pointer overflow-hidden"
                style={{ opacity: 0 }}
              >
                <div className="relative rounded-2xl bg-slate-950/80 p-5 h-full flex items-start gap-4">
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
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Features — 4 cards (Progress Tracking removed) */}
        <section
          id="features"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 border-t border-white/[0.06]"
        >
          <ParallaxSectionHeading className="text-center space-y-3 max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              Features
            </span>
            <GsapHeading as="h2" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Built for the 2026 HSC practical exam
            </GsapHeading>
            <p className="text-sm text-slate-400">
              Four tools that replace the chaos of paper notebooks and guesswork — with one
              verified workflow.
            </p>
          </ParallaxSectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="gsap-reveal feature-card group relative rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/5 to-transparent hover:from-cyan-500/40 hover:to-indigo-500/40 hover:-translate-y-1 transition-transform duration-300 overflow-hidden"
                style={{ opacity: 0 }}
              >
                <div className="relative rounded-2xl bg-slate-950/80 p-6 h-full flex flex-col gap-3">
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
              </div>
            ))}
          </div>
        </section>

        {/* How it works — 3-step timeline with CSS-keyframe flowing dashed line */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 border-t border-white/[0.06]"
        >
          <ParallaxSectionHeading className="text-center space-y-2 max-w-2xl mx-auto mb-12">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              How it works
            </span>
            <GsapHeading as="h2" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Three steps to a perfect notebook
            </GsapHeading>
          </ParallaxSectionHeading>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {/* Flowing dashed connector (desktop only) — CSS keyframes */}
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

            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.n}
                className="gsap-reveal relative text-center space-y-3 px-4"
                style={{ opacity: 0 }}
              >
                <div className="relative mx-auto w-14 h-14 rounded-full bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center text-xl font-black font-mono text-cyan-400 shadow-lg shadow-cyan-500/20">
                  {step.n}
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements — keep existing logic, no infinite per-card animations */}
        <section
          id="announcements"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 border-t border-white/[0.06]"
        >
          <div id="bulletin_announcements_section" className="space-y-10">
            <ParallaxSectionHeading className="text-center md:text-left space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-indigo-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                Notice board
              </span>
              <GsapHeading as="h2" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Live educator notice board
              </GsapHeading>
              <p className="text-sm text-slate-400 max-w-xl">
                Recent circulars, schedule adjustments, and bulletin notices published live by senior
                administrators.
              </p>
            </ParallaxSectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {announcements && announcements.length > 0 ? (
                announcements.slice(0, 3).map((ann: any, i: number) => (
                  <article
                    key={ann.id ?? i}
                    className="gsap-reveal relative overflow-hidden rounded-2xl bg-slate-950/80 border border-white/10 p-5 flex flex-col gap-4 hover:border-white/20 hover:-translate-y-0.5 transition-transform"
                    style={{ opacity: 0 }}
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
                  </article>
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

        {/* Marketplace highlight — "Browse Marketplace" now uses onBrowseMarketplace */}
        <section
          id="marketplace"
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 border-t border-white/[0.06]"
        >
          <div
            className="gsap-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-indigo-950/40 border border-indigo-500/20 p-6 sm:p-8 md:p-10 hover:-translate-y-1 transition-transform duration-300"
            style={{ opacity: 0 }}
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 cursor-pointer min-h-[48px] transition-transform"
                >
                  Consult Sketch Artists
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onBrowseMarketplace}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold tracking-wide rounded-xl hover:-translate-y-0.5 cursor-pointer min-h-[48px] transition-transform"
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — accordion with 4 items */}
        <section
          id="faq"
          className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24 border-t border-white/[0.06]"
        >
          <ParallaxSectionHeading className="text-center space-y-2 max-w-2xl mx-auto mb-10">
            <span className="inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 font-bold">
              FAQ
            </span>
            <GsapHeading as="h2" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Frequently asked questions
            </GsapHeading>
          </ParallaxSectionHeading>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border overflow-hidden transition-colors ${
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
          className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16 lg:py-24"
        >
          <div
            className="gsap-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-indigo-600 to-purple-700 p-6 sm:p-8 md:p-12 lg:p-16 text-center"
            style={{ opacity: 0 }}
          >
            {/* GSAP-animated decorative dot pattern (infinite loop) */}
            <div
              ref={ctaDotsRef}
              aria-hidden
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* GSAP glow pulses (infinite yoyo) */}
            <div
              ref={ctaGlow1Ref}
              aria-hidden
              className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none"
            />
            <div
              ref={ctaGlow2Ref}
              aria-hidden
              className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"
            />

            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <GsapHeading as="h2" className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to ace your HSC practical exam?
              </GsapHeading>
              <p className="text-cyan-100 text-base sm:text-lg leading-relaxed">
                Join 2,400+ Bangladeshi students who trust PracPedia for verified procedures,
                Gemini-powered help, and pro illustrations. Free to start — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  id="cta_final_btn"
                  onClick={heroCtaOnClick}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white text-slate-900 font-bold text-sm tracking-wide shadow-2xl hover:bg-slate-100 hover:-translate-y-0.5 transition-transform cursor-pointer min-h-[48px] w-full sm:w-auto"
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
          </div>
        </section>
      </main>

      {/* Footer (3-column) */}
      <footer
        id="landing_footer"
        className="relative z-10 border-t border-white/[0.06] bg-[#060814]/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Logo size="lg" />
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              The premium practical notebook portal for Bangladesh HSC science students — verified,
              AI-assisted, and pro-illustrated.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Officially linked with student communities
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] text-slate-300 font-bold uppercase tracking-wider font-mono">
              Quick links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
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
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px]"
            >
              <Mail className="w-4 h-4" /> hello@pracpedia.bd
            </a>
            <button
              type="button"
              onClick={onEnter}
              className="block text-xs sm:text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] text-left"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={onEnter}
              className="block text-xs sm:text-sm text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer min-h-[28px] text-left"
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
