'use client';

import React, { Component, ReactNode } from 'react';
import { reportError } from '@/lib/client-error-capture';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label so reports identify which boundary caught the error. */
  name?: string;
  /** Custom fallback render. Defaults to a friendly inline message. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React error boundary — catches render errors inside the children tree.
 *
 * When an error is caught:
 *   1. Reports it to /api/error-log (with type='react_error')
 *   2. Renders a fallback UI with a "Try again" button that resets state
 *
 * Wrap it around the top-level page sections so a single broken component
 * doesn't blank the whole app:
 *
 *   <ErrorBoundary name="Dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError({
      type: 'react_error',
      message: error.message,
      stack: error.stack || '',
      extra: {
        boundary: this.props.name || 'unknown',
        componentStack: info.componentStack?.slice(0, 4000),
      },
    });
  }

  retry = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 p-5 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-rose-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-rose-200 mb-1">
              {this.props.name ? `${this.props.name} failed to load` : 'Something went wrong'}
            </h3>
            <p className="text-[11px] text-rose-300/70 leading-relaxed mb-4">
              Our team has been notified. Try again — if the problem persists, refresh the page.
            </p>
            <button
              type="button"
              onClick={this.retry}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-500/30 transition-colors cursor-pointer min-h-[36px]"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
