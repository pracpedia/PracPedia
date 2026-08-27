'use client';

import { useEffect } from 'react';
import { installErrorCapture } from '@/lib/client-error-capture';
import { ErrorBoundary } from '@/components/features/ErrorBoundary';

/**
 * Mounts the global client-side error listeners on first render, then wraps
 * the children in a top-level React error boundary.
 *
 * Mounted once from app/layout.tsx so every page is covered.
 */
export function ErrorCaptureGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installErrorCapture();
  }, []);

  return (
    <ErrorBoundary name="PracPedia Root">
      {children}
    </ErrorBoundary>
  );
}
