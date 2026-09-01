'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  ShieldCheck,
  Database,
  Server,
  Cpu,
  Lock,
  Copy,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  X,
  Crown,
  Users,
  Folder,
  Bell,
  MessageSquare,
  Briefcase,
  Image as ImageIcon,
  Layers,
  BookOpen,
  Palette,
  UserCog,
  LogIn,
  FileText,
  GraduationCap,
  Activity,
  HardDrive,
  Hash,
  Search,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================
interface CredentialsViewProps {
  onBack?: () => void;
  activeTheme?: string;
}

interface SystemInfo {
  appName?: string;
  framework?: string;
  language?: string;
  styling?: string;
  orm?: string;
  database?: string;
  databaseUrl?: string;
  jwtSecretSet?: boolean;
  zAiSdkInstalled?: boolean;
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  uptime?: string;
}

interface StatsInfo {
  users?: number;
  subjects?: number;
  folders?: number;
  bookings?: number;
  portfolio?: number;
  announcements?: number;
  chatMessages?: number;
  hireRequests?: number;
}

interface RoleUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface DemoAccount {
  email: string;
  password: string;
  role: string;
}

/**
 * A user record exposed in the TEST MODE credentials table.
 * Includes plaintext password + phone number — test mode only.
 */
interface ExposedUser {
  id: string;
  name: string;
  email: string;
  password: string;          // plaintext — test mode only
  phoneNumber: string;
  role: string;
  createdAt?: string;
  isPremium?: boolean;
}

interface CredentialsPayload {
  generatedAt?: string;
  testMode?: boolean;
  warning?: string;
  system: SystemInfo;
  stats: StatsInfo;
  roles: {
    superAdmins: RoleUser[];
    admins: RoleUser[];
  };
  endpoints: string[];
  // Legacy demo accounts (kept for backward compat — may be empty)
  demoAccounts?: DemoAccount[];
  // All users with plaintext passwords + phone numbers (test mode only)
  allUsers?: ExposedUser[];
}

interface EndpointCategory {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  endpoints: { method: string; path: string; note?: string }[];
}

// ============================================================================
// Helpers
// ============================================================================
const maskDatabaseUrl = (url: string | undefined): string => {
  if (!url) return '(not set)';
  // For file:./prisma/dev.db-style SQLite URLs, show just the path tail
  if (url.startsWith('file:')) {
    const parts = url.replace('file:', '').split('/');
    return `file:./${parts[parts.length - 1]}`;
  }
  // For postgres/etc URLs, mask credentials
  try {
    if (url.includes('://')) {
      const u = new URL(url);
      const host = u.hostname || 'db-host';
      const path = u.pathname ? `/${u.pathname}` : '';
      return `${u.protocol}//••••@${host}${path}`;
    }
  } catch {
    /* fall through */
  }
  // Fallback: show last 2 segments
  const parts = url.split(/[\/\\]/).filter(Boolean);
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : url;
};

const categorizeEndpoints = (endpoints: string[]): EndpointCategory[] => {
  const buckets: Record<string, EndpointCategory> = {
    auth: { name: 'Auth', icon: LogIn, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', endpoints: [] },
    subjects: { name: 'Subjects', icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', endpoints: [] },
    folders: { name: 'Folders', icon: Folder, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', endpoints: [] },
    images: { name: 'Images', icon: ImageIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', endpoints: [] },
    announcements: { name: 'Announcements', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', endpoints: [] },
    users: { name: 'Users', icon: UserCog, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', endpoints: [] },
    bookings: { name: 'Bookings', icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', endpoints: [] },
    portfolio: { name: 'Portfolio', icon: Palette, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', endpoints: [] },
    artists: { name: 'Artists', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', endpoints: [] },
    chat: { name: 'Chat', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', endpoints: [] },
    hire: { name: 'Hire', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', endpoints: [] },
    profile: { name: 'Profile', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', endpoints: [] },
    academy: { name: 'Academy', icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', endpoints: [] },
    credentials: { name: 'Credentials', icon: Key, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', endpoints: [] },
    stats: { name: 'Stats', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', endpoints: [] },
    other: { name: 'Other', icon: Hash, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', endpoints: [] },
  };

  for (const ep of endpoints) {
    const trimmed = ep.trim();
    const spaceIdx = trimmed.indexOf(' ');
    let method = '';
    let path = trimmed;
    if (spaceIdx > -1) {
      method = trimmed.slice(0, spaceIdx).trim();
      path = trimmed.slice(spaceIdx + 1).trim();
    }
    // Pull a trailing note in parens off the path
    let note: string | undefined;
    const noteMatch = path.match(/\(([^)]+)\)/);
    if (noteMatch) {
      note = noteMatch[1];
      path = path.replace(/\s*\([^)]+\)\s*$/, '').trim();
    }
    // Route to bucket by path prefix
    const lower = path.toLowerCase();
    let key = 'other';
    if (lower.startsWith('/api/auth')) key = 'auth';
    else if (lower.startsWith('/api/subjects')) key = 'subjects';
    else if (lower.startsWith('/api/folders')) key = 'folders';
    else if (lower.startsWith('/api/images')) key = 'images';
    else if (lower.startsWith('/api/announcements')) key = 'announcements';
    else if (lower.startsWith('/api/users')) key = 'users';
    else if (lower.startsWith('/api/bookings')) key = 'bookings';
    else if (lower.startsWith('/api/portfolio')) key = 'portfolio';
    else if (lower.startsWith('/api/artists')) key = 'artists';
    else if (lower.startsWith('/api/chat')) key = 'chat';
    else if (lower.startsWith('/api/hire')) key = 'hire';
    else if (lower.startsWith('/api/profile')) key = 'profile';
    else if (lower.startsWith('/api/academy')) key = 'academy';
    else if (lower.startsWith('/api/credentials')) key = 'credentials';
    else if (lower.startsWith('/api/stats')) key = 'stats';
    buckets[key].endpoints.push({ method, path, note });
  }

  // Return only non-empty categories, in canonical order
  const order = ['auth', 'subjects', 'folders', 'images', 'announcements', 'users', 'bookings', 'portfolio', 'artists', 'chat', 'hire', 'profile', 'academy', 'credentials', 'stats', 'other'];
  return order.map((k) => buckets[k]).filter((b) => b.endpoints.length > 0);
};

const methodColor = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'POST':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    case 'PUT':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'DELETE':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'PATCH':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
};

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

// ============================================================================
// Component
// ============================================================================
export const CredentialsView: React.FC<CredentialsViewProps> = ({ onBack, activeTheme: _activeTheme }) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<CredentialsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorMsg] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Search filter for the red TEST MODE credentials table
  const [credSearch, setCredSearch] = useState('');
  // Eye toggle: when true, passwords are shown as plaintext; when false, masked
  const [revealAll, setRevealAll] = useState(false);
  // Per-row reveal: tracks which user IDs have their password visible
  const [revealedRows, setRevealedRows] = useState<Set<string>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const fetchCredentials = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setForbidden(false);
    try {
      const res = await apiFetch('/api/credentials');
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || `Failed to load credentials (HTTP ${res.status})`);
        return;
      }
      const json = await res.json();
      setData(json as CredentialsPayload);
      setLastRefresh(new Date());
    } catch (e: any) {
      setErrorMsg(e?.message || 'Network error loading credentials.');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  // Initial fetch
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Auto-refresh every 60s when enabled
  useEffect(() => {
    if (!autoRefresh) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      return;
    }
    autoTimerRef.current = setInterval(() => {
      // Silent refresh — don't toggle isLoading
      (async () => {
        try {
          const res = await apiFetch('/api/credentials');
          if (!res.ok) return;
          const json = await res.json();
          setData(json as CredentialsPayload);
          setLastRefresh(new Date());
        } catch {
          /* silent */
        }
      })();
    }, 60_000);
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoRefresh, apiFetch]);

  // Tick "now" every second for the "X seconds ago" indicator (only when refresh exists)
  useEffect(() => {
    tickTimerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const secondsAgo = lastRefresh
    ? Math.max(0, Math.floor((now.getTime() - lastRefresh.getTime()) / 1000))
    : null;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`Copied: ${text}`, 'success');
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1500);
    } catch {
      showToast('Failed to copy. Please copy manually.', 'error');
    }
  };

  // ========================================================================
  // RENDER: Loading
  // ========================================================================
  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 min-w-0 overflow-x-hidden">
        <CredentialsHeader
          onBack={onBack}
          lastRefresh={null}
          secondsAgo={null}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onRefresh={fetchCredentials}
          isRefreshing={isLoading}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-950/80 border border-white/10 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-950/80 border border-white/10 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-slate-950/80 border border-white/10 animate-pulse" />
      </div>
    );
  }

  // ========================================================================
  // RENDER: Access Denied (403)
  // ========================================================================
  if (forbidden) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 min-w-0 overflow-x-hidden">
        <CredentialsHeader
          onBack={onBack}
          lastRefresh={lastRefresh}
          secondsAgo={secondsAgo}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onRefresh={fetchCredentials}
          isRefreshing={isLoading}
        />
        <div className="p-8 sm:p-12 rounded-3xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex justify-center">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Lock className="w-10 h-10" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">Access Denied</h3>
          <p className="text-sm text-rose-200/80 max-w-md mx-auto leading-relaxed">
            This page is restricted to <strong className="text-white">Super Admins</strong> only. Your current account does not have the required <code className="px-1.5 py-0.5 bg-slate-900 rounded text-rose-300 font-mono text-xs">super_admin</code> role.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            If you believe this is an error, please contact the platform owner (the first super admin) and request elevation via <code className="px-1.5 py-0.5 bg-slate-900 rounded text-cyan-300 font-mono">POST /api/users/promote-super</code>.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to CMS</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ========================================================================
  // RENDER: Error
  // ========================================================================
  if (error && !data) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-12 min-w-0 overflow-x-hidden">
        <CredentialsHeader
          onBack={onBack}
          lastRefresh={lastRefresh}
          secondsAgo={secondsAgo}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onRefresh={fetchCredentials}
          isRefreshing={isLoading}
        />
        <div className="p-8 sm:p-12 rounded-3xl bg-amber-950/30 border border-amber-500/30 text-center space-y-4 shadow-2xl">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-10 h-10" />
            </div>
          </div>
          <h3 className="text-xl font-black text-white">Failed to Load Credentials</h3>
          <p className="text-sm text-amber-200/80 max-w-md mx-auto leading-relaxed break-words">{error}</p>
          <button
            onClick={fetchCredentials}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // ========================================================================
  // RENDER: Main
  // ========================================================================
  if (!data) return null;

  const { system, stats, roles, endpoints, demoAccounts: _demoAccounts, allUsers: _allUsers, generatedAt, testMode: _testMode, warning: _warning } = data;
  // Suppress unused-destructuring warnings — these are accessed via `data?.`
  // inside the IIFE-rendered TEST MODE section below.
  void _demoAccounts; void _allUsers; void _testMode; void _warning;
  const categories = categorizeEndpoints(endpoints);

  const statsTiles: { label: string; value: number | undefined; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }[] = [
    { label: 'Users', value: stats.users, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { label: 'Subjects', value: stats.subjects, icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Folders', value: stats.folders, icon: Folder, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Bookings', value: stats.bookings, icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Portfolio', value: stats.portfolio, icon: ImageIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Announcements', value: stats.announcements, icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Chat Messages', value: stats.chatMessages, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Hire Requests', value: stats.hireRequests, icon: Briefcase, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  const systemRows: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'App Name', value: system.appName || '—', icon: Activity },
    { label: 'Framework', value: system.framework || '—', icon: Layers },
    { label: 'Language', value: system.language || '—', icon: FileText },
    { label: 'Styling', value: system.styling || '—', icon: Palette },
    { label: 'ORM', value: system.orm || '—', icon: Database },
    { label: 'Database', value: system.database || '—', icon: HardDrive },
    {
      label: 'Database URL',
      value: (
        <span className="font-mono text-cyan-300 break-all text-[11px]">
          {maskDatabaseUrl(system.databaseUrl)}
        </span>
      ),
      icon: Server,
    },
    {
      label: 'JWT Secret',
      value: system.jwtSecretSet ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Set</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-rose-300 font-bold text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Not Set</span>
        </span>
      ),
      icon: Key,
    },
    {
      label: 'z-AI SDK',
      value: system.zAiSdkInstalled ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Installed</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-rose-300 font-bold text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Missing</span>
        </span>
      ),
      icon: Cpu,
    },
    { label: 'Node Version', value: system.nodeVersion || '—', icon: Cpu },
    { label: 'Platform', value: system.platform || '—', icon: Server },
    { label: 'Architecture', value: system.arch || '—', icon: Cpu },
    { label: 'Uptime', value: system.uptime || '—', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 min-w-0 overflow-x-hidden">
      {/* ===== Header ===== */}
      <CredentialsHeader
        onBack={onBack}
        lastRefresh={lastRefresh}
        secondsAgo={secondsAgo}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onRefresh={fetchCredentials}
        isRefreshing={isLoading}
      />

      {/* ===== Toast ===== */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl border ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40'
                : 'bg-rose-950/95 text-rose-200 border-rose-500/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="break-words">{toast.msg}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 text-slate-400 hover:text-white shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== System Overview Card ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-5 sm:p-7 rounded-3xl relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1324] to-slate-950 border border-fuchsia-500/20 shadow-2xl"
      >
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-fuchsia-500/5 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 min-w-0">
                <Server className="w-5 h-5 text-fuchsia-400 shrink-0" />
                <span className="truncate">System Overview</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 break-words">Generated: {generatedAt ? formatDate(generatedAt) : '—'}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 hidden sm:inline">
              Restricted
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {systemRows.map((row) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={row.label}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-all flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shrink-0">
                    <RowIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold truncate">
                      {row.label}
                    </p>
                    <div className="mt-0.5 text-sm text-slate-100 font-semibold break-words">
                      {row.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ===== Database Stats Grid ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center gap-2 truncate">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Database Statistics</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-500 shrink-0">Live counts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {statsTiles.map((tile, idx) => {
            const TileIcon = tile.icon;
            return (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.025 }}
                className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border ${tile.border} transition-all duration-300 relative group overflow-hidden shadow-xl flex flex-col justify-between`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider truncate">
                    {tile.label}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${tile.bg} ${tile.color} transition-transform group-hover:scale-110 shrink-0`}>
                    <TileIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-white tracking-tight">
                    {tile.value !== undefined && tile.value !== null ? tile.value.toLocaleString() : '—'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ===== Role Hierarchy Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
      >
        {/* Super Admins */}
        <RoleRosterCard
          title="Super Admins"
          subtitle="Platform owners with full access"
          icon={Crown}
          accent="fuchsia"
          users={roles.superAdmins}
          badgeLabel="Super Admin"
          badgeClass="bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30"
          emptyMessage="No super admins found."
          note="The first super admin (Professor Akash) is the platform owner and cannot be demoted."
        />

        {/* Admins */}
        <RoleRosterCard
          title="Administrators"
          subtitle="Supervisors with elevated privileges"
          icon={ShieldCheck}
          accent="amber"
          users={roles.admins}
          badgeLabel="Admin"
          badgeClass="bg-amber-500/15 text-amber-300 border-amber-500/30"
          emptyMessage="No regular admins found."
          note="Super admins can elevate regular admins to super_admin via the CMS."
        />
      </motion.div>

      {/* ===== TEST MODE: All User Credentials (red section with search) ===== */}
      {(() => {
        // Filter users by search query (name, email, phone, role)
        const allUsers = data?.allUsers || [];
        const q = credSearch.trim().toLowerCase();
        const filtered = q
          ? allUsers.filter((u) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              (u.phoneNumber || '').toLowerCase().includes(q) ||
              u.role.toLowerCase().includes(q)
            )
          : allUsers;

        // Toggle a single row's password visibility
        const toggleRow = (id: string) => {
          setRevealedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        };

        // Determine if a specific user's password should be shown
        const isPasswordVisible = (id: string) => revealAll || revealedRows.has(id);

        // Mask a password — show length-based dots
        const maskPassword = (pw: string) => '•'.repeat(Math.min(pw.length, 12));

        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            className="p-5 sm:p-6 rounded-3xl bg-red-950/40 border-2 border-red-500/40 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden"
          >
            {/* Red top stripe */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-red-500" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-red-500/20">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-extrabold text-red-100 flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                  <span className="truncate">TEST MODE — All User Credentials</span>
                </h3>
                <p className="text-xs text-red-300/70 mt-1 break-words">
                  Plaintext passwords exposed. Search by name, email, phone, or role.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-red-300 px-2.5 py-0.5 rounded-full bg-red-900/60 border border-red-500/30">
                  {filtered.length} / {allUsers.length}
                </span>
              </div>
            </div>

            {/* Search + Reveal All controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-red-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={credSearch}
                  onChange={(e) => setCredSearch(e.target.value)}
                  placeholder="Search by name, email, phone, or role…"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-100 placeholder:text-red-400/40 text-xs font-mono focus:outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-500/20 transition-all"
                />
                {credSearch && (
                  <button
                    onClick={() => setCredSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setRevealAll((v) => !v)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                  revealAll
                    ? 'bg-red-500/30 text-red-100 border-red-400/60 hover:bg-red-500/40'
                    : 'bg-red-950/60 text-red-300 border-red-500/30 hover:border-red-400/50'
                }`}
              >
                {revealAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealAll ? 'Hide All' : 'Reveal All'}</span>
              </button>
            </div>

            {/* Credentials — dedicated card per user (all devices) */}
            <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 space-y-2.5">

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-red-400/60 text-xs">
                  {allUsers.length === 0
                    ? 'No users in database. Run `bunx tsx prisma/seed.ts` to populate.'
                    : 'No users match your search.'}
                </div>
              )}

              {filtered.length > 0 && (
                <div className="space-y-2.5">
                  {filtered.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/25 space-y-2.5"
                    >
                      {/* Name + role */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-red-400/70 mb-0.5">Name</div>
                          <div className="font-sans text-red-100 text-sm font-bold break-words">{u.name}</div>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border shrink-0 ${
                          u.role === 'super_admin'
                            ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                            : u.role === 'admin'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : u.role === 'artist'
                            ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}>
                          {u.role}
                        </span>
                      </div>

                      {/* Email */}
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-red-400/70 mb-0.5">Email</div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-cyan-200 break-all text-xs flex-1 min-w-0">{u.email}</span>
                          <button
                            onClick={() => copyToClipboard(u.email, `email-${u.id}`)}
                            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                              copiedKey === `email-${u.id}`
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-950/60 text-red-300 border-red-500/20 hover:border-red-400/40'
                            }`}
                            aria-label="Copy email"
                          >
                            {copiedKey === `email-${u.id}` ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-red-400/70 mb-0.5">Password</div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono break-all text-xs flex-1 min-w-0 ${isPasswordVisible(u.id) ? 'text-amber-200' : 'text-red-400/60'}`}>
                            {isPasswordVisible(u.id) ? u.password : maskPassword(u.password)}
                          </span>
                          <button
                            onClick={() => toggleRow(u.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
                            aria-label={isPasswordVisible(u.id) ? 'Hide password' : 'Show password'}
                          >
                            {isPasswordVisible(u.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(u.password, `pw-${u.id}`)}
                            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                              copiedKey === `pw-${u.id}`
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-950/60 text-red-300 border-red-500/20 hover:border-red-400/40'
                            }`}
                            aria-label="Copy password"
                          >
                            {copiedKey === `pw-${u.id}` ? <CheckCircle className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-red-400/70 mb-0.5">Phone</div>
                        {u.phoneNumber ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="font-mono text-slate-300 break-all text-xs">{u.phoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic text-xs">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Warning footer */}
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <span className="leading-relaxed">
                <strong className="text-red-300">TEST MODE ACTIVE.</strong> All user passwords are stored as
                plaintext and visible here. This is intentional for local development only.
                To disable: set <code className="font-mono bg-red-950/60 px-1 py-0.5 rounded">PRACPEDIA_TEST_PASSWORDS_VISIBLE=false</code> in
                your <code className="font-mono bg-red-950/60 px-1 py-0.5 rounded">.env</code> file and restart the server.
              </span>
            </div>
          </motion.div>
        );
      })()}

      {/* ===== Legacy Demo Accounts Section (hidden if allUsers is present) ===== */}
      {data?.demoAccounts && data.demoAccounts.length > 0 && !data.allUsers && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 min-w-0">
              <Users className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="truncate">Demo Accounts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 break-words">Click a row's copy button to copy the email.</p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/5">
            {data.demoAccounts.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs min-w-[480px]">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                <th className="py-2.5 pr-3 font-bold">Email</th>
                <th className="py-2.5 pr-3 font-bold">Password</th>
                <th className="py-2.5 pr-3 font-bold">Role</th>
                <th className="py-2.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.demoAccounts.map((acc, idx) => (
                <tr
                  key={`${acc.email}-${idx}`}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 pr-3 font-mono text-cyan-200 break-all align-top max-w-[200px]">{acc.email}</td>
                  <td className="py-2.5 pr-3 font-mono text-slate-300 break-all align-top">{acc.password}</td>
                  <td className="py-2.5 pr-3 align-top">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                      acc.role === 'super_admin'
                        ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                        : acc.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : acc.role === 'artist'
                        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}>
                      {acc.role}
                    </span>
                  </td>
                  <td className="py-2.5 text-right align-top">
                    <button
                      onClick={() => copyToClipboard(acc.email, `demo-${idx}`)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer min-h-[32px] ${
                        copiedKey === `demo-${idx}`
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-cyan-500/30 hover:text-cyan-300'
                      }`}
                    >
                      {copiedKey === `demo-${idx}` ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/80 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            These are <strong className="text-amber-300">demo credentials</strong> for testing. In production, these would be removed.
          </span>
        </div>
      </motion.div>
      )}

      {/* ===== API Endpoints Reference ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 min-w-0">
              <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
              <span className="truncate">API Endpoints Reference</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 break-words">{endpoints.length} routes across {categories.length} categories.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div
                key={cat.name}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/5">
                  <div className={`p-1.5 rounded-lg border ${cat.bg} ${cat.color} ${cat.border} shrink-0`}>
                    <CatIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">{cat.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-auto">
                    {cat.endpoints.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {cat.endpoints.map((ep, i) => (
                    <div
                      key={`${cat.name}-${i}`}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <span className={`shrink-0 inline-flex items-center justify-center w-14 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${methodColor(ep.method)}`}>
                        {ep.method || '?'}
                      </span>
                      <code className="flex-1 min-w-0 truncate text-[11px] text-slate-200 font-mono">
                        {ep.path}
                      </code>
                      {ep.note && (
                        <span className="text-[9px] text-slate-500 italic shrink-0 hidden sm:inline">
                          {ep.note}
                        </span>
                      )}
                      <button
                        onClick={() => copyToClipboard(ep.path, `ep-${cat.name}-${i}`)}
                        className={`shrink-0 p-1.5 rounded-md border transition-all cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center ${
                          copiedKey === `ep-${cat.name}-${i}`
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-white/5 hover:text-cyan-300 hover:border-cyan-500/30'
                        }`}
                        title="Copy Path"
                      >
                        {copiedKey === `ep-${cat.name}-${i}` ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ===== Security Notice ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.25 }}
        className="p-5 sm:p-6 rounded-3xl bg-rose-950/30 border-2 border-rose-500/30 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-sm sm:text-base font-black text-rose-100">Security Notice</h3>
            <p className="text-xs sm:text-sm text-rose-200/80 leading-relaxed">
              This page contains <strong className="text-white">sensitive system information</strong>. Do not share these credentials with unauthorized users.
            </p>
            <p className="text-[11px] text-rose-300/70 leading-relaxed">
              All access to this page is logged. If you suspect unauthorized access, rotate the JWT secret and review super admin promotions immediately.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================
interface CredentialsHeaderProps {
  onBack?: () => void;
  lastRefresh: Date | null;
  secondsAgo: number | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const CredentialsHeader: React.FC<CredentialsHeaderProps> = ({
  onBack,
  lastRefresh,
  secondsAgo,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="p-5 sm:p-7 rounded-3xl relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1324] to-slate-950 border border-fuchsia-500/20 shadow-2xl">
      <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-fuchsia-500/5 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm min-h-[32px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to CMS</span>
              </button>
            )}
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              Super Admin Only
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            <Key className="w-7 h-7 text-fuchsia-400 shrink-0" />
            <span>System Credentials</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Restricted to Super Admins only. Shows environment configuration, role hierarchy, demo accounts, and the full API surface.
          </p>

          {lastRefresh && (
            <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                Last refreshed {secondsAgo !== null ? `${secondsAgo}s` : '—'} ago
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 accent-fuchsia-500 cursor-pointer"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-fuchsia-500/20 min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface RoleRosterCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'fuchsia' | 'amber';
  users: RoleUser[];
  badgeLabel: string;
  badgeClass: string;
  emptyMessage: string;
  note?: string;
}

const RoleRosterCard: React.FC<RoleRosterCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  accent,
  users,
  badgeLabel,
  badgeClass,
  emptyMessage,
  note,
}) => {
  const accentBorder = accent === 'fuchsia' ? 'border-fuchsia-500/20' : 'border-amber-500/20';
  const accentIcon = accent === 'fuchsia' ? 'text-fuchsia-400' : 'text-amber-400';
  const accentIconBg = accent === 'fuchsia' ? 'bg-fuchsia-500/10 border-fuchsia-500/20' : 'bg-amber-500/10 border-amber-500/20';
  const accentBar = accent === 'fuchsia' ? 'via-fuchsia-500/40' : 'via-amber-500/40';

  return (
    <div className={`p-5 sm:p-6 rounded-3xl bg-slate-950/80 border ${accentBorder} space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden`}>
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${accentBar} to-transparent`} />

      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg border ${accentIconBg} ${accentIcon} shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="truncate">{title}</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 break-words">{subtitle}</p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/5">
          {users.length} {users.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="p-4 text-center rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {users.map((u, idx) => (
            <motion.div
              key={u.id || idx}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.04 }}
              className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/5 hover:border-white/15 transition-all flex items-center gap-3"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${accentIconBg} ${accentIcon} border flex items-center justify-center font-bold text-xs sm:text-sm shrink-0`}>
                {u.name ? u.name.substring(0, 2).toUpperCase() : '—'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{u.name || 'Unknown'}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                {u.createdAt && (
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    Member since: {formatDate(u.createdAt)}
                  </p>
                )}
              </div>
              <span className={`shrink-0 inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${badgeClass}`}>
                {badgeLabel}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {note && (
        <div className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
          accent === 'fuchsia'
            ? 'bg-fuchsia-500/5 border-fuchsia-500/20 text-fuchsia-200/80'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-200/80'
        }`}>
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${accentIcon}`} />
          <span className="leading-relaxed">{note}</span>
        </div>
      )}
    </div>
  );
};

export default CredentialsView;
