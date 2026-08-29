'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Layers,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  Edit3,
  Upload,
  Users,
  Bell,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  Eye,
  Palette,
  AlertTriangle,
  X,
  Database,
  ChevronRight,
  BookOpen,
  Image as ImageIcon,
  BarChart3,
  Key,
  Crown,
  Activity,
  Bug,
  LogIn,
  LogOut,
  MessageSquare,
  ShoppingBag,
  UserPlus,
  Filter,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CredentialsView } from '@/components/features/pages/CredentialsView';
import { isPlatformOwner } from '@/lib/platform-owner';

interface Subject {
  id: string;
  title: string;
  description: string;
}

interface PracticalFolder {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  images: { url: string; title: string }[];
  createdAt?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePic?: string;
  isAdminStudent?: boolean;
}

interface StudentUser {
  id: string;
  name: string;
  email: string;
  credits?: number;
  profilePic?: string;
  createdAt?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date?: string;
  createdAt?: string;
  authorName?: string;
  createdByName?: string;
  urgency?: 'info' | 'warning' | 'urgent';
  deadline?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number;
  targetUserId?: string | null;
}

interface CommissionBooking {
  id: string;
  studentId: string;
  studentName: string;
  artistId: string;
  artistName: string;
  subject: string;
  numPages: number;
  totalPrice: number;
  status: 'pending' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  deliveryDate?: string;
  createdAt?: string;
  specialInstructions?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  artistEarnings?: number;
}

interface AdminCmsPageProps {
  user: any;
  subjects: Subject[];
  folders: PracticalFolder[];
  adminsList: AdminUser[];
  announcements: Announcement[];
  refreshWorkspaceData: () => void;
  setView: (view: 'dashboard' | 'subject' | 'folder' | 'admin_cms', subjectId?: string, folderId?: string) => void;
  /** Super-admin only: switches the parent view to the /creds route. Falls back to an inline Dialog if omitted. */
  onNavigateToCreds?: () => void;
}

/* ========================================================================== */
/*  ACTIVITY LOG TAB — real-time feed of user actions                          */
/* ========================================================================== */

interface ActivityEntry {
  id: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  category: string;
  detail: string;
  metadataJson?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  createdAt: string;
}

interface ActivityLogTabProps {
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  auth:        { label: 'Auth',        color: 'text-emerald-300', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/25',  icon: LogIn },
  user:        { label: 'User',        color: 'text-sky-300',     bg: 'bg-sky-500/10',      border: 'border-sky-500/25',      icon: Users },
  content:     { label: 'Content',     color: 'text-indigo-300',  bg: 'bg-indigo-500/10',   border: 'border-indigo-500/25',   icon: BookOpen },
  marketplace: { label: 'Marketplace', color: 'text-amber-300',   bg: 'bg-amber-500/10',    border: 'border-amber-500/25',    icon: ShoppingBag },
  chat:        { label: 'Chat',        color: 'text-cyan-300',    bg: 'bg-cyan-500/10',     border: 'border-cyan-500/25',     icon: MessageSquare },
  system:      { label: 'System',      color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10',  border: 'border-fuchsia-500/25',  icon: Activity },
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  register: UserPlus,
  booking_created: ShoppingBag,
  booking_updated: Palette,
  message_sent: MessageSquare,
  profile_updated: Users,
  default: Activity,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ActivityLogTab: React.FC<ActivityLogTabProps> = ({ apiFetch }) => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch('/api/activity-log?limit=100');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEntries(data.entries || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load activity log');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial fetch + poll loop (5s interval)
  useEffect(() => {
    let cancelled = false;

    const doFetch = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiFetch('/api/activity-log?limit=100');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setEntries(data.entries || []);
          setLastRefresh(new Date());
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load activity log');
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    };

    doFetch();

    const pollLoop = async () => {
      while (!cancelled && autoRefresh) {
        await new Promise((r) => setTimeout(r, 5000));
        if (cancelled || !autoRefresh) break;
        await doFetch(true);
      }
    };
    pollLoop();

    return () => { cancelled = true; };
  }, [autoRefresh, apiFetch]);

  // Filter entries by category + search
  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        (e.ipAddress || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Real-Time Activity Log
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filtered.length} entries{lastRefresh ? ` · updated ${timeAgo(lastRefresh.toISOString())}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer min-h-[32px] ${
              autoRefresh
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3 h-3 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => fetchEntries()}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800 transition-all cursor-pointer min-h-[32px]"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {['all', 'auth', 'user', 'content', 'marketplace', 'chat', 'system'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer min-h-[28px] ${
                filter === cat
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-950/80 text-slate-400 border border-white/5 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, IP…"
            className="w-full h-8 pl-8 pr-2 rounded-lg bg-slate-950/80 border border-white/10 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500/40"
          />
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-950/80 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-sm text-center">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-950/80 border border-white/5 text-center text-slate-500 text-sm">
          No activity entries found.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((entry) => {
            const meta = CATEGORY_META[entry.category] || CATEGORY_META.system;
            const Icon = ACTION_ICONS[entry.action] || ACTION_ICONS.default;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/5 hover:border-white/10 hover:bg-slate-950/80 transition-all"
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg ${meta.bg} ${meta.border} border shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">{entry.userName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${meta.bg} ${meta.color} ${meta.border}`}>
                      {entry.action}
                    </span>
                    {entry.userRole && entry.userRole !== 'user' && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        entry.userRole === 'super_admin' ? 'bg-fuchsia-500/15 text-fuchsia-300' :
                        entry.userRole === 'admin' ? 'bg-amber-500/15 text-amber-300' :
                        entry.userRole === 'artist' ? 'bg-pink-500/15 text-pink-300' :
                        'bg-sky-500/15 text-sky-300'
                      }`}>
                        {entry.userRole}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 ml-auto shrink-0">{timeAgo(entry.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 break-words">{entry.detail}</p>
                  {entry.ipAddress && (
                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">IP: {entry.ipAddress}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Bug Monitor Tab — shows recent client-side errors reported via /api/error-log ── */
interface BugEntry {
  ts: string;
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
  ip?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  extra?: Record<string, any>;
}

const BugMonitorTab: React.FC<{ apiFetch: (url: string, opts?: RequestInit) => Promise<Response> }> = ({ apiFetch }) => {
  const [entries, setEntries] = useState<BugEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const doFetch = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch('/api/error-log?limit=100');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load error log');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    doFetch();
    const poll = async () => {
      while (!cancelled && autoRefresh) {
        await new Promise((r) => setTimeout(r, 10000));
        if (cancelled || !autoRefresh) break;
        await doFetch(true);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [autoRefresh, apiFetch]);

  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (e.message || '').toLowerCase().includes(q) ||
        (e.stack || '').toLowerCase().includes(q) ||
        (e.url || '').toLowerCase().includes(q) ||
        (e.userEmail || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const typeColor = (t: string): string => {
    switch (t) {
      case 'react_error': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'window_error': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'unhandledrejection': return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'fetch_error': return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30';
      case 'console_error': return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      default: return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-rose-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <Bug className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Bug Monitor
              {entries.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {entries.length} recent
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filtered.length} entries{lastRefresh ? ` · updated ${timeAgo(lastRefresh.toISOString())}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer min-h-[32px] flex items-center gap-1.5 ${
              autoRefresh ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-900 text-slate-400 border-white/10'
            }`}
          >
            <span className={`relative flex h-1.5 w-1.5 ${autoRefresh ? '' : 'opacity-40'}`}>
              {autoRefresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => doFetch()}
            disabled={loading}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-white/10 hover:bg-slate-800 transition-all cursor-pointer min-h-[32px] flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-2xl bg-slate-950/80 border border-white/10">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-900 border border-white/10 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-rose-500/50 min-h-[36px] cursor-pointer"
        >
          <option value="all">All types</option>
          <option value="react_error">React render errors</option>
          <option value="window_error">Window errors</option>
          <option value="unhandledrejection">Unhandled rejections</option>
          <option value="fetch_error">Fetch errors (5xx / network)</option>
          <option value="console_error">Console errors</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search message, stack, URL, email…"
          className="flex-1 bg-slate-900 border border-white/10 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-rose-500/50 placeholder:text-slate-500 min-h-[36px]"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* List */}
      {loading && entries.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading error log…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
            <Bug className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 font-medium">No errors reported 🎉</p>
          <p className="text-[10px] text-slate-500 mt-1">When users hit bugs, they will show up here in real time.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((e, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-white/10 hover:border-rose-500/30 transition-all">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${typeColor(e.type)}`}>
                    {e.type}
                  </span>
                  {e.userEmail && (
                    <span className="text-[10px] text-slate-400 font-mono truncate">{e.userEmail}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(e.ts)}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1.5 break-words font-medium">{e.message}</p>
              {e.url && (
                <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">📍 {e.url}</p>
              )}
              {e.filename && (
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                  📄 {e.filename}:{e.lineno}:{e.colno}
                </p>
              )}
              {e.extra && Object.keys(e.extra).length > 0 && (
                <div className="mt-1.5 p-2 rounded-lg bg-slate-900/80 border border-white/5 text-[10px] font-mono text-slate-400 break-words">
                  {Object.entries(e.extra).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-slate-500">{k}:</span> {String(v).slice(0, 200)}
                    </div>
                  ))}
                </div>
              )}
              {e.stack && (
                <details className="mt-1.5 group">
                  <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 select-none">
                    Stack trace
                  </summary>
                  <pre className="mt-1 p-2 rounded-lg bg-slate-900/80 border border-white/5 text-[9px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
                    {e.stack}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Banner Customizer Component ── */
const BannerCustomizer: React.FC<{
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}> = ({ apiFetch, showSuccess, showError }) => {
  const [config, setConfig] = useState({
    enabled: true,
    text: '⭐ 2026 Bangladesh National Board Curriculum Standards Fully Integrated for HSC Candidates',
    bgColor: 'rgba(8, 47, 73, 0.4)',
    textColor: '#22d3ee',
    size: 'md' as 'sm' | 'md' | 'lg',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/banner');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings/banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showSuccess('Landing page banner updated!');
      } else {
        showError('Failed to update banner.');
      }
    } catch {
      showError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <span className="text-cyan-400">🎨</span>
          Landing Page Banner
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-xs text-slate-300 font-bold">{config.enabled ? 'Visible' : 'Hidden'}</span>
        </label>
      </div>

      {/* Banner text */}
      <div className="space-y-1">
        <label className="text-[10px] text-slate-400 font-mono uppercase">Banner Text</label>
        <input
          type="text"
          value={config.text}
          onChange={(e) => setConfig({ ...config, text: e.target.value })}
          className="w-full px-3 py-2 bg-slate-900 border border-white/10 text-xs text-slate-100 rounded-xl outline-none focus:border-cyan-500/50 min-h-[40px]"
        />
      </div>

      {/* Colors + size */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">BG Color</label>
          <input
            type="color"
            value={config.bgColor.startsWith('rgba') ? '#082f49' : config.bgColor}
            onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
            className="w-full h-10 rounded-lg border border-white/10 bg-slate-900 cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Text Color</label>
          <input
            type="color"
            value={config.textColor}
            onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
            className="w-full h-10 rounded-lg border border-white/10 bg-slate-900 cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Size</label>
          <select
            value={config.size}
            onChange={(e) => setConfig({ ...config, size: e.target.value as any })}
            className="w-full px-2 py-2 bg-slate-900 border border-white/10 text-xs text-slate-200 rounded-lg outline-none cursor-pointer h-10"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
      </div>

      {/* Live preview */}
      <div
        className="rounded-xl py-2 px-4 text-center"
        style={{ backgroundColor: config.bgColor.startsWith('rgba') ? config.bgColor : config.bgColor + '66' }}
      >
        <span
          className={`font-mono uppercase tracking-wider font-extrabold ${
            config.size === 'lg' ? 'text-sm' : config.size === 'sm' ? 'text-[9px]' : 'text-[10px]'
          }`}
          style={{ color: config.textColor }}
        >
          ● {config.text || '(empty)'}
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg disabled:opacity-50 min-h-[44px]"
      >
        {saving ? 'Saving…' : 'Save Banner'}
      </button>
    </div>
  );
};

const LandingConfigCustomizer: React.FC<{
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}> = ({ apiFetch, showSuccess, showError }) => {
  const [trustBadge, setTrustBadge] = useState({ enabled: true, useCustomCount: false, customCount: 2400 });
  const [realUserCount, setRealUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [landingRes, statsRes] = await Promise.all([
          fetch('/api/settings/landing'),
          fetch('/api/stats'),
        ]);
        if (landingRes.ok) {
          const data = await landingRes.json();
          if (data.trustBadge) {
            setTrustBadge({
              enabled: data.trustBadge.enabled !== false,
              useCustomCount: !!data.trustBadge.useCustomCount,
              customCount: data.trustBadge.customCount || 0,
            });
          }
        }
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setRealUserCount(stats.users ?? 0);
        }
      } catch { /* defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings/landing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trustBadge }),
      });
      if (res.ok) showSuccess('Landing page configuration saved!');
      else { const err = await res.json().catch(() => ({})); showError(err.error || 'Failed to update.'); }
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <span className="text-cyan-400">Users</span>
          Landing Page — Trust Badge
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={trustBadge.enabled} onChange={(e) => setTrustBadge({ ...trustBadge, enabled: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
          <span className="text-xs text-slate-300 font-bold">{trustBadge.enabled ? 'Visible' : 'Hidden'}</span>
        </label>
      </div>
      <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 border border-white/5 rounded-lg p-3">
        Controls the &quot;Trusted by N students&quot; badge. When hidden, the badge disappears.
        When set to &quot;Real DB count&quot;, shows live user count (currently <strong className="text-cyan-300">{realUserCount ?? '...'} users</strong>).
        When set to &quot;Custom count&quot;, shows a hardcoded number.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTrustBadge({ ...trustBadge, useCustomCount: false })}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[64px] ${!trustBadge.useCustomCount ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-slate-900 border-white/10 hover:border-white/20'}`}>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Source</div>
          <div className="text-sm font-bold text-white mt-1">Real DB count</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{realUserCount ?? '...'} registered users</div>
        </button>
        <button type="button" onClick={() => setTrustBadge({ ...trustBadge, useCustomCount: true })}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[64px] ${trustBadge.useCustomCount ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-slate-900 border-white/10 hover:border-white/20'}`}>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Source</div>
          <div className="text-sm font-bold text-white mt-1">Custom count</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hardcoded marketing number</div>
        </button>
      </div>
      {trustBadge.useCustomCount && (
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Custom student count</label>
          <input type="number" min={0} max={999999} value={trustBadge.customCount}
            onChange={(e) => setTrustBadge({ ...trustBadge, customCount: parseInt(e.target.value || '0', 10) || 0 })}
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 text-xs text-slate-100 rounded-xl outline-none focus:border-cyan-500/50 min-h-[40px]" />
        </div>
      )}
      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20 transition-all min-h-[44px]">
        {saving ? 'Saving...' : 'Save Landing Configuration'}
      </button>
    </div>
  );
};

export const AdminCmsPage: React.FC<AdminCmsPageProps> = ({
  user,
  subjects,
  folders,
  adminsList,
  announcements,
  refreshWorkspaceData,
  setView,
  onNavigateToCreds
}) => {
  const { apiFetch } = useAuth();
  // Navigation tabs: 'overview' | 'content' | 'assets' | 'users' | 'commissions' | 'announcements'
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'assets' | 'users' | 'commissions' | 'announcements' | 'activity' | 'bugs'>('overview');

  // Notification Banner States
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loading States
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Content CMS Tab States
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');

  // Subject Modal / Form
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectTitleInput, setSubjectTitleInput] = useState('');
  const [subjectDescInput, setSubjectDescInput] = useState('');

  // Folder Modal / Form
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<PracticalFolder | null>(null);
  const [folderSubjectIdInput, setFolderSubjectIdInput] = useState('');
  const [folderTitleInput, setFolderTitleInput] = useState('');
  const [folderDescInput, setFolderDescInput] = useState('');

  // Scan Upload Modal per Folder
  const [uploadScanFolder, setUploadScanFolder] = useState<PracticalFolder | null>(null);
  const [scanTitleInput, setScanTitleInput] = useState('');
  const [scanFileInput, setScanFileInput] = useState<File | null>(null);
  const [scanUrlInput, setScanUrlInput] = useState('');

  // Asset Library Tab States
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetSubjectFilter, setAssetSubjectFilter] = useState('all');
  const [previewAssetUrl, setPreviewAssetUrl] = useState<string | null>(null);

  // Users Tab States
  const [studentsList, setStudentsList] = useState<StudentUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [promoteEmail, setPromoteEmail] = useState('');
  const [confirmDemoteId, setConfirmDemoteId] = useState<string | null>(null);

  // Commissions Tab States
  const [commissionsList, setCommissionsList] = useState<CommissionBooking[]>([]);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>('all');

  // Announcement Form
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceUrgency, setAnnounceUrgency] = useState<'info' | 'warning' | 'urgent'>('info');
  const [announceDeadline, setAnnounceDeadline] = useState('');
  const [announceFile, setAnnounceFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [announceTargetUser, setAnnounceTargetUser] = useState(''); // user ID or '' for broadcast
  const [announceTargetName, setAnnounceTargetName] = useState(''); // display name
  const [announceSearch, setAnnounceSearch] = useState('');
  const announceFileRef = useRef<HTMLInputElement>(null);

  // Super Admin States (only used when user.role === 'super_admin')
  const [superAdminsList, setSuperAdminsList] = useState<AdminUser[]>([]);
  const [superPromoteEmail, setSuperPromoteEmail] = useState('');
  const [credsDialogOpen, setCredsDialogOpen] = useState(false);

  const isMainOwner = isPlatformOwner(user?.email);
  const isSuperAdmin = user?.role === 'super_admin';

  // Helper notice handlers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  // Fetch Students & Commissions data on mount
  useEffect(() => {
    fetchStudents();
    fetchCommissions();
    fetchSuperAdmins();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await apiFetch('/api/users/students');
      if (res.ok) {
        const data = await res.json();
        setStudentsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch students:', e);
    }
  };

  const fetchSuperAdmins = async () => {
    try {
      const res = await apiFetch('/api/users/super-admins');
      if (res.ok) {
        const data = await res.json();
        setSuperAdminsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch super admins:', e);
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await apiFetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const bookings = Array.isArray(data) ? data : (data.bookings || []);
        // Map API fields to the component's expected shape
        const mapped = bookings.map((b: any) => ({
          id: b.id,
          studentName: b.client?.name || b.clientName || 'Unknown',
          artistName: b.artist?.name || b.artistName || 'Unknown',
          subject: b.subject || '',
          totalPrice: b.price || 0,
          numPages: b.description?.length > 0 ? 1 : 0,
          status: b.status || 'pending',
          paymentStatus: b.paymentStatus || 'unpaid',
          specialInstructions: b.clientNotes || '',
          createdAt: b.createdAt,
          commissionPercent: b.commissionPercent || 0,
          commissionAmount: b.commissionAmount || 0,
          artistEarnings: b.artistEarnings || b.price || 0,
        }));
        setCommissionsList(mapped);
      }
    } catch (e) {
      console.warn('Could not fetch commissions:', e);
    }
  };

  // ===================================
  // SUBJECT HANDLERS
  // ===================================
  const handleOpenSubjectModal = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectTitleInput(subject.title);
      setSubjectDescInput(subject.description || '');
    } else {
      setEditingSubject(null);
      setSubjectTitleInput('');
      setSubjectDescInput('');
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectTitleInput.trim()) {
      showError("Subject title is required.");
      return;
    }
    setIsActionLoading(true);

    try {
      if (editingSubject) {
        // Edit Subject
        const res = await apiFetch(`/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: subjectTitleInput, description: subjectDescInput })
        });
        if (res.ok) {
          showSuccess(`Subject "${subjectTitleInput}" updated successfully!`);
          setIsSubjectModalOpen(false);
          refreshWorkspaceData();
        } else {
          const err = await res.json();
          showError(err.error || "Failed to update subject.");
        }
      } else {
        // Create Subject
        const res = await apiFetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: subjectTitleInput, description: subjectDescInput })
        });
        if (res.ok) {
          showSuccess(`Subject "${subjectTitleInput}" created successfully!`);
          setIsSubjectModalOpen(false);
          refreshWorkspaceData();
        } else {
          const err = await res.json();
          showError(err.error || "Failed to create subject.");
        }
      }
    } catch (e: any) {
      showError("Network error while saving subject.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete subject "${subject.title}"?`)) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/subjects/${subject.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess(`Subject "${subject.title}" deleted successfully.`);
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delete subject.");
      }
    } catch (e) {
      showError("Network error deleting subject.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // FOLDER HANDLERS
  // ===================================
  const handleOpenFolderModal = (folder?: PracticalFolder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderSubjectIdInput(folder.subjectId);
      setFolderTitleInput(folder.title);
      setFolderDescInput(folder.description || '');
    } else {
      setEditingFolder(null);
      setFolderSubjectIdInput(subjects[0]?.id || '');
      setFolderTitleInput('');
      setFolderDescInput('');
    }
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderTitleInput.trim() || !folderSubjectIdInput) {
      showError("Subject and folder title are required.");
      return;
    }
    setIsActionLoading(true);

    try {
      if (editingFolder) {
        const res = await apiFetch(`/api/folders/${editingFolder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: folderTitleInput, description: folderDescInput })
        });
        if (res.ok) {
          showSuccess(`Folder "${folderTitleInput}" updated successfully!`);
          setIsFolderModalOpen(false);
          refreshWorkspaceData();
        } else {
          const err = await res.json();
          showError(err.error || "Failed to update folder.");
        }
      } else {
        const res = await apiFetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: folderSubjectIdInput,
            title: folderTitleInput,
            description: folderDescInput
          })
        });
        if (res.ok) {
          showSuccess(`Practical folder "${folderTitleInput}" created!`);
          setIsFolderModalOpen(false);
          refreshWorkspaceData();
        } else {
          const err = await res.json();
          showError(err.error || "Failed to create folder.");
        }
      }
    } catch (e) {
      showError("Network error saving folder.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: PracticalFolder) => {
    if (!confirm(`Are you sure you want to delete practical notebook folder "${folder.title}"?`)) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess(`Practical folder "${folder.title}" deleted.`);
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delete folder.");
      }
    } catch (e) {
      showError("Network error deleting folder.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // SCAN UPLOAD TO FOLDER
  // ===================================
  const handleUploadScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadScanFolder) return;

    let finalImageUrl = scanUrlInput.trim();

    if (scanFileInput) {
      const formData = new FormData();
      formData.append('image', scanFileInput);
      setIsActionLoading(true);
      try {
        const uploadRes = await apiFetch('/api/images/upload-file', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = uploadData.url;
        } else {
          const err = await uploadRes.json();
          showError(err.error || "Failed to upload file.");
          setIsActionLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Image file upload endpoint not yet implemented in Next.js backend:', e);
        showError("File upload network error.");
        setIsActionLoading(false);
        return;
      }
    }

    if (!finalImageUrl) {
      showError("Please provide an image file or URL.");
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: uploadScanFolder.id,
          imageUrl: finalImageUrl,
          title: scanTitleInput.trim() || 'Practical Diagram Scan'
        })
      });

      if (res.ok) {
        showSuccess("Scan diagram added to practical folder!");
        setUploadScanFolder(null);
        setScanTitleInput('');
        setScanFileInput(null);
        setScanUrlInput('');
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to attach image scan.");
      }
    } catch (e) {
      showError("Network error attaching image scan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteScan = async (folderId: string, imageIndex: number, scanTitle: string) => {
    if (!confirm(`Delete scan page "${scanTitle}"?`)) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/images/${folderId}/${imageIndex}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess(`Scan page deleted.`);
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delete scan.");
      }
    } catch (e) {
      showError("Network error deleting scan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // USERS & ADMINS HANDLERS
  // ===================================
  const handlePromoteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/users/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: promoteEmail.trim() })
      });
      if (res.ok) {
        showSuccess(`Successfully promoted ${promoteEmail} to Administrator!`);
        setPromoteEmail('');
        refreshWorkspaceData();
        fetchStudents();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delegate administrator role.");
      }
    } catch (e) {
      showError("Network error promoting user.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // SUPER ADMIN HANDLERS (super_admin only)
  // ===================================
  const handlePromoteSuperEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superPromoteEmail.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/users/promote-super', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: superPromoteEmail.trim() })
      });
      if (res.ok) {
        showSuccess(`Elevated ${superPromoteEmail} to Super Admin — full system access granted.`);
        setSuperPromoteEmail('');
        refreshWorkspaceData();
        fetchStudents();
        fetchSuperAdmins();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to elevate to super admin.");
      }
    } catch (e) {
      showError("Network error elevating to super admin.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePromoteAdminToSuper = async (adminEmail: string, adminName: string) => {
    if (!confirm(`Elevate ${adminName} (${adminEmail}) to Super Admin?\n\nThis grants FULL SYSTEM ACCESS including the /creds view and the ability to demote other admins. Proceed only if you fully trust this user.`)) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/users/promote-super', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });
      if (res.ok) {
        showSuccess(`${adminName} elevated to Super Admin!`);
        refreshWorkspaceData();
        fetchStudents();
        fetchSuperAdmins();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to elevate to super admin.");
      }
    } catch (e) {
      showError("Network error elevating to super admin.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenCredsView = () => {
    if (onNavigateToCreds) {
      onNavigateToCreds();
    } else {
      setCredsDialogOpen(true);
    }
  };

  // ===================================
  // ANNOUNCEMENTS HANDLERS
  // ===================================
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceContent.trim()) {
      showError("Title and content are required for announcement.");
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await apiFetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announceTitle.trim(),
          content: announceContent.trim(),
          deadline: announceDeadline.trim() || undefined,
          fileUrl: announceFile?.url || undefined,
          fileName: announceFile?.name || undefined,
          fileSize: announceFile?.size || 0,
          targetUserId: announceTargetUser || undefined,
        })
      });
      if (res.ok) {
        showSuccess(announceTargetUser ? "File/announcement sent to selected user!" : "Announcement published to all users!");
        setAnnounceTitle('');
        setAnnounceContent('');
        setAnnounceDeadline('');
        setAnnounceFile(null);
        setAnnounceTargetUser('');
        setAnnounceTargetName('');
        setAnnounceSearch('');
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to publish announcement.");
      }
    } catch (e) {
      showError("Network error creating announcement.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle file upload for announcement attachment
  const handleAnnounceFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (announceFileRef.current) announceFileRef.current.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showError('Max 50 MB for file attachments.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAnnounceFile({
        url: String(reader.result || ''),
        name: file.name,
        size: file.size,
      });
    };
    reader.onerror = () => showError('Could not read file.');
    reader.readAsDataURL(file);
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess(`Announcement deleted.`);
        refreshWorkspaceData();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to delete announcement.");
      }
    } catch (e) {
      showError("Network error deleting announcement.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // COMMISSION IMPOSER — admin sets commission % on a booking
  // ===================================
  const [commissionModalBooking, setCommissionModalBooking] = useState<CommissionBooking | null>(null);
  const [commissionPctInput, setCommissionPctInput] = useState<number>(10);

  const handleSetCommission = async (bookingId: string, pct: number) => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionPercent: pct })
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Commission set to ${pct}% — ৳${data.commissionAmount} from ৳${data.price}`);
        fetchCommissions();
        setCommissionModalBooking(null);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to set commission.");
      }
    } catch (e) {
      showError("Network error setting commission.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ===================================
  // COMMISSION PAYMENT TOGGLE
  // ===================================
  const handleToggleCommissionPayment = async (bookingId: string) => {
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' })
      });
      if (res.ok) {
        showSuccess("Payment status updated!");
        fetchCommissions();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update payment.");
      }
    } catch (e) {
      showError("Network error updating payment.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Aggregated Asset Scans List
  const allScans = folders.flatMap(f => {
    const parentSub = subjects.find(s => s.id === f.subjectId);
    return f.images.map((img, idx) => ({
      ...img,
      folderId: f.id,
      folderTitle: f.title,
      subjectId: f.subjectId,
      subjectTitle: parentSub?.title || 'General',
      imageIndex: idx
    }));
  });

  // Filtered Folders
  const filteredFolders = folders.filter(f => {
    const matchesSub = selectedSubjectFilter === 'all' || f.subjectId === selectedSubjectFilter;
    const matchesSearch = !folderSearchQuery.trim() ||
      f.title.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(folderSearchQuery.toLowerCase()));
    return matchesSub && matchesSearch;
  });

  // Filtered Scans
  const filteredScans = allScans.filter(s => {
    const matchesSub = assetSubjectFilter === 'all' || s.subjectId === assetSubjectFilter;
    const matchesSearch = !assetSearchQuery.trim() ||
      s.title.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      s.folderTitle.toLowerCase().includes(assetSearchQuery.toLowerCase());
    return matchesSub && matchesSearch;
  });

  // Filtered Users — adminsList is the union of admin + super_admin per the /api/users/admins route.
  // Regular admins are shown in the existing Administrators Table; super admins are shown in a
  // dedicated roster visible to super_admin viewers only.
  const filteredAdmins = adminsList.filter(a => {
    if (a.role === 'super_admin') return false;
    return !userSearchQuery.trim() ||
      a.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  const filteredSuperAdmins = superAdminsList.filter(a => {
    return !userSearchQuery.trim() ||
      a.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  const filteredStudents = studentsList.filter(s => {
    return !userSearchQuery.trim() ||
      s.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  // Filtered Commissions
  const filteredCommissions = commissionsList.filter(c => {
    return commissionStatusFilter === 'all' || c.status === commissionStatusFilter;
  });

  // Stats Counters
  const totalScansCount = allScans.length;
  const totalStudentsCount = studentsList.length;
  const totalAdminsCount = adminsList.length;
  const totalCommissionsCount = commissionsList.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 min-w-0 overflow-x-hidden pb-12">

      {/* ==============================================
          HEADER BANNER - INDUSTRY GRADE CMS CONTROL ENGINE
          ============================================== */}
      <div className="p-5 sm:p-7 rounded-3xl relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1324] to-slate-950 border border-cyan-500/20 shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setView('dashboard')}
                className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm min-h-[32px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit CMS</span>
              </button>

              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                PracPedia CMS v2.4 Enterprise
              </span>
              {isSuperAdmin ? (
                <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3 h-3" />
                  Super Admin
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <Database className="w-7 h-7 text-cyan-400 shrink-0" />
              <span>{isSuperAdmin ? 'Super Admin Control Center' : 'Administrator Control Center'}</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Full CRUD system to curate subjects, practical notebook scan repositories, student credit balances, drawing commissions, and real-time portal broadcasts.
            </p>
          </div>

          {/* Quick CMS Action Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {isSuperAdmin && (
              <button
                onClick={handleOpenCredsView}
                title="Open the Super Admin /creds view (system credentials, role lists, API surface, demo accounts)"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white border border-fuchsia-400/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-fuchsia-500/20 min-h-[44px]"
              >
                <Key className="w-4 h-4" />
                <span>View System Credentials</span>
              </button>
            )}
            <button
              onClick={() => handleOpenSubjectModal()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-cyan-500/30 min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Subject</span>
            </button>
            <button
              onClick={() => handleOpenFolderModal()}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 min-h-[44px]"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Practical Folder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Alerts / Toasts */}
      {(successMsg || errorMsg) && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="break-words">{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="break-words">{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==============================================
          CMS NAVIGATION TAB SYSTEM
          ============================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/10 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'overview'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'content'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects & Practical Folders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {folders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'assets'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Diagram Asset Library</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {totalScansCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'users'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Access Control</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {totalAdminsCount + totalStudentsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'commissions'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Commissions Escrow</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {totalCommissionsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'announcements'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notice Broadcasts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {announcements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'activity'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity Log</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bugs')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'bugs'
              ? 'bg-rose-500 text-slate-950 font-black shadow-lg shadow-rose-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span>Bug Monitor</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & SYSTEM METRICS
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Banner Customization Card */}
          <BannerCustomizer apiFetch={apiFetch} showSuccess={showSuccess} showError={showError} />

          {/* Landing Page Trust Badge Config */}
          <LandingConfigCustomizer apiFetch={apiFetch} showSuccess={showSuccess} showError={showError} />

          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              {
                title: "Subjects",
                count: subjects.length,
                desc: "Faculties",
                icon: BookOpen,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10 border-indigo-500/20",
                laser: "via-indigo-400/50"
              },
              {
                title: "Notebook Folders",
                count: folders.length,
                desc: "Lab Notebooks",
                icon: Layers,
                color: "text-cyan-400",
                bg: "bg-cyan-500/10 border-cyan-500/20",
                laser: "via-cyan-400/50"
              },
              {
                title: "Diagram Scans",
                count: totalScansCount,
                desc: "HD Worksheets",
                icon: ImageIcon,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
                laser: "via-emerald-400/50"
              },
              {
                title: "Administrators",
                count: totalAdminsCount,
                desc: "Supervisors",
                icon: ShieldCheck,
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
                laser: "via-amber-400/50"
              },
              {
                title: "Active Scholars",
                count: totalStudentsCount,
                desc: "Registered",
                icon: Users,
                color: "text-sky-400",
                bg: "bg-sky-500/10 border-sky-500/20",
                laser: "via-sky-400/50"
              },
              {
                title: "Commissions",
                count: totalCommissionsCount,
                desc: "Orders Active",
                icon: Palette,
                color: "text-purple-400",
                bg: "bg-purple-500/10 border-purple-500/20",
                laser: "via-purple-400/50"
              }
            ].map((metric, mIdx) => {
              const MetricIcon = metric.icon;
              return (
                <div
                  key={mIdx}
                  className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all duration-300 relative group overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${metric.laser} to-transparent opacity-70 group-hover:opacity-100 transition-opacity`} />

                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider truncate">
                      {metric.title}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${metric.bg} ${metric.color} transition-transform group-hover:scale-110 shrink-0`}>
                      <MetricIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-black text-white tracking-tight font-sans">
                      {metric.count}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      {metric.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CMS Quick Actions & Audit Stream Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Quick Management Dock */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">CMS Executive Controls</span>
                </h3>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => { setActiveTab('content'); handleOpenSubjectModal(); }}
                  className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-cyan-500/30 text-left transition-all flex items-center justify-between text-xs cursor-pointer group shadow-sm hover:-translate-y-0.5 min-h-[64px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-slate-100 block group-hover:text-cyan-300 transition-colors truncate">Create Subject Category</strong>
                      <span className="text-[10px] text-slate-400 truncate block">Physics, Biology, Higher Math, ICT</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => { setActiveTab('content'); handleOpenFolderModal(); }}
                  className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-indigo-500/30 text-left transition-all flex items-center justify-between text-xs cursor-pointer group shadow-sm hover:-translate-y-0.5 min-h-[64px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                      <FolderPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-slate-100 block group-hover:text-indigo-300 transition-colors truncate">Create Practical Folder</strong>
                      <span className="text-[10px] text-slate-400 truncate block">Vernier Caliper, Screw Gauge, Titration</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setActiveTab('announcements')}
                  className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 text-left transition-all flex items-center justify-between text-xs cursor-pointer group shadow-sm hover:-translate-y-0.5 min-h-[64px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-slate-100 block group-hover:text-amber-300 transition-colors truncate">Issue Deadline Broadcast</strong>
                      <span className="text-[10px] text-slate-400 truncate block">Push live alerts to student dashboards</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-emerald-500/30 text-left transition-all flex items-center justify-between text-xs cursor-pointer group shadow-sm hover:-translate-y-0.5 min-h-[64px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-slate-100 block group-hover:text-emerald-300 transition-colors truncate">Delegate Admin Privileges</strong>
                      <span className="text-[10px] text-slate-400 truncate block">Promote verified lab supervisors</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>
            </div>

            {/* Subject Breakdown & Content Summary */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 lg:col-span-2 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Subject Content Distribution</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded-full border border-white/5 shrink-0">
                  {subjects.length} Active Categories
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                {subjects.map(sub => {
                  const subFolders = folders.filter(f => f.subjectId === sub.id);
                  const subScansCount = subFolders.reduce((acc, f) => acc + (f.images?.length || 0), 0);

                  return (
                    <div
                      key={sub.id}
                      className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/5 space-y-2 hover:border-indigo-500/30 transition-all shadow-md group relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <strong className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate min-w-0">{sub.title}</strong>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 shrink-0">
                            {subFolders.length} F
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 font-sans break-words">{sub.description || 'Standard practical category'}</p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono gap-1">
                        <span className="truncate">Scans: <strong className="text-emerald-400 font-bold">{subScansCount}</strong></span>
                        <button
                          onClick={() => { setSelectedSubjectFilter(sub.id); setActiveTab('content'); }}
                          className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
                        >
                          <span>Manage</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SUBJECTS & PRACTICAL FOLDERS MANAGEMENT (CMS CRUD)
          ========================================================================= */}
      {activeTab === 'content' && (
        <div className="space-y-6">

          {/* Action Bar & Filters */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* Search and subject select */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-xl flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search practical folders..."
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
                {folderSearchQuery && (
                  <button onClick={() => setFolderSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white min-w-[24px] min-h-[24px] flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none cursor-pointer focus:border-cyan-500/50 shrink-0 w-full sm:w-auto min-h-[44px]"
              >
                <option value="all">All Subjects ({subjects.length})</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={() => handleOpenSubjectModal()}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Subject</span>
              </button>
              <button
                onClick={() => handleOpenFolderModal()}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Practical Folder</span>
              </button>
            </div>
          </div>

          {/* Subjects Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider truncate">
                Subject Categories ({subjects.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">Core Curricula</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {subjects.map(sub => {
                const isSelected = selectedSubjectFilter === sub.id;
                const folderCount = folders.filter(f => f.subjectId === sub.id).length;

                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3 sm:space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-950/40 to-slate-950/90 border-cyan-500/50 shadow-cyan-500/10'
                        : 'bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${isSelected ? 'via-cyan-400' : 'via-indigo-400/40 group-hover:via-indigo-400'} to-transparent transition-all`} />

                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-start justify-between gap-1.5">
                        <strong className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 group-hover:text-cyan-300 transition-colors truncate min-w-0">
                          <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>
                          <span className="truncate">{sub.title}</span>
                        </strong>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenSubjectModal(sub)}
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Edit Subject"
                          >
                            <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(sub)}
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans break-words">{sub.description || 'Standard verified academic discipline curriculum.'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/5 text-[9px] sm:text-[10px] gap-1">
                      <span className="font-mono px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-900 border border-white/5 text-slate-300 font-bold shrink-0">
                        {folderCount} Folders
                      </span>
                      <button
                        onClick={() => setSelectedSubjectFilter(selectedSubjectFilter === sub.id ? 'all' : sub.id)}
                        className={`font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer text-[10px] sm:text-xs min-h-[28px] ${
                          isSelected ? 'bg-cyan-500 text-slate-950 font-black' : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20'
                        }`}
                      >
                        {isSelected ? '✓ Active' : 'Filter'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Practical Folders Directory Grid */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider truncate">
                Practical Notebook Folders ({filteredFolders.length})
              </h3>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">Curated Lab Experiments</span>
            </div>

            {filteredFolders.length === 0 ? (
              <div className="p-10 rounded-3xl bg-slate-950/60 border border-white/5 text-center space-y-3 shadow-xl">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No practical folders found for current filter criteria.</p>
                <button
                  onClick={() => handleOpenFolderModal()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20 min-h-[44px]"
                >
                  Create First Practical Folder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredFolders.map(folder => {
                  const parentSubject = subjects.find(s => s.id === folder.subjectId);

                  return (
                    <div
                      key={folder.id}
                      className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all duration-300 space-y-3 sm:space-y-4 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden group"
                    >
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                      <div className="space-y-2.5 sm:space-y-3 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <span className="text-[8px] sm:text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider bg-cyan-500/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-cyan-500/20 truncate block">
                              {parentSubject?.title || 'General'}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-white mt-1 sm:mt-1.5 group-hover:text-cyan-300 transition-colors line-clamp-1 break-words">{folder.title}</h4>
                          </div>

                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenFolderModal(folder)}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Edit Folder"
                            >
                              <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder)}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans break-words">{folder.description || 'Experimental worksheets and reading protocols.'}</p>

                        {/* Scans Grid Thumbnails Preview */}
                        <div className="space-y-1.5 sm:space-y-2 pt-2 sm:pt-3 border-t border-white/5">
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono gap-1">
                            <span className="truncate">Scans ({folder.images?.length || 0})</span>
                            <button
                              onClick={() => setUploadScanFolder(folder)}
                              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-0.5 cursor-pointer font-bold shrink-0 min-h-[24px]"
                            >
                              <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>Attach</span>
                            </button>
                          </div>

                          {folder.images && folder.images.length > 0 ? (
                            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                              {folder.images.slice(0, 4).map((img, idx) => (
                                <div key={idx} className="group/img relative aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-inner">
                                  <img
                                    src={img.url}
                                    alt={img.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setPreviewAssetUrl(img.url)}
                                      className="p-1 text-white hover:text-cyan-400 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteScan(folder.id, idx, img.title)}
                                      className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-900/40 rounded-xl text-center text-[10px] text-slate-500 font-mono border border-white/5">
                              No diagram scans uploaded yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono gap-1 flex-wrap">
                        <span className="truncate">{folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : 'System'}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setView('folder', undefined, folder.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold font-sans cursor-pointer transition-all text-[10px] shadow-sm min-h-[28px]"
                          >
                            Open Vault →
                          </button>
                          <button
                            onClick={() => setUploadScanFolder(folder)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold font-sans cursor-pointer transition-colors text-[10px] border border-white/5 min-h-[28px]"
                          >
                            + Upload Scan
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: GLOBAL DIAGRAM ASSET LIBRARY
          ========================================================================= */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Asset search & filters */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md">
            <div className="relative flex-1 w-full sm:w-auto max-w-xl">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search scans across all subjects and folders..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 min-h-[44px]"
              />
            </div>

            <select
              value={assetSubjectFilter}
              onChange={(e) => setAssetSubjectFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none cursor-pointer focus:border-cyan-500/50 w-full sm:w-auto min-h-[44px]"
            >
              <option value="all">All Subjects Scans ({allScans.length})</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Asset Grid View */}
          {filteredScans.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-950/60 border border-white/5 space-y-2 shadow-xl">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No diagram scans match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {filteredScans.map((scan, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between shadow-xl">
                  <div className="aspect-square relative overflow-hidden bg-slate-900">
                    <img
                      src={scan.url}
                      alt={scan.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewAssetUrl(scan.url)}
                        className="p-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-all cursor-pointer shadow-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="View Fullscreen Scan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteScan(scan.folderId, scan.imageIndex, scan.title)}
                        className="p-2 rounded-xl bg-rose-500/80 text-white font-bold hover:bg-rose-500 transition-all cursor-pointer shadow-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 space-y-1 bg-slate-950/90 border-t border-white/5 min-w-0">
                    <strong className="text-xs font-bold text-white truncate block group-hover:text-cyan-300 transition-colors">{scan.title}</strong>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono gap-1">
                      <span className="truncate text-cyan-400 font-bold">{scan.subjectTitle}</span>
                      <span className="truncate text-slate-500">{scan.folderTitle}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: USER ACCOUNTS & ACCESS CONTROL
          ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">

          {/* Super Admins Roster — visible to super_admin viewers only */}
          {isSuperAdmin && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-fuchsia-500/20 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <span className="truncate">Super Admins Roster</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 break-words">Platform owners with full system access. Fetched live from /api/users/super-admins.</p>
                </div>
                <span className="text-[10px] font-mono text-fuchsia-300 shrink-0 px-2.5 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
                  {filteredSuperAdmins.length} {filteredSuperAdmins.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              {filteredSuperAdmins.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-400">
                  Loading super admins roster…
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSuperAdmins.map((sa, idx) => {
                    const isMainSuperAdmin = idx === 0; // The first super admin (Professor Akash) is the platform owner
                    return (
                      <div
                        key={sa.id || `sa-${idx}`}
                        className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all duration-300 flex items-center gap-2.5 sm:gap-3.5 shadow-md relative overflow-hidden group"
                      >
                        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                          {sa.profilePic ? (
                            <img src={sa.profilePic} alt={sa.name} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl object-cover border border-fuchsia-500/30 shadow-md shrink-0" />
                          ) : (
                            <div className="w-8 h-8 sm:w-11 sm:h-11 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 rounded-xl flex items-center justify-center shrink-0">
                              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{sa.name}</span>
                              {isMainSuperAdmin && (
                                <span className="px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">
                                  OWNER
                                </span>
                              )}
                            </h4>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 truncate font-mono mt-0.5">{sa.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30">
                            Super Admin
                          </span>
                          <span
                            title="Super admins are protected and cannot be demoted except by another super admin"
                            className="text-[9px] font-mono text-slate-500 italic px-1.5 py-0.5 hidden sm:inline"
                          >
                            Protected
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <p className="text-[10px] text-slate-500 italic mt-2 px-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 shrink-0 text-fuchsia-400" />
                    Super admins are protected and cannot be demoted except by another super admin.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Promote to Super Admin form — super_admin only */}
          {isSuperAdmin && (
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-fuchsia-500/20 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <span className="truncate">Elevate to Super Admin</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 break-words">Promote an existing user to Super Admin — grants full system access including the /creds view.</p>
                </div>
              </div>

              <form onSubmit={handlePromoteSuperEmail} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <input
                  type="email"
                  placeholder="existing.user@gallery.com"
                  required
                  value={superPromoteEmail}
                  onChange={(e) => setSuperPromoteEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-fuchsia-500/50 font-mono min-h-[44px] w-full"
                />
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-black rounded-xl text-xs transition-all shrink-0 cursor-pointer shadow-lg shadow-fuchsia-500/20 flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Promote to Super</span>
                </button>
              </form>
            </div>
          )}

          {/* User Search & Elevate Privileges */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="truncate">Delegate Administrator Privileges</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 break-words">Elevate registered university experiment supervisors or lab teaching assistants.</p>
              </div>
            </div>

            <form onSubmit={handlePromoteEmail} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
              <input
                type="email"
                placeholder="vetted.supervisor@university.edu"
                required
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-amber-500/50 font-mono min-h-[44px] w-full"
              />
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all shrink-0 cursor-pointer shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Promote to Admin</span>
              </button>
            </form>
          </div>

          {/* Search bar & filter */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md">
            <div className="relative flex-1 w-full max-w-xl">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/5 w-full sm:w-auto justify-center sm:justify-start flex-wrap">
              <button
                onClick={() => setUserRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${userRoleFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                All Users
              </button>
              <button
                onClick={() => setUserRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${userRoleFilter === 'admin' ? 'bg-amber-400 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Admins ({filteredAdmins.length})
              </button>
              <button
                onClick={() => setUserRoleFilter('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${userRoleFilter === 'student' ? 'bg-sky-400 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Students ({filteredStudents.length})
              </button>
            </div>
          </div>

          {/* Administrators Table / List */}
          {(userRoleFilter === 'all' || userRoleFilter === 'admin') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider truncate">
                  Vetted Administrators & Supervisors ({filteredAdmins.length})
                </h3>
                <span className="text-[11px] font-mono text-amber-400/80 shrink-0 hidden sm:inline">Full Permission Keyholders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {filteredAdmins.map(adm => {
                  const isRowMainOwner = isPlatformOwner(adm.email);
                  const isRowSuperAdmin = adm.role === 'super_admin';
                  const canDemoteRow = !isRowSuperAdmin && !isRowMainOwner && (isSuperAdmin || isMainOwner);

                  return (
                    <div
                      key={adm.id}
                      className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3.5 shadow-xl relative overflow-hidden group"
                    >
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                        {adm.profilePic ? (
                          <img src={adm.profilePic} alt={adm.name} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl object-cover border border-amber-500/30 shadow-md shrink-0" />
                        ) : (
                          <div className="w-8 h-8 sm:w-11 sm:h-11 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                            <span className="truncate">{adm.name}</span>
                            {isRowMainOwner && <span className="px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">OWNER</span>}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 truncate font-mono mt-0.5">{adm.email}</p>
                          <div className="mt-0.5 sm:mt-1 flex items-center gap-1">
                            <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded text-[7.5px] sm:text-[8px] font-mono font-bold uppercase truncate ${adm.isAdminStudent ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                              {adm.isAdminStudent ? 'Admin+Student' : 'Supervisor'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
                        {isSuperAdmin && !isRowSuperAdmin && (
                          <button
                            onClick={() => handlePromoteAdminToSuper(adm.email, adm.name)}
                            disabled={isActionLoading}
                            title="Elevate this admin to Super Admin (grants full system access)"
                            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all min-h-[32px] bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/25 hover:border-fuchsia-500/50 flex items-center gap-1"
                          >
                            <Crown className="w-3 h-3" />
                            <span>To Super</span>
                          </button>
                        )}
                        {canDemoteRow && (
                          <button
                            onClick={async () => {
                              if (confirmDemoteId !== adm.id) {
                                setConfirmDemoteId(adm.id);
                                setTimeout(() => setConfirmDemoteId(null), 4000);
                                return;
                              }
                              setIsActionLoading(true);
                              try {
                                const res = await apiFetch('/api/users/demote', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ email: adm.email })
                                });
                                if (res.ok) {
                                  showSuccess(`Demoted ${adm.name}.`);
                                  refreshWorkspaceData();
                                  fetchStudents();
                                } else {
                                  const err = await res.json();
                                  showError(err.error || "Demotion failed.");
                                }
                              } catch (e) {
                                showError("Demotion network error.");
                              } finally {
                                setIsActionLoading(false);
                                setConfirmDemoteId(null);
                              }
                            }}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all min-h-[32px] ${
                              confirmDemoteId === adm.id
                                ? 'bg-rose-500 text-white border-rose-400 animate-pulse font-black'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                            }`}
                          >
                            {confirmDemoteId === adm.id ? 'Confirm' : 'Demote'}
                          </button>
                        )}
                        {!canDemoteRow && isRowMainOwner && (
                          <span
                            title="The platform owner cannot be demoted"
                            className="text-[9px] font-mono text-slate-500 italic px-1.5 py-0.5"
                          >
                            Protected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Students Directory */}
          {(userRoleFilter === 'all' || userRoleFilter === 'student') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider truncate">
                  Registered Student Accounts ({filteredStudents.length})
                </h3>
                <span className="text-[11px] font-mono text-sky-400/80 shrink-0 hidden sm:inline">Active Scholars</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between gap-2.5 shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {student.profilePic ? (
                        <img src={student.profilePic} alt={student.name} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-sky-600/30 border border-sky-500/20 flex items-center justify-center text-sky-300 font-bold text-[10px] sm:text-xs shrink-0 font-mono">
                          {student.name ? student.name.substring(0, 2).toUpperCase() : 'ST'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <strong className="text-[11px] sm:text-xs font-bold text-white block truncate group-hover:text-sky-300 transition-colors">{student.name}</strong>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate font-mono">{student.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: COMMISSIONS & ESCROW ORDERS MANAGEMENT
          ========================================================================= */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-3 flex-wrap shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-mono text-slate-300 uppercase font-bold tracking-wider truncate">
                Drawing Sheet Commissions Ledger ({filteredCommissions.length})
              </h3>
            </div>

            <select
              value={commissionStatusFilter}
              onChange={(e) => setCommissionStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none cursor-pointer focus:border-purple-500/50 w-full sm:w-auto min-h-[44px]"
            >
              <option value="all">All Statuses ({commissionsList.length})</option>
              <option value="pending">Pending</option>
              <option value="in_progress">Sketching (In Progress)</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-950/60 border border-white/5 space-y-2 shadow-xl">
              <Palette className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No commission orders resolved for this view.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCommissions.map(comm => (
                <div
                  key={comm.id}
                  className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all duration-300 space-y-3.5 shadow-xl backdrop-blur-md relative overflow-hidden group"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white truncate">{comm.subject}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          comm.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          comm.status === 'delivered' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          comm.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {comm.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 break-words">
                        Student: <strong className="text-slate-200">{comm.studentName}</strong> | Artist: <strong className="text-slate-200">{comm.artistName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right font-mono">
                        <span className="text-sm font-black text-emerald-400">৳{comm.totalPrice}</span>
                        <span className="block text-[10px] text-slate-500">{comm.numPages} Diagram Pages</span>
                      </div>

                      <button
                        onClick={() => handleToggleCommissionPayment(comm.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all shadow-sm min-h-[36px] ${
                          comm.paymentStatus === 'paid'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                      >
                        {comm.paymentStatus === 'paid' ? '✓ Paid' : 'Mark Paid'}
                      </button>

                      <button
                        onClick={() => {
                          setCommissionModalBooking(comm);
                          setCommissionPctInput(comm.commissionPercent || 10);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all shadow-sm min-h-[36px] bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-fuchsia-500/25"
                      >
                        {comm.commissionPercent ? `${comm.commissionPercent}% Comm` : 'Set Commission'}
                      </button>
                    </div>
                  </div>

                  {/* Commission breakdown (if set) */}
                  {comm.commissionPercent ? (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-fuchsia-500/10">
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-mono uppercase">Total</div>
                        <div className="text-sm font-black text-emerald-400">৳{comm.totalPrice}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-mono uppercase">Commission ({comm.commissionPercent}%)</div>
                        <div className="text-sm font-black text-fuchsia-400">৳{comm.commissionAmount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-slate-500 font-mono uppercase">Artist Earns</div>
                        <div className="text-sm font-black text-cyan-400">৳{comm.artistEarnings}</div>
                      </div>
                    </div>
                  ) : null}

                  {comm.specialInstructions && (
                    <div className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 italic border border-white/5 leading-relaxed break-words">
                      &ldquo;{comm.specialInstructions}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          COMMISSION IMPOSER MODAL
          ========================================================================= */}
      {commissionModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm max-w-[92vw] bg-slate-900 border border-fuchsia-500/20 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 gap-2">
              <h3 className="text-xs font-extrabold text-white truncate flex items-center gap-2">
                <span className="text-fuchsia-400">Commission Imposer</span>
              </h3>
              <button onClick={() => setCommissionModalBooking(null)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Student:</span><span className="text-slate-200 font-bold">{commissionModalBooking.studentName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Artist:</span><span className="text-slate-200 font-bold">{commissionModalBooking.artistName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Price:</span><span className="text-emerald-400 font-black">৳{commissionModalBooking.totalPrice}</span></div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block mb-2">
                  Commission Percentage ({commissionPctInput}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={commissionPctInput}
                  onChange={(e) => setCommissionPctInput(Number(e.target.value))}
                  className="w-full accent-fuchsia-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                  <span>30%</span>
                  <span>40%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Live calculation */}
              <div className="p-3 bg-fuchsia-500/5 rounded-xl border border-fuchsia-500/15 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Student pays:</span>
                  <span className="text-emerald-400 font-bold">৳{commissionModalBooking.totalPrice}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Admin commission ({commissionPctInput}%):</span>
                  <span className="text-fuchsia-400 font-bold">৳{Math.round((commissionModalBooking.totalPrice * commissionPctInput) / 100)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-1.5">
                  <span className="text-slate-300 font-bold">Artist earns:</span>
                  <span className="text-cyan-400 font-black">৳{commissionModalBooking.totalPrice - Math.round((commissionModalBooking.totalPrice * commissionPctInput) / 100)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCommissionModalBooking(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleSetCommission(commissionModalBooking.id, commissionPctInput)}
                  className="px-4 py-1.5 bg-fuchsia-500 text-white text-xs font-black rounded-xl cursor-pointer min-h-[40px] hover:bg-fuchsia-400 transition-colors disabled:opacity-50"
                >
                  {isActionLoading ? 'Setting…' : 'Impose Commission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: NOTICE BROADCASTS & ANNOUNCEMENTS
          ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Issue Announcement Form */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-white truncate">Publish Portal Announcement</h3>
            </div>
            <p className="text-xs text-slate-400 break-words">Broadcast submission deadlines or practical lab guidelines live to all active student portals.</p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Header Title</label>
                <input
                  type="text"
                  placeholder="e.g., Physics Vernier Practical Deadline"
                  required
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Notice Description</label>
                <textarea
                  placeholder="Detailed guidelines or instructions..."
                  required
                  rows={4}
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 resize-none min-h-[100px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Deadline (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 2026-12-31 or Before exam week"
                  value={announceDeadline}
                  onChange={(e) => setAnnounceDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              {/* File attachment */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Attach Downloadable File (optional)</label>
                <input
                  ref={announceFileRef}
                  type="file"
                  onChange={handleAnnounceFilePick}
                  className="hidden"
                />
                {announceFile ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-200 font-bold truncate">{announceFile.name}</div>
                      <div className="text-[9px] text-slate-500">{(announceFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnounceFile(null)}
                      className="text-rose-400 hover:text-rose-300 text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => announceFileRef.current?.click()}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-dashed border-white/15 text-xs text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload file (max 50 MB)
                  </button>
                )}
              </div>

              {/* Target user selection with search */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Share With</label>

                {/* Broadcast option */}
                <button
                  type="button"
                  onClick={() => { setAnnounceTargetUser(''); setAnnounceTargetName(''); setAnnounceSearch(''); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-2 ${
                    !announceTargetUser ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📢 Broadcast to ALL users
                </button>

                {/* Search input */}
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={announceSearch}
                    onChange={(e) => setAnnounceSearch(e.target.value)}
                    placeholder="Search by name, email, or phone…"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[40px]"
                  />
                </div>

                {/* Search results */}
                {announceSearch.trim() && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/60">
                    {studentsList
                      .filter((s) => {
                        const q = announceSearch.toLowerCase();
                        return (
                          s.name?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q) ||
                          (s as any).phoneNumber?.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 10)
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setAnnounceTargetUser(s.id);
                            setAnnounceTargetName(s.name);
                            setAnnounceSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${
                            announceTargetUser === s.id ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
                          }`}
                        >
                          <span className="font-bold truncate">{s.name}</span>
                          <span className="text-slate-500 truncate">{s.email}</span>
                        </button>
                      ))}
                    {studentsList.filter((s) => {
                      const q = announceSearch.toLowerCase();
                      return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-slate-500">No users found.</div>
                    )}
                  </div>
                )}

                {/* Selected user */}
                {announceTargetUser && !announceSearch && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl mt-1">
                    <span className="text-xs text-fuchsia-300 font-bold">👤 {announceTargetName}</span>
                    <button
                      type="button"
                      onClick={() => { setAnnounceTargetUser(''); setAnnounceTargetName(''); }}
                      className="ml-auto text-rose-400 hover:text-rose-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className="text-[9px] text-slate-500">
                  {announceTargetUser ? 'Only the selected user will see this + can download the file.' : 'Everyone will see this announcement.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isActionLoading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{announceTargetUser ? 'Send to Selected User' : 'Broadcast Notice Live'}</span>
              </button>
            </form>
          </div>

          {/* Active Broadcasts History */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4 lg:col-span-2 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

            <h3 className="text-sm font-extrabold text-white flex items-center justify-between gap-2">
              <span className="truncate">Published Announcements ({announcements.length})</span>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">Live Feeds</span>
            </h3>

            {announcements.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No published announcements currently stored.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-3 sm:gap-4 shadow-md">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-xs font-bold text-white truncate">{ann.title}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase border shrink-0 ${
                          ann.urgency === 'urgent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          ann.urgency === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {ann.urgency || 'info'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed break-words">{ann.content}</p>

                      {/* File attachment download */}
                      {ann.fileUrl && (
                        <button
                          onClick={() => {
                            const url = ann.fileUrl!;
                            const name = ann.fileName || 'download';
                            // For data URLs, create a blob and download
                            if (url.startsWith('data:')) {
                              const [meta, base64] = url.split(',');
                              const mime = meta.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
                              const binary = atob(base64);
                              const bytes = new Uint8Array(binary.length);
                              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                              const blob = new Blob([bytes], { type: mime });
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = blobUrl;
                              a.download = name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(blobUrl);
                            } else {
                              // External URL — open in new tab
                              window.open(url, '_blank');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Download {ann.fileName || 'file'}
                        </button>
                      )}

                      {/* Targeted indicator */}
                      {ann.targetUserId && (
                        <span className="inline-block ml-2 mt-2 px-2 py-0.5 rounded text-[9px] font-mono bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20">
                          👤 Private share
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono block">
                        Published: {ann.date ? new Date(ann.date).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE / EDIT SUBJECT
          ========================================================================= */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-w-[92vw] bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
              <h3 className="text-sm font-extrabold text-white truncate">
                {editingSubject ? 'Edit Subject Category' : 'Create New Subject'}
              </h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. Physics, Chemistry, ICT"
                  required
                  value={subjectTitleInput}
                  onChange={(e) => setSubjectTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Description</label>
                <textarea
                  placeholder="Subject scope, practical lab curriculum details..."
                  rows={3}
                  value={subjectDescInput}
                  onChange={(e) => setSubjectDescInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 resize-none min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20 min-h-[44px]"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CREATE / EDIT PRACTICAL FOLDER
          ========================================================================= */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-w-[92vw] bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
              <h3 className="text-sm font-extrabold text-white truncate">
                {editingFolder ? 'Edit Practical Folder' : 'Create Practical Folder'}
              </h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              {!editingFolder && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Parent Subject</label>
                  <select
                    value={folderSubjectIdInput}
                    onChange={(e) => setFolderSubjectIdInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 rounded-xl outline-none cursor-pointer min-h-[44px]"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Folder Title</label>
                <input
                  type="text"
                  placeholder="e.g. Practical 1: Vernier Caliper Measurements"
                  required
                  value={folderTitleInput}
                  onChange={(e) => setFolderTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Description & Objectives</label>
                <textarea
                  placeholder="Determination of solid cylinder volume, least count calculations..."
                  rows={3}
                  value={folderDescInput}
                  onChange={(e) => setFolderDescInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 resize-none min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20 min-h-[44px]"
                >
                  Save Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: UPLOAD SCAN DIAGRAM TO FOLDER
          ========================================================================= */}
      {uploadScanFolder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-w-[92vw] bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">Attach Diagram Scan</h3>
                <p className="text-[10px] text-slate-400 font-mono truncate">Folder: {uploadScanFolder.title}</p>
              </div>
              <button onClick={() => setUploadScanFolder(null)} className="text-slate-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadScanSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Diagram Page Title</label>
                <input
                  type="text"
                  placeholder="e.g. Apparatus Diagram & Vernier Scale"
                  value={scanTitleInput}
                  onChange={(e) => setScanTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              {/* Upload file */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase">Upload Image File (JPEG, PNG, WEBP)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setScanFileInput(e.target.files[0]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 text-xs text-slate-300 rounded-xl outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 cursor-pointer min-h-[44px]"
                />
              </div>

              <div className="text-center text-[10px] text-slate-500 font-mono">OR PROVIDE IMAGE URL</div>

              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="https://..."
                  value={scanUrlInput}
                  onChange={(e) => setScanUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 min-h-[44px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadScanFolder(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-cyan-500/20 min-h-[44px]"
                >
                  Upload Scan Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: ACTIVITY LOG (REAL-TIME FEED)
          ========================================================================= */}
      {activeTab === 'activity' && (
        <ActivityLogTab apiFetch={apiFetch} />
      )}

      {/* =========================================================================
          TAB 8: BUG MONITOR (CLIENT-SIDE ERROR FEED)
          ========================================================================= */}
      {activeTab === 'bugs' && (
        <BugMonitorTab apiFetch={apiFetch} />
      )}

      {/* =========================================================================
          MODAL 5: LIGHTBOX SCAN PREVIEW
          ========================================================================= */}
      {previewAssetUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4" onClick={() => setPreviewAssetUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewAssetUrl}
              alt="Scan Full Preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setPreviewAssetUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/90 text-white rounded-full hover:bg-rose-500 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: INLINE SYSTEM CREDENTIALS VIEW (super_admin fallback)
          Only shown when onNavigateToCreds prop is NOT provided — otherwise the
          "View System Credentials" header button calls onNavigateToCreds() to
          switch the parent route to /creds.
          ========================================================================= */}
      {credsDialogOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-5xl max-w-[98vw] sm:max-w-[96vw] bg-slate-950 border border-fuchsia-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 gap-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 min-w-0">
                <Key className="w-4 h-4 text-fuchsia-400 shrink-0" />
                <span className="truncate">System Credentials</span>
                <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 hidden sm:inline">
                  Super Admin Only
                </span>
              </h3>
              <button
                onClick={() => setCredsDialogOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 sm:p-3">
              <CredentialsView />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
