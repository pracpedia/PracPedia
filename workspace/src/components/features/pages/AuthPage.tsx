'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/features/Logo';
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Paintbrush,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  X,
  Shield,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Atom,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthPageProps {
  onSuccess: () => void;
  onGoBack: () => void;
  /** Initial mode for the auth form. 'login' (default) or 'register'. */
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onGoBack, initialMode = 'login' }) => {
  const { login, apiFetch } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);

  // Safely parse a fetch Response as JSON. If the server returned an HTML error
  // page (404 / 500 / Next.js error boundary), `res.json()` would throw a
  // cryptic "Unexpected token '<'" — this helper converts that into a friendly
  // error message that gets shown in the form's error banner.
  const safeJson = async (res: Response): Promise<{ error?: string; token?: string; user?: any }> => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Non-JSON response — likely an HTML error page from Next.js or a proxy.
      return { error: `Server returned a non-JSON response (HTTP ${res.status}). Please try again.` };
    }
    try {
      return await res.json();
    } catch {
      return { error: 'Server returned an invalid response. Please try again.' };
    }
  };

  // Custom 2-way Auth Segment Choice: 'student' | 'artist'
  const [authType, setAuthType] = useState<'student' | 'artist'>('student');
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  // Standard Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google Sign-In Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googlePasswordInput, setGooglePasswordInput] = useState('');
  const [googleShowPassword, setGoogleShowPassword] = useState(false);
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);
  const [googleModalLoading, setGoogleModalLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  // Artist Special Signup Fields
  const [artistRate, setArtistRate] = useState('150');
  const [artistBio, setArtistBio] = useState('Senior STEM scholar & precision illustrator specializing in optical diagrams and anatomical specimens.');
  const [artistSpecialties, setArtistSpecialties] = useState('Physics Optics, Biology Physiology, Chemistry Apparatus');

  // Avatar Profile Pic Field
  const [profilePic, setProfilePic] = useState('');

  const isGmailAddress = (mail: string): boolean => {
    if (!mail) return false;
    const clean = mail.trim().toLowerCase();
    return clean.endsWith('@gmail.com') || clean.endsWith('@googlemail.com');
  };

  // Platform owners (super admins) + admins bypass the gmail/non-gmail form
  // separation. They can use either form with any email.
  //
  // Since we don't know the user's role until they log in, we check:
  // 1. The NEXT_PUBLIC_PLATFORM_OWNER_EMAILS env var (platform owners)
  // 2. A runtime check against /api/auth/check-email (returns role for known emails)
  const PLATFORM_OWNER_EMAILS: string[] = (() => {
    const fromEnv = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set([...fromEnv, 'pracpedia@gmail.com'])];
  })();

  const isPlatformOwnerEmail = (mail: string): boolean => {
    const clean = String(mail || '').trim().toLowerCase();
    if (!clean) return false;
    return PLATFORM_OWNER_EMAILS.includes(clean);
  };

  // Check if an email belongs to an admin/super_admin (runtime lookup).
  // Caches results so we don't hit the API on every keystroke.
  const [adminEmailCache, setAdminEmailCache] = useState<Record<string, boolean>>({});
  const checkEmailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced admin email check — fires when the user stops typing for 500ms
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setIsAdminEmail(false);
      return;
    }
    // Platform owners bypass immediately
    if (isPlatformOwnerEmail(clean)) {
      setIsAdminEmail(true);
      return;
    }
    // Debounced API check — 200ms so the admin bypass feels instant
    if (checkEmailTimeoutRef.current) clearTimeout(checkEmailTimeoutRef.current);
    checkEmailTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const isAdmin = data.role === 'admin' || data.role === 'super_admin';
          setAdminEmailCache((prev) => ({ ...prev, [clean]: isAdmin }));
          setIsAdminEmail(isAdmin);
        } else {
          setIsAdminEmail(false);
        }
      } catch {
        setIsAdminEmail(false);
      }
    }, 200);
    return () => {
      if (checkEmailTimeoutRef.current) clearTimeout(checkEmailTimeoutRef.current);
    };
  }, [email, apiFetch]);

  // Helper: build the correct registration body for the API
  const buildRegisterBody = (isArtist: boolean) => {
    const avatarUrl = profilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || email)}`;
    if (isArtist) {
      return {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim() || undefined,
        profilePic: avatarUrl,
        bio: artistBio || undefined,
        rateDrawingOnly: Number(artistRate) || 150,
        rateDrawingWriting: (Number(artistRate) || 150) * 2,
        notebookCost: 100,
        specialties: artistSpecialties.split(',').map(s => s.trim()).filter(Boolean),
        isAvailable: true,
      };
    }
    return {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phoneNumber: phoneNumber.trim() || undefined,
      role: 'user',
      profilePic: avatarUrl,
    };
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passScore = getPasswordStrength(password);

  const handleSelectGoogleAccount = async (accEmail: string, accName?: string, accAvatar?: string, accPassword?: string) => {
    if (!accEmail) return;
    const cleanEmail = accEmail.trim();

    // ── Form separation rules ──
    // Google Sign-In modal = GMAIL emails only.
    // Platform owners (super admins) bypass — can use any email here.
    if (!isPlatformOwnerEmail(cleanEmail) && !isGmailAddress(cleanEmail)) {
      setGoogleModalError(`This Google Sign-In is for Gmail accounts only. To use "${cleanEmail}", please close this dialog and use the standard form below — it accepts Yahoo, Outlook, Hotmail, edu.bd, and other non-Gmail providers.`);
      return;
    }

    setGoogleModalLoading(true);
    setGoogleModalError(null);

    try {
      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: accName,
          role: authType,
          profilePic: accAvatar,
          password: accPassword || googlePasswordInput || 'google-pass-123'
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      if (data.token && data.user) {
        setIsGoogleModalOpen(false);
        login(data.token, data.user);
        onSuccess();
      } else {
        throw new Error('Invalid server Google authentication response.');
      }
    } catch (err: any) {
      setGoogleModalError(err.message || 'Google authentication encountered a network error.');
    } finally {
      setGoogleModalLoading(false);
    }
  };

  const triggerRealGoogleSignIn = () => {
    setGoogleNotice(null);
    setErrorMsg(null);
    setGoogleModalError(null);
    setIsGoogleModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // ── Form separation rules ──
    // Standard form (this form) = NON-GMAIL emails only.
    // Gmail form (Google Sign-In modal) = GMAIL emails only.
    // Admins/super_admins/platform owners bypass — can use any form.
    // Check synchronously: platform owner list + admin cache (populated by
    // the debounced useEffect). This ensures the bypass works even if the
    // user types their email and immediately clicks submit before the
    // 500ms debounce fires.
    const cleanEmail = email.trim().toLowerCase();
    const isCachedAdmin = adminEmailCache[cleanEmail] === true;
    if (!isPlatformOwnerEmail(cleanEmail) && !isAdminEmail && !isCachedAdmin && isGmailAddress(email)) {
      setLoading(false);
      setErrorMsg("Gmail accounts must use the 'Sign in / Sign up with Google' button above. This form is for non-Gmail providers (Yahoo, Outlook, Hotmail, edu.bd, etc.) only.");
      return;
    }

    if (isLogin) {
      // Direct sign-in pathway — non-Gmail emails (or platform owner bypass)
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await safeJson(res);

        if (!res.ok) {
          throw new Error(data.error || 'Authentication process failed.');
        }

        if (data.token && data.user) {
          login(data.token, data.user);
          onSuccess();
        } else {
          throw new Error('Invalid server authentication payload returned.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error executing connection to server API.');
      } finally {
        setLoading(false);
      }
    } else {
      // Direct Signup pathway — non-Gmail emails (or platform owner bypass)
      try {
        const endpoint = authType === 'artist' ? '/api/artists/register' : '/api/auth/register';
        const body = buildRegisterBody(authType === 'artist');

        const regRes = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const regData = await safeJson(regRes);

        if (!regRes.ok) {
          throw new Error(regData.error || 'Account registration failed.');
        }

        if (regData.token && regData.user) {
          login(regData.token, regData.user);
          onSuccess();
        } else {
          throw new Error('Invalid server registration response.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error creating account.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="auth_page_container" className="min-h-screen text-slate-100 flex flex-col justify-center items-center relative bg-[#05070e] px-3 sm:px-6 py-6 md:py-12 select-none">

      {/* Background Lighting & Grid */}
      <div className="absolute top-[-10%] left-[15%] w-[65vw] h-[45vh] rounded-full bg-gradient-to-br from-indigo-600/12 via-cyan-600/8 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[55vw] h-[45vh] rounded-full bg-gradient-to-tl from-amber-500/8 via-purple-600/5 to-transparent blur-[160px] pointer-events-none" />

      {/* Main Container Layout */}
      <div className="w-full max-w-5xl relative z-10 space-y-4 sm:space-y-6">

        {/* Top bar header navigation */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 px-1">
          <button
            id="auth_back_btn"
            onClick={onGoBack}
            className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 hover:text-cyan-400 hover:-translate-x-1 transition-all duration-300 cursor-pointer group min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="hidden sm:inline">Back to Explorer</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size="lg" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 hidden sm:block">
              STEM Practical Hub
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 text-[9px] font-mono font-bold bg-slate-950/80 border border-white/[0.06] px-3.5 py-1.5 rounded-full text-slate-300 uppercase tracking-widest shadow-inner backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span>256-BIT SSL GATEWAY</span>
          </div>
        </div>

        {/* Dynamic Dual-Column Split Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">

          {/* Left Column: Brand, Spiritual Scholar Blessing & Feature Showcase (Visible on lg+) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 rounded-3xl bg-slate-900/30 border border-white/[0.06] backdrop-blur-xl relative overflow-hidden shadow-2xl">
            {/* Corner ambient glow */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              {/* Rabbi Zidni Ilma Spiritual Blessing */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-950/70 to-slate-950/40 border border-indigo-500/20 shadow-lg text-center space-y-2 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
                <div className="text-2xl font-serif text-amber-200/95 font-semibold tracking-wider leading-relaxed filter drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                  رَبِّ زِدْنِي عِلْمًا
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Rabbi Zidni Ilma
                </div>
                <p className="text-[11px] font-sans text-slate-400 italic">
                  &quot;O my Lord! Increase me in knowledge &amp; practical mastery.&quot;
                </p>
              </motion.div>

              {/* Dynamic Role Highlights */}
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Advantages</span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/[0.04] flex items-start gap-3 group hover:border-cyan-500/30 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Atom className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">100% Board Standard Diagrams</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Exact syllabus alignment for Physics, Chemistry, Biology &amp; Higher Math experiments.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/[0.04] flex items-start gap-3 group hover:border-amber-500/30 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Paintbrush className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">Specialist Sketch Marketplace</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Connect directly with verified STEM illustrators for custom hand-drawn lab sheets.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/[0.04] flex items-start gap-3 group hover:border-emerald-500/30 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">Direct Verified Safety</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Direct verified artist collaboration with transparent milestone updates and order accountability.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom active stats snapshot */}
            <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono font-semibold text-slate-300">54+ Modules Ready</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                v2.4 Production Build
              </div>
            </div>
          </div>

          {/* Right Column: Central Interactive Auth Form Card */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div
              id="auth_card"
              className="rounded-3xl border border-white/[0.07] bg-slate-900/40 backdrop-blur-2xl p-4 sm:p-7 md:p-8 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] hover:border-white/[0.12] transition-all duration-300 relative overflow-hidden space-y-5 sm:space-y-6"
            >
              {/* Subtle top laser glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-indigo-500/60" />

              {/* Mobile Rabbi Zidni Ilma Banner (Small Screens Only) */}
              <div className="lg:hidden block text-center pb-2 border-b border-white/[0.04]">
                <div className="text-lg sm:text-xl font-serif text-amber-200/90 font-medium tracking-wide">
                  رَبِّ زِدْنِي عِلْمًا
                </div>
                <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mt-0.5">
                  &quot;O my Lord! Increase me in knowledge&quot;
                </div>
              </div>

              {/* Modern Segmented Class Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 gap-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-slate-400 truncate">
                    Account Classification
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/90 whitespace-nowrap">
                    {authType === 'student' ? 'Scholar Access' : 'Illustrator Access'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950/80 border border-white/[0.05] shadow-inner">
                  {/* Option 1: Student */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthType('student');
                      setErrorMsg(null);
                    }}
                    className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer text-xs font-bold min-h-[44px] ${
                      authType === 'student'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                    }`}
                  >
                    <GraduationCap className={`w-4 h-4 shrink-0 ${authType === 'student' ? 'text-amber-300' : 'text-slate-400'}`} />
                    <span className="tracking-tight">Student / Scholar</span>
                  </button>

                  {/* Option 2: Artist */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthType('artist');
                      setErrorMsg(null);
                    }}
                    className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer text-xs font-bold min-h-[44px] ${
                      authType === 'artist'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-300/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                    }`}
                  >
                    <Paintbrush className="w-4 h-4 shrink-0" />
                    <span className="tracking-tight">Sketch Artist</span>
                  </button>
                </div>
              </div>

              {/* Title & Purpose Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold font-sans tracking-tight text-white">
                    {isLogin ? (
                      authType === 'artist' ? 'Artist Studio Login' : 'Welcome Back'
                    ) : (
                      authType === 'artist' ? 'Join as Lab Artist' : 'Create Scholar Account'
                    )}
                  </h2>

                  {/* Switch Login / Register Toggle Badge */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-sans text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline underline-offset-4 decoration-cyan-500/40 hover:decoration-cyan-400 transition-colors min-h-[32px]"
                  >
                    {isLogin ? "Need an account?" : "Already registered?"}
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {authType === 'student' ? (
                    isLogin
                      ? 'Sign in to access diagrams, AI Academy experiments, and commission sketch artists.'
                      : 'Create your account to download interactive lab files and request custom sketch plates.'
                  ) : (
                    isLogin
                      ? 'Log in to manage drawing orders, publish portfolio plates, and withdraw earnings.'
                      : 'Register your studio to offer precision practical sketches to students nationwide.'
                  )}
                </p>
              </div>

              {/* Fast Google Auth Pathway (Strictly for @gmail.com) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={triggerRealGoogleSignIn}
                  className="w-full py-3.5 px-4 bg-slate-950/80 hover:bg-slate-950 text-slate-100 font-bold border border-blue-500/30 hover:border-blue-400/70 rounded-2xl transition-all duration-200 flex items-center justify-between shadow-lg shadow-blue-500/5 cursor-pointer active:scale-[0.99] group min-h-[48px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.23c-.25-.72-.38-1.49-.38-2.23s.13-1.51.38-2.23V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span className="text-xs font-sans font-semibold tracking-tight text-slate-200 group-hover:text-white truncate text-left">
                      {isLogin ? 'Sign in with Google (Gmail only)' : `Sign up with Google (Gmail only)`}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 group-hover:bg-blue-500/30 transition-all whitespace-nowrap shrink-0">
                    GMAIL ONLY
                  </span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-white/[0.08] w-full" />
                  <span className="bg-[#0b0f19] px-3 text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-widest shrink-0 text-center">
                    OR USE YAHOO, OUTLOOK &amp; ALL OTHER EMAIL PROVIDERS
                  </span>
                  <div className="border-t border-white/[0.08] w-full" />
                </div>
              </div>

              {/* Feedback Notices */}
              {googleNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-emerald-200 block">Gmail Account Linked</span>
                    <span className="text-[11px] text-emerald-300/80 break-words">{googleNotice}</span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div id="auth_error_box" className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex flex-col gap-2 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-sans flex-1 break-words">{errorMsg}</span>
                  </div>
                  {isGmailAddress(email) && (
                    <div className="pl-6 pt-1">
                      <button
                        type="button"
                        onClick={triggerRealGoogleSignIn}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm min-h-[40px]"
                      >
                        <span>Open Google Sign-In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Email Authentication Form (Strictly for Yahoo, Outlook, Hotmail, etc.) */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* 1. Name Field (Only on Register) */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 block px-1">
                      Full Name <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-500">
                        <User className="w-4 h-4 text-cyan-400" />
                      </span>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Mahabub Rahman"
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all font-sans min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Universal Email Field (Non-Gmail) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 gap-2">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                      Email Address (Non-Gmail) <span className="text-cyan-400">*</span>
                    </label>
                    <span className="text-[8.5px] font-mono text-amber-400/90 font-bold whitespace-nowrap">
                      Yahoo / Outlook / Other
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500">
                      <Mail className="w-4 h-4 text-cyan-400" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="e.g. user@yahoo.com, student@outlook.com, scholar@hotmail.com"
                      className={`w-full bg-slate-950/80 border rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all font-sans min-h-[44px] ${
                        isGmailAddress(email)
                          ? 'border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20'
                          : 'border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10'
                      }`}
                    />
                  </div>

                  {/* Real-time Inline Helper Warning if user types a @gmail.com address in standard form */}
                  {isGmailAddress(email) && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-300 animate-in fade-in duration-200 mt-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <strong className="block text-amber-200">Gmail Address Detected</strong>
                        <span>
                          Please use the <strong>&quot;Sign in with Google&quot;</strong> button above. This form is reserved for Yahoo, Outlook, Hotmail, and other non-Google providers.
                        </span>
                        <button
                          type="button"
                          onClick={triggerRealGoogleSignIn}
                          className="mt-1 block text-cyan-300 hover:text-cyan-200 underline font-bold cursor-pointer"
                        >
                          Switch to Google Sign-In →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Password Field with Visibility Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1 gap-2">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                      Password <span className="text-cyan-400">*</span>
                    </label>
                    {!isLogin && (
                      <span className="text-[8.5px] font-mono text-slate-400 whitespace-nowrap">
                        {passScore <= 1 ? 'Weak' : passScore <= 3 ? 'Medium' : 'Strong'}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500">
                      <Lock className="w-4 h-4 text-amber-400/80" />
                    </span>
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl pl-11 pr-11 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all font-sans min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-500 hover:text-slate-300 p-1 cursor-pointer transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Visual password strength meter on registration */}
                  {!isLogin && password && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1 px-0.5">
                      <div className={`h-1 rounded-full transition-all duration-300 ${passScore >= 1 ? 'bg-rose-500' : 'bg-slate-800'}`} />
                      <div className={`h-1 rounded-full transition-all duration-300 ${passScore >= 2 ? 'bg-amber-500' : 'bg-slate-800'}`} />
                      <div className={`h-1 rounded-full transition-all duration-300 ${passScore >= 3 ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                      <div className={`h-1 rounded-full transition-all duration-300 ${passScore >= 4 ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                    </div>
                  )}
                </div>

                {/* 4. Phone number input (signup only) */}
                {!isLogin && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 block px-1">
                      Mobile Number (For Order SMS Notifications)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-500 font-mono text-xs">
                        +88
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all font-sans min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Artist Custom Registration Fields */}
                {!isLogin && authType === 'artist' && (
                  <div className="space-y-3 p-4 bg-amber-500/[0.03] rounded-2xl border border-amber-500/15 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400 pb-1.5 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Paintbrush className="w-3.5 h-3.5 shrink-0" /> Illustrator Parameters
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">BDT Rates</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-mono uppercase font-bold text-slate-400 block px-1">
                          Base Rate (৳ BDT Per Sheet)
                        </label>
                        <input
                          type="number"
                          value={artistRate}
                          onChange={(e) => setArtistRate(e.target.value)}
                          required
                          min={50}
                          max={2000}
                          placeholder="150"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none font-mono min-h-[44px]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-mono uppercase font-bold text-slate-400 block px-1">
                          Subject Specialties
                        </label>
                        <input
                          type="text"
                          value={artistSpecialties}
                          onChange={(e) => setArtistSpecialties(e.target.value)}
                          required
                          placeholder="Optics, Circuits, Botany..."
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none font-sans min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono uppercase font-bold text-slate-400 block px-1">
                        Artist Pitch &amp; Bio
                      </label>
                      <textarea
                        value={artistBio}
                        onChange={(e) => setArtistBio(e.target.value)}
                        required
                        rows={2}
                        placeholder="Tell students about your drawing precision, pencil grading, and turnaround speed..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none resize-none leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  id="auth_submit_btn"
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-xs font-black tracking-wider uppercase shadow-xl transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center justify-center gap-2 border mt-2 min-h-[48px] ${
                    authType === 'artist'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-300/30 shadow-amber-500/10'
                      : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-400/30 shadow-indigo-600/20'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : isLogin ? (
                    <>
                      <span>Enter Platform</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Complete Account Setup</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>

      {/* Modern Google OAuth Modal Dialog */}
      <AnimatePresence>
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#0d121f] border border-slate-700/70 rounded-3xl p-5 sm:p-6 md:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative overflow-hidden space-y-5 font-sans my-auto"
            >
              {/* Google Brand Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.23c-.25-.72-.38-1.49-.38-2.23s.13-1.51.38-2.23V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span className="text-sm font-extrabold text-white tracking-tight truncate">Google Accounts</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">Sign in with Google</h3>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                    @gmail.com ONLY
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Google Sign-In is strictly for <span className="font-bold text-cyan-400">@gmail.com</span> addresses. (For Yahoo, Outlook, or custom domains, use the standard form).
                </p>
              </div>

              {/* In-Modal Error Warning */}
              {googleModalError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-sans break-words">{googleModalError}</div>
                </div>
              )}

              {/* Google Modal Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!googleEmailInput) return;
                  // Admins/super_admins/platform owners bypass — can use any email in any form.
                  // Non-gmail emails are blocked (must use the standard form).
                  // Also check the admin cache for the current googleEmailInput.
                  const isGoogleAdminEmail = isPlatformOwnerEmail(googleEmailInput) ||
                    (adminEmailCache[googleEmailInput.trim().toLowerCase()] === true);
                  if (!isGoogleAdminEmail && !isGmailAddress(googleEmailInput)) {
                    setGoogleModalError('Google Sign-In is for Gmail accounts only. For Yahoo, Outlook, Hotmail, and all other email providers, please close this dialog and use the standard form below.');
                    return;
                  }
                  handleSelectGoogleAccount(googleEmailInput, undefined, undefined, googlePasswordInput);
                }}
                className="space-y-4 pt-1"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Google Email <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold whitespace-nowrap">
                      Must end in @gmail.com
                    </span>
                  </div>
                  <input
                    type="email"
                    required
                    value={googleEmailInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGoogleEmailInput(val);
                      if (val && !isGmailAddress(val) && val.includes('@') && val.split('@')[1].length > 2) {
                        setGoogleModalError(`Google authentication is strictly restricted to @gmail.com accounts. For ${val.split('@')[1]}, please close this modal and use the standard form on the main page.`);
                      } else {
                        if (googleModalError) setGoogleModalError(null);
                      }
                    }}
                    placeholder="yourname@gmail.com"
                    className={`w-full bg-slate-950/90 border rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all font-mono min-h-[44px] ${
                      googleEmailInput && !isGmailAddress(googleEmailInput) && googleEmailInput.includes('@')
                        ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setGoogleShowPassword(!googleShowPassword)}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-semibold min-h-[28px]"
                    >
                      {googleShowPassword ? 'Hide password' : 'Show password'}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={googleShowPassword ? 'text' : 'password'}
                      required
                      value={googlePasswordInput}
                      onChange={(e) => setGooglePasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/90 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all font-mono pr-10 min-h-[44px]"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGoogleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={googleModalLoading}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 min-h-[44px]"
                  >
                    {googleModalLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Next &amp; Sign In</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Security Footer Note */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Google OAuth 2.0 Security
                </span>
                <span className="font-mono whitespace-nowrap">TLS 1.3 Encryption</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
