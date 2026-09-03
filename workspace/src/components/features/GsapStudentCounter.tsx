'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface GsapStudentCounterProps {
  studentsCount: number;
}

export const GsapStudentCounter: React.FC<GsapStudentCounterProps> = ({ studentsCount }) => {
  const countRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kill any tweens from a previous run before creating new ones.
    // Without this, every `studentsCount` change stacks new tweens on top
    // of the old ones, and the old onUpdate callbacks keep firing on
    // stale refs (memory leak + visual jank).
    gsap.killTweensOf(countRef.current);
    gsap.killTweensOf(containerRef.current);

    if (countRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: studentsCount,
        duration: 2.2,
        ease: "power4.out",
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.innerText = Math.floor(obj.val).toString();
          }
        }
      });
    }

    if (containerRef.current) {
      // Stagger elastic/spring scaling entrance animation
      gsap.fromTo(containerRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.0, ease: "elastic.out(1, 0.8)" }
      );
    }

    // Cleanup on unmount or before next re-run — kill all tweens targeting
    // these elements so they don't fire onUpdate on stale refs.
    return () => {
      gsap.killTweensOf(countRef.current);
      gsap.killTweensOf(containerRef.current);
    };
  }, [studentsCount]);

  return (
    <div
      ref={containerRef}
      className="p-4 sm:p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#1c1917]/40 via-[#0c0a09] to-[#0c0a09] border border-orange-500/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6"
    >
      {/* Decorative blurred lights */}
      <div className="absolute top-0 right-0 h-48 w-48 -mr-12 -mt-12 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -ml-12 -mb-12 rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

      <div className="space-y-2 text-center md:text-left max-w-full">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1c1917]/80 border border-amber-500/15 text-[9px] text-[#fbbf24] font-mono tracking-widest font-extrabold uppercase">
          ✦ Real-Time Student Activity
        </div>
        <h3 className="text-base font-black text-stone-200 tracking-tight font-sans">
          Active Scholar Presence
        </h3>
        <p className="text-xs text-stone-400 max-w-lg max-w-full leading-relaxed font-medium">
          The current number of active students currently engaged with coursework materials in this classroom folder. Admins are excluded automatically from the presence count.
        </p>
      </div>

      <div className="relative flex items-center justify-center shrink-0 w-32 h-32 border border-white/5 bg-[#12100e] rounded-full shadow-inner select-none">
        {/* Animated concentric loader rings using standard CSS spin class */}
        <div className="absolute inset-1.5 border border-dashed border-amber-500/20 rounded-full animate-spin [animation-duration:18s]" />
        <div className="absolute inset-3 border border-amber-500/5 rounded-full" />
        <div className="absolute inset-4.5 border border-dashed border-rose-500/20 rounded-full animate-spin [animation-direction:reverse] [animation-duration:10s]" />

        {/* Rolling count text display */}
        <div className="text-center space-y-0.5">
          <span
            ref={countRef}
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-amber-200 to-[#fbbf24] bg-clip-text text-transparent font-sans"
          >
            0
          </span>
          <span className="block text-[8px] tracking-widest font-extrabold text-stone-550 font-mono uppercase">
            Active Now
          </span>
        </div>
      </div>
    </div>
  );
};
