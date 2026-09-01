'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useScroll } from 'framer-motion';

/**
 * 3D starfield for the landing page — real space, NOT a "ball".
 *
 * The previous version rendered points on a SPHERE of radius 4 — when it
 * rotated, the silhouette of the sphere was visible as a glowing ball. This
 * rewrite scatters points uniformly through a CUBE of 3D space (a "star box")
 * so there's no visible shape, just depth — exactly like looking up at the
 * night sky.
 *
 * Three layers of stars at different depths:
 *   - Far:   1500 points, very small, dim, slow drift
 *   - Mid:   1000 points, small, medium brightness, medium drift
 *   - Near:   500 points, larger, bright, faster drift (gives parallax)
 *
 * The whole starfield pans VERY slowly (not rotate) — a tiny camera-style
 * drift that suggests "floating through space" without the visible rotation
 * that made the sphere look like a ball.
 */

function StarLayer({
  count,
  boxSize,
  size,
  color,
  opacity,
  driftSpeed,
}: {
  count: number;
  boxSize: number;
  size: number;
  color: string;
  opacity: number;
  driftSpeed: number;
}) {
  const ref = useRef<THREE.Points>(null);

  // Scatter points uniformly through a cube of `boxSize` (centered at origin).
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const half = boxSize / 2;
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * boxSize;       // x
      arr[i * 3 + 1] = (Math.random() - 0.5) * boxSize;   // y
      arr[i * 3 + 2] = (Math.random() - 0.5) * boxSize;   // z
    }
    return arr;
  }, [count, boxSize]);

  // Very slow pan (not rotate) — suggests drifting through space.
  // Scroll adds a subtle parallax shift on the Z axis.
  const { scrollYProgress } = useScroll();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.x += driftSpeed * 0.0001;
    ref.current.position.y += driftSpeed * 0.00005;
    // Scroll-driven parallax — drift the layer backward as you scroll
    const scrollShift = (scrollYProgress.get() - 0.5) * 2;
    ref.current.position.z = -scrollShift * (boxSize * 0.1);
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        opacity={opacity}
      />
    </Points>
  );
}

export const Cosmic3DScene: React.FC = () => {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        {/* Three star layers at different depths — real space, no sphere */}
        <StarLayer count={1500} boxSize={20} size={0.015} color="#ffffff" opacity={0.5} driftSpeed={1} />
        <StarLayer count={1000} boxSize={14} size={0.025} color="#a5f3fc" opacity={0.7} driftSpeed={2} />
        <StarLayer count={500} boxSize={10} size={0.035} color="#c4b5fd" opacity={0.85} driftSpeed={3.5} />
      </Canvas>
    </div>
  );
};
