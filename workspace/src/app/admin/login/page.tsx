'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Dedicated admin login page at /admin/login.
 *
 * Pre-fills the super admin demo credentials for convenience during testing.
 * After successful login, redirects to the main dashboard which auto-detects
 * the admin role and shows the Super Admin CMS in the sidebar.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, user } = useAuth();

  const [email, setEmail] = useState('pracpedia@gmail.com');
  const [password, setPassword] = useState('pracpedia123456789');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super_admin')) {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      // Check if the user has admin role
      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        setError('Access denied. This login is for administrators only.');
        setSubmitting(false);
        return;
      }

      // Log in via context (stores token in localStorage)
      login(data.token, data.user);
      // Redirect to main dashboard
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060b] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient glows */}
      <div className="absolute top-[-15%] left-[10%] w-[60vw] h-[45vh] rounded-full bg-gradient-to-br from-amber-600/15 via-amber-500/8 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[10%] w-[55vw] h-[45vh] rounded-full bg-gradient-to-tl from-fuchsia-600/8 via-amber-600/5 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1208_1px,transparent_1px),linear-gradient(to_bottom,#1a1208_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_45%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Admin Portal Login
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Restricted access — administrators and super admins only
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-3xl border border-white/[0.07] bg-slate-900/40 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-3 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  placeholder="admin@gallery.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-10 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wider uppercase shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                'Authenticating…'
              ) : (
                <>
                  Enter Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/80 text-[11px] leading-relaxed">
            <p className="font-bold text-amber-300 mb-1">Demo Admin Credentials:</p>
            <p>Super Admin: <code className="font-mono">pracpedia@gmail.com / pracpedia123456789</code></p>
            <p>Admin: <code className="font-mono">admin2@gallery.com</code> / <code className="font-mono">admin123</code></p>
          </div>
        </div>

        {/* Back to main site */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            ← Back to PracPedia
          </button>
        </div>
      </motion.div>
    </div>
  );
}
