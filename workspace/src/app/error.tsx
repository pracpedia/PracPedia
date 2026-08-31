'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * App Router error.tsx — shown automatically by Next.js when an uncaught
 * error is thrown in a server component or during streaming.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[App Router error.tsx]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070e] px-4 text-slate-200">
      <div className="max-w-lg w-full rounded-3xl bg-slate-900/60 border border-white/10 p-8 sm:p-10 text-center space-y-5 backdrop-blur-md">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-rose-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            An unexpected error occurred while rendering this page. You can try
            again, or head back to the home page.
          </p>
        </div>
        {error?.digest && (
          <p className="text-[10px] text-slate-600 font-mono break-all">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-colors min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
