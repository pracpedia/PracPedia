'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Compass } from 'lucide-react';

export const DataLoader: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Ring infinite rotating animation
    gsap.to(ringRef.current, {
      rotate: 360,
      duration: 3,
      repeat: -1,
      ease: "none",
    });

    // 2. Ticking progress interval matching realistic network queries
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress < 100) {
        setProgress(currentProgress);
      } else {
        setProgress(100);
        clearInterval(interval);
      }
    }, 150);

    // 3. Staggered reveal of text characters
    const letters = textContainerRef.current?.querySelectorAll('.loading-char');
    if (letters && letters.length > 0) {
      gsap.fromTo(letters,
        { opacity: 0.1, y: 10, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.05,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut"
        }
      );
    }

    // 4. Grid particle movement animation
    const dots = containerRef.current?.querySelectorAll('.grid-dot');
    if (dots && dots.length > 0) {
      gsap.fromTo(dots,
        { scale: 0.5, opacity: 0.1 },
        {
          scale: 1.5,
          opacity: 0.7,
          duration: 1.2,
          stagger: {
            amount: 0.8,
            grid: [3, 3],
            from: "center"
          },
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }
      );
    }

    // 5. Arabic script floating / soft-glow animation
    const arabicTxt = containerRef.current?.querySelector('.arabic-text');
    if (arabicTxt) {
      gsap.fromTo(arabicTxt,
        { filter: "drop-shadow(0 0 2px rgba(6, 182, 212, 0.2))", y: 2 },
        {
          filter: "drop-shadow(0 0 12px rgba(99, 102, 241, 0.6))",
          y: -2,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }
      );
    }

    return () => {
      clearInterval(interval);
      gsap.killTweensOf([ringRef.current, letters, dots, arabicTxt]);
    };
  }, []);

  const titleText = "SYNCHRONIZING";

  return (
    <div
      ref={containerRef}
      className="rounded-3xl inset-0 w-full h-full flex flex-col items-center justify-center min-h-screen lg:min-h-screen relative overflow-hidden bg-[#05070e] p-4 space-y-6 z-40"
    >
      {/* Decorative background grid network */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-2 sm:gap-4 p-4 sm:p-8 opacity-20 pointer-events-none select-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="grid-dot w-1 h-1 bg-cyan-400 rounded-full mx-auto my-auto"
          />
        ))}
      </div>

      {/* Animated Arabic text + translation — ABOVE the spinner */}
      <div className="text-center relative z-10 select-none flex flex-col items-center justify-center gap-2">
        <div className="arabic-text text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-amber-200 to-[#fbbf24] bg-clip-text text-transparent px-4 py-2 filter text-center font-arabic leading-relaxed max-w-full" style={{ direction: 'rtl' }}>
          رَبِّ زِدْنِي عِلْمًا
        </div>
        <span className="text-xs sm:text-sm font-sans font-bold tracking-widest text-[#fbbf24] uppercase italic opacity-90 text-center px-2">
          &ldquo;My Lord, increase me in knowledge&rdquo;
        </span>
      </div>

      {/* Orbit ring — centered */}
      <div className="relative flex items-center justify-center shrink-0 z-10">
        {/* Secondary ring decoration */}
        <div className="absolute w-28 h-28 rounded-full border border-dashed border-cyan-500/10 animate-ping opacity-45" />

        {/* Orbit ring handled by GSAP */}
        <div
          ref={ringRef}
          className="w-24 h-24 rounded-full border-4 border-t-[#06b6d4] border-r-indigo-500/20 border-b-slate-900 border-l-[#fbbf24]/30 flex items-center justify-center shadow-lg shadow-cyan-500/5"
        />

        {/* Core scientific apparatus icon */}
        <span className="absolute">
          <Compass className="w-8 h-8 text-[#06b6d4] animate-pulse" />
        </span>
      </div>

      {/* Synchronizing text + progress — BELOW the spinner */}
      <div className="space-y-2 text-center relative z-10 max-w-full overflow-hidden">
        <div
          ref={textContainerRef}
          className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap"
        >
          {titleText.split("").map((char, index) => (
            <span
              key={index}
              className="loading-char text-xs font-black font-mono tracking-widest text-slate-100 uppercase"
            >
              {char}
            </span>
          ))}
        </div>

        {/* Running calibration percentages and loading index details */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono tracking-wider flex-wrap">
          <span className="text-[#fbbf24] font-black">{progress}%</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-slate-500 font-sans uppercase">SECURE SHEETS CACHE REGISTRY</span>
        </div>
      </div>
    </div>
  );
};
