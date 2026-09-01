'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';

/**
 * Constellation hero — the right column of the landing hero.
 *
 * Replaces the old Fourier epicycles (the "moving balls"). This is a real
 * space-themed visualization: a constellation of stars connected by faint
 * lines, with a central pulsar. Stars twinkle independently, the whole
 * constellation parallaxes with the mouse, and a faint orbiting ring gives
 * a sense of motion without any visible "ball" silhouette.
 *
 * State-of-the-art parallax:
 *   - Mouse-move parallax: 3 layers move at different rates based on cursor
 *     position (background stars slow, constellation mid, foreground fast)
 *   - Scroll parallax: the whole scene drifts up as the user scrolls
 *   - Spring smoothing: mouse parallax uses framer-motion useSpring for
 *     buttery interpolation (no jitter)
 *   - Independent twinkles: each star has its own animation-delay + duration
 */

interface StarNode {
  id: number;
  x: number; // 0..100 (% of svg width)
  y: number; // 0..100
  r: number; // radius in svg units
  twinkleDur: number; // seconds
  twinkleDelay: number; // seconds
  bright: boolean;
}

// Constellation pattern — designed to vaguely evoke "Orion" with a sword.
// Coordinates are in 0..100 viewBox space.
const CONSTELLATION_STARS: StarNode[] = [
  { id: 1,  x: 22, y: 18, r: 1.8, twinkleDur: 3.2, twinkleDelay: 0,    bright: true  }, // Betelgeuse (top-left shoulder)
  { id: 2,  x: 70, y: 22, r: 1.5, twinkleDur: 4.0, twinkleDelay: 0.4,  bright: true  }, // Bellatrix (top-right shoulder)
  { id: 3,  x: 38, y: 50, r: 1.3, twinkleDur: 3.5, twinkleDelay: 0.8,  bright: false }, // belt left
  { id: 4,  x: 50, y: 53, r: 1.6, twinkleDur: 2.8, twinkleDelay: 0.2,  bright: true  }, // belt middle
  { id: 5,  x: 62, y: 56, r: 1.3, twinkleDur: 3.7, twinkleDelay: 1.1,  bright: false }, // belt right
  { id: 6,  x: 30, y: 82, r: 1.7, twinkleDur: 4.2, twinkleDelay: 0.6,  bright: true  }, // Saiph (bottom-left)
  { id: 7,  x: 72, y: 80, r: 1.6, twinkleDur: 3.3, twinkleDelay: 1.4,  bright: true  }, // Rigel (bottom-right)
  { id: 8,  x: 48, y: 68, r: 0.9, twinkleDur: 2.5, twinkleDelay: 0.3,  bright: false }, // sword top
  { id: 9,  x: 51, y: 74, r: 1.0, twinkleDur: 3.0, twinkleDelay: 0.9,  bright: false }, // sword middle (M42)
  { id: 10, x: 53, y: 80, r: 0.8, twinkleDur: 2.7, twinkleDelay: 1.6,  bright: false }, // sword bottom
  { id: 11, x: 15, y: 45, r: 0.7, twinkleDur: 4.5, twinkleDelay: 1.2,  bright: false }, // ambient
  { id: 12, x: 85, y: 50, r: 0.7, twinkleDur: 3.9, twinkleDelay: 0.5,  bright: false }, // ambient
  { id: 13, x: 12, y: 70, r: 0.6, twinkleDur: 4.1, twinkleDelay: 1.8,  bright: false }, // ambient
  { id: 14, x: 88, y: 70, r: 0.6, twinkleDur: 3.4, twinkleDelay: 0.7,  bright: false }, // ambient
];

// Connections between constellation stars (by id) — draws the constellation lines.
const CONSTELLATION_LINES: Array<[number, number]> = [
  [1, 3], [2, 5], [3, 4], [4, 5],   // shoulders to belt + belt line
  [3, 6], [5, 7],                    // belt to feet
  [4, 8], [8, 9], [9, 10],          // sword
];

// Background ambient stars (not part of the constellation) — pure decoration.
const AMBIENT_STARS = Array.from({ length: 40 }, (_, i) => ({
  id: `amb-${i}`,
  x: (i * 73) % 100,
  y: (i * 41) % 100,
  r: 0.3 + ((i * 17) % 5) * 0.1,
  dur: 2.5 + (i % 5),
  delay: (i % 7) * 0.4,
}));

export const ConstellationHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Mouse parallax (spring-smoothed) ──────────────────────────────────
  // Map cursor position (-0.5..0.5 on both axes) to a parallax offset.
  // Three layers move at different rates: background (0.3x), constellation
  // (1x), foreground glow (1.6x). useSpring gives buttery interpolation.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 20, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20, mass: 0.5 });

  // Background layer — moves slowest (0.3x of mouse delta)
  const bgX = useTransform(springX, [-0.5, 0.5], [-15, 15]);
  const bgY = useTransform(springY, [-0.5, 0.5], [-10, 10]);
  // Constellation layer — medium (1x)
  const conX = useTransform(springX, [-0.5, 0.5], [-30, 30]);
  const conY = useTransform(springY, [-0.5, 0.5], [-20, 20]);
  // Foreground glow — fastest (1.6x)
  const fgX = useTransform(springX, [-0.5, 0.5], [-45, 45]);
  const fgY = useTransform(springY, [-0.5, 0.5], [-30, 30]);

  // ── Scroll parallax ───────────────────────────────────────────────────
  const { scrollY } = useScroll();
  const scrollYOffset = useTransform(scrollY, [0, 700], [0, -80]);

  // Track mouse relative to the container center
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      style={{ y: scrollYOffset }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[440px] order-2 md:order-2"
    >
      {/* Foreground glow — fastest parallax layer */}
      <motion.div
        aria-hidden
        style={{ x: fgX, y: fgY }}
        className="absolute -inset-6 bg-gradient-to-br from-cyan-500/15 via-indigo-500/8 to-transparent blur-2xl pointer-events-none"
      />

      {/* The scene card — pure space, no balls */}
      <motion.div
        style={{ x: conX, y: conY }}
        className="relative aspect-[4/5] rounded-2xl bg-gradient-to-br from-[#02030a] to-[#060814] border border-white/10 shadow-2xl shadow-cyan-950/40 overflow-hidden"
      >
        {/* Background ambient stars layer — slowest parallax */}
        <motion.div
          aria-hidden
          style={{ x: bgX, y: bgY }}
          className="absolute inset-0 pointer-events-none"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {AMBIENT_STARS.map((s) => (
              <circle
                key={s.id}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#ffffff"
                opacity={0.5}
                style={{
                  animation: `pp-twinkle ${s.dur}s ease-in-out infinite`,
                  animationDelay: `-${s.delay}s`,
                  transformOrigin: `${s.x}px ${s.y}px`,
                }}
              />
            ))}
          </svg>
        </motion.div>

        {/* The constellation — medium parallax */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* Faint connecting lines */}
          {CONSTELLATION_LINES.map(([a, b], i) => {
            const sa = CONSTELLATION_STARS.find(s => s.id === a)!;
            const sb = CONSTELLATION_STARS.find(s => s.id === b)!;
            return (
              <line
                key={`line-${i}`}
                x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                stroke="#22d3ee"
                strokeWidth={0.15}
                strokeOpacity={0.25}
                strokeDasharray="0.5 0.5"
              />
            );
          })}

          {/* Constellation stars — each twinkles independently */}
          {CONSTELLATION_STARS.map((star) => (
            <g key={`star-${star.id}`}>
              {/* Soft glow halo for bright stars */}
              {star.bright && (
                <circle
                  cx={star.x}
                  cy={star.y}
                  r={star.r * 3}
                  fill="#22d3ee"
                  opacity={0.12}
                  style={{
                    animation: `pp-twinkle ${star.twinkleDur}s ease-in-out infinite`,
                    animationDelay: `-${star.twinkleDelay}s`,
                    transformOrigin: `${star.x}px ${star.y}px`,
                  }}
                />
              )}
              <circle
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill={star.bright ? '#e0f2fe' : '#94a3b8'}
                style={{
                  animation: `pp-twinkle ${star.twinkleDur}s ease-in-out infinite`,
                  animationDelay: `-${star.twinkleDelay}s`,
                  transformOrigin: `${star.x}px ${star.y}px`,
                }}
              />
            </g>
          ))}
        </motion.svg>

        {/* Center pulsar — a tiny cross-shaped sparkle (NOT a ball) */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: '2px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, #22d3ee, transparent)',
            opacity: 0.6,
            animation: 'pp-twinkle 2.5s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: '40px',
            height: '2px',
            background: 'linear-gradient(to right, transparent, #22d3ee, transparent)',
            opacity: 0.6,
            animation: 'pp-twinkle 2.5s ease-in-out infinite',
            animationDelay: '-0.5s',
          }}
        />

        {/* Caption — bottom-left, monospace, very subtle */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-500 pointer-events-none">
          <span>CONSTELLATION · ORION</span>
          <span className="text-cyan-400">★ 13 stars</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
