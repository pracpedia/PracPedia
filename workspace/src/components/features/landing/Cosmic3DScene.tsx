'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useScroll } from 'framer-motion';

/**
 * 3D cosmic scene for the landing page hero.
 *
 * Renders:
 *   - A sphere of ~2000 twinkling 3D points (a "star globe")
 *   - A nested inner star cloud of ~800 points for depth
 *   - Slowly rotating around the Y axis
 *   - Slight parallax tilt driven by scroll (via framer-motion useScroll)
 *
 * Designed to layer BEHIND the existing 2D shooting-stars + nebula layers
 * (z-index 0) so the 2D foreground stays crisp and interactive. The Canvas
 * is `pointer-events: none` so it never blocks clicks.
 *
 * Performance:
 *   - ~2800 points total; renders in <2ms per frame on a modern GPU
 *   - DPR capped at 1.5 to avoid over-rendering on retina displays
 *   - `powerPreference: 'low-power'` to avoid kicking the GPU into high gear
 */

function StarGlobe() {
  const ref = useRef<THREE.Points>(null);

  // Generate 2000 random points on a sphere of radius 4.
  const positions = useMemo(() => {
    const count = 2000;
    const arr = new Float32Array(count * 3);
    const radius = 4;
    for (let i = 0; i < count; i++) {
      // Random direction on a sphere
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      const r = radius * (0.85 + Math.random() * 0.15); // slight shell variation
      arr[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }, []);

  // Slow rotation around the Y axis. Read scroll progress to add a subtle
  // parallax tilt on the Z axis as the user scrolls down.
  const { scrollYProgress } = useScroll();
  useFrame(() => {
    if (!ref.current) return;
    // Continuous slow spin
    ref.current.rotation.y += 0.0008;
    ref.current.rotation.x += 0.0003;
    // Subtle scroll-driven tilt (scrollYProgress is 0..1 across the whole page)
    const tilt = (scrollYProgress.get() - 0.5) * 0.6;
    ref.current.rotation.z = tilt;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#a5f3fc"
        size={0.025}
        sizeAttenuation
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  );
}

/**
 * A second, smaller, faster-rotating star cloud nested inside the globe —
 * gives the scene depth (near stars + far stars in 3D space).
 */
function InnerStarCloud() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 800;
    const arr = new Float32Array(count * 3);
    const radius = 2;
    for (let i = 0; i < count; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.3);
      arr[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.y -= 0.0015;
    ref.current.rotation.x -= 0.0008;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c4b5fd"
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
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
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <StarGlobe />
        <InnerStarCloud />
      </Canvas>
    </div>
  );
};
