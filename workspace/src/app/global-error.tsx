'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * App Router global-error.tsx — the root error fallback. Shown when an
 * error propagates all the way up past the root layout. Must render its
 * own <html> and <body> tags because the root layout is replaced.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[App Router global-error.tsx]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: '#05070e', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', borderRadius: '1.5rem', backgroundColor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', margin: '0 auto 1rem', borderRadius: '1rem', backgroundColor: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={28} color="#fb7185" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
              Application Error
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                backgroundColor: '#06b6d4',
                color: '#020617',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
