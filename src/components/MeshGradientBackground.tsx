'use client';

/**
 * MeshGradientBackground — premium animated mesh gradient (dynamic version).
 *
 * Features:
 *   - 4 large blurred radial blobs that DRIFT, ROTATE, and MORPH simultaneously
 *   - Faster movement (10-16s loops instead of 22-30s) for visible motion
 *   - Border-radius animation makes blobs change shape (organic, liquid feel)
 *   - Floating particle layer on top for extra "alive" feel
 *   - Slow shimmer sweep for premium filmic texture
 *   - Grain + vignette overlays for depth
 *
 * Pure Framer Motion + CSS — GPU-accelerated (transform/opacity/clip only).
 *
 * Usage:  <MeshGradientBackground />  — place once per page as the FIRST child.
 * Parent wrapper should be marked `relative z-10` so content sits above.
 */

import { motion } from 'framer-motion';

export function MeshGradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden bg-[#020617] pointer-events-none"
    >
      {/* ──────────────────────────────────────────────────────────
          BLOB LAYER — 4 large drifting + rotating + morphing blobs
         ────────────────────────────────────────────────────────── */}

      {/* ── Blob 1 — Cyan, top-left, fast drift + rotation + morph ── */}
      <motion.div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.55) 0%, transparent 70%)',
          filter: 'blur(70px)',
          top: -180,
          left: -120,
          borderRadius: '50%',
        }}
        animate={{
          x: [0, 140, -80, 60, 0],
          y: [0, -90, 110, -40, 0],
          rotate: [0, 90, 180, 270, 360],
          borderRadius: [
            '50% 50% 50% 50%',
            '60% 40% 55% 45%',
            '45% 55% 40% 60%',
            '55% 45% 60% 40%',
            '50% 50% 50% 50%',
          ],
          scale: [1, 1.2, 0.85, 1.1, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ── Blob 2 — Violet, bottom-right, counter-rotation + morph ── */}
      <motion.div
        className="absolute"
        style={{
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)',
          filter: 'blur(80px)',
          bottom: -240,
          right: -160,
          borderRadius: '50%',
        }}
        animate={{
          x: [0, -120, 90, -50, 0],
          y: [0, 80, -100, 60, 0],
          rotate: [0, -90, -180, -270, -360],
          borderRadius: [
            '50% 50% 50% 50%',
            '40% 60% 45% 55%',
            '55% 45% 60% 40%',
            '45% 55% 40% 60%',
            '50% 50% 50% 50%',
          ],
          scale: [1, 0.9, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ── Blob 3 — Blue, center, fast rotation + aggressive morph ── */}
      <motion.div
        className="absolute"
        style={{
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, transparent 70%)',
          filter: 'blur(60px)',
          top: '30%',
          left: '40%',
          borderRadius: '50%',
        }}
        animate={{
          x: [0, 90, -110, 70, 0],
          y: [0, -70, 80, -50, 0],
          rotate: [0, 180, 360, 540, 720],
          borderRadius: [
            '50% 50% 50% 50%',
            '65% 35% 50% 50%',
            '50% 50% 35% 65%',
            '35% 65% 50% 50%',
            '50% 50% 50% 50%',
          ],
          scale: [1, 1.15, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ── Blob 4 — Amber accent, top-right, fast small loop ── */}
      <motion.div
        className="absolute"
        style={{
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)',
          filter: 'blur(50px)',
          top: '8%',
          right: '4%',
          borderRadius: '50%',
        }}
        animate={{
          x: [0, -80, 60, -40, 0],
          y: [0, 100, -70, 50, 0],
          rotate: [0, 120, 240, 360, 480],
          borderRadius: [
            '50% 50% 50% 50%',
            '55% 45% 50% 50%',
            '50% 50% 45% 55%',
            '45% 55% 50% 50%',
            '50% 50% 50% 50%',
          ],
          scale: [1, 1.1, 0.85, 1.05, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ──────────────────────────────────────────────────────────
          FLOATING PARTICLES LAYER — tiny dots drifting upward
         ────────────────────────────────────────────────────────── */}
      {[
        { left: '12%', size: 3, duration: 18, delay: 0, color: '#22d3ee' },
        { left: '24%', size: 2, duration: 22, delay: 2, color: '#a855f7' },
        { left: '38%', size: 4, duration: 20, delay: 5, color: '#3b82f6' },
        { left: '52%', size: 2, duration: 24, delay: 1, color: '#22d3ee' },
        { left: '64%', size: 3, duration: 19, delay: 7, color: '#a855f7' },
        { left: '76%', size: 2, duration: 21, delay: 3, color: '#3b82f6' },
        { left: '88%', size: 3, duration: 23, delay: 6, color: '#22d3ee' },
        { left: '18%', size: 2, duration: 25, delay: 9, color: '#f59e0b' },
        { left: '45%', size: 3, duration: 17, delay: 11, color: '#22d3ee' },
        { left: '70%', size: 2, duration: 26, delay: 13, color: '#a855f7' },
        { left: '32%', size: 4, duration: 28, delay: 4, color: '#3b82f6' },
        { left: '82%', size: 2, duration: 20, delay: 15, color: '#f59e0b' },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: -20,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            opacity: 0.6,
          }}
          animate={{
            y: [0, -1100],
            x: [0, 30, -20, 10, 0],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* ──────────────────────────────────────────────────────────
          SHIMMER SWEEP — diagonal light sweep across the canvas
         ────────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(34, 211, 238, 0.04) 50%, transparent 60%)',
          backgroundSize: '300% 300%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ──────────────────────────────────────────────────────────
          GRAIN OVERLAY (filmic noise)
         ────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ──────────────────────────────────────────────────────────
          VIGNETTE (darkens edges for depth)
         ────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(2, 6, 23, 0.5) 100%)',
        }}
      />
    </div>
  );
}
