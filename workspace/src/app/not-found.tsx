import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

/**
 * App Router not-found.tsx — shown automatically by Next.js when a route
 * doesn't match any file.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070e] px-4 text-slate-200 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(168,85,247,0.20) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,211,238,0.15) 0%, transparent 50%)',
          filter: 'blur(60px)',
        }}
      />
      <div className="relative z-10 max-w-lg w-full rounded-3xl bg-slate-900/60 border border-white/10 p-8 sm:p-10 text-center space-y-5 backdrop-blur-md">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <Compass className="w-7 h-7 text-cyan-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            404
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            We couldn&apos;t find the page you were looking for. The link may be
            broken, or the page may have been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
