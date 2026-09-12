'use client';

/**
 * ArtistDashboard — a comprehensive control panel for hire artists.
 *
 * Three core surfaces wired to the new marketplace APIs:
 *   1. Incoming Orders (filter, status-lifecycle actions, inline artist notes)
 *   2. Portfolio Management (upload, delete, lightbox)
 *   3. Earnings & Analytics (totals, breakdowns by service + subject, rating)
 *
 * Plus a prominent availability toggle (PUT /api/profile) and a 4-tile stats
 * strip derived from the live bookings list combined with the cached auth
 * user record (rating, completedOrders).
 *
 * All API calls go through `useAuth().apiFetch` so the bearer token is always
 * attached. Toasts match the AdminCmsPage / ArtistsPage pattern — fixed top
 * banner, auto-dismiss after 4.5s, dismissible. Mobile-first responsive.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  Image as ImageIcon,
  DollarSign,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Trash2,
  Pen,
  PenLine,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Receipt,
  Eye,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
  Mail,
  Wallet,
  BarChart3,
  Award,
  CheckCircle,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { ConfirmModal } from '@/components/features/ConfirmModal';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ArtistDashboardProps {
  activeTheme?: string;
}

type ServiceType = 'drawing_only' | 'drawing_writing';
type BookingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

interface Client {
  id: string;
  name: string;
  email: string;
  profilePic?: string | null;
}

interface Booking {
  id: string;
  clientId: string;
  artistId: string;
  serviceType: ServiceType;
  subject: string;
  description: string;
  price: number;
  commissionPercent?: number;
  commissionAmount?: number;
  artistEarnings?: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  referenceImages: string[];
  clientNotes?: string | null;
  artistNotes?: string | null;
  createdAt: string;
  client: Client;
}

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description?: string;
  tags: string[];
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const TOAST_DURATION_MS = 4500;
const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
  Chemistry: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  Biology: 'text-lime-300 border-lime-500/30 bg-lime-500/10',
  'Higher Math': 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  ICT: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
};

const STATUS_META: Record<
  BookingStatus,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Pending',
    cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    cls: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    icon: XCircle,
  },
};

const PAYMENT_META: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid: {
    label: 'Unpaid',
    cls: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
  },
  paid: {
    label: 'Paid',
    cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  },
  refunded: {
    label: 'Refunded',
    cls: 'bg-slate-500/10 border-slate-500/25 text-slate-300',
  },
};

const SERVICE_META: Record<ServiceType, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  drawing_only: {
    label: 'Drawing Only',
    cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    icon: Pen,
  },
  drawing_writing: {
    label: 'Drawing + Writing',
    cls: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
    icon: PenLine,
  },
};

const fmtBDT = (n: number): string =>
  `৳${(Math.round(Number(n) || 0)).toLocaleString('en-US')}`;

const fmtDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const relTime = (iso: string): string => {
  try {
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return '—';
    const diff = Date.now() - d;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mon = Math.round(day / 30);
    if (mon < 12) return `${mon}mo ago`;
    return `${Math.round(mon / 12)}y ago`;
  } catch {
    return '—';
  }
};

const truncate = (text: string, max: number): string => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

const avatarFallbackUrl = (name: string): string => {
  const seed = encodeURIComponent(name || 'User');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e293b,0f172a,f59e0b,312e81&textColor=ffffff`;
};

const avatarInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: 'amber' | 'emerald' | 'cyan' | 'indigo';
  loading?: boolean;
}

const STAT_TONE: Record<StatTileProps['tone'], string> = {
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  cyan: 'text-cyan-300',
  indigo: 'text-indigo-300',
};

const StatTile: React.FC<StatTileProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  loading,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="relative overflow-hidden rounded-2xl border border-white/6 bg-slate-900/40 p-4 sm:p-5 backdrop-blur-sm"
  >
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
        {label}
      </span>
      <Icon className={`w-4 h-4 ${STAT_TONE[tone]}`} />
    </div>
    <div className={`mt-2 text-2xl sm:text-3xl font-black ${STAT_TONE[tone]}`}>
      {loading ? <Skeleton className="h-7 w-16 bg-white/5" /> : value}
    </div>
    {sub && (
      <div className="mt-0.5 text-[11px] text-slate-500 font-medium">{sub}</div>
    )}
  </motion.div>
);

const SectionTitle: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, sub, action }) => (
  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 rounded-xl border border-white/8 bg-white/2 text-slate-200 shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
          {title}
        </h2>
        {sub && (
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
            {sub}
          </p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
}> = ({ icon: Icon, title, message }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-dashed border-white/8 bg-slate-900/30 px-6 py-12 sm:py-16 flex flex-col items-center text-center"
  >
    <div className="p-3 rounded-2xl border border-white/8 bg-white/8 text-slate-500">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="mt-4 text-sm font-bold text-slate-300">{title}</h3>
    <p className="mt-1 text-xs text-slate-500 max-w-md leading-relaxed">
      {message}
    </p>
  </motion.div>
);

const OrdersSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-white/8 bg-slate-900/40 p-4 sm:p-5 flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const PortfolioSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/40 overflow-hidden"
      >
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Reference image thumbnail                                                  */
/* -------------------------------------------------------------------------- */

const RefImageThumb: React.FC<{ url: string }> = ({ url }) => {
  const [broken, setBroken] = useState(false);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-white/[0.08] bg-slate-800 hover:ring-2 hover:ring-amber-400/50 transition relative shrink-0"
      title="Open reference in new tab"
    >
      {broken ? (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          <ImageIcon className="w-5 h-5" />
        </div>
      ) : (
        <img
          src={url}
          alt="reference"
          loading="lazy"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      )}
    </a>
  );
};

/* -------------------------------------------------------------------------- */
/*  Order Row Card                                                             */
/* -------------------------------------------------------------------------- */

interface OrderCardProps {
  booking: Booking;
  onAdvance: (id: string, status: BookingStatus) => void;
  onCancel: (booking: Booking) => void;
  onReopen: (id: string) => void;
  onToggleExpand: (id: string) => void;
  expanded: boolean;
  notesDraft: string;
  onNotesChange: (id: string, value: string) => void;
  onSaveNotes: (id: string) => void;
  savingNotesId: string | null;
  actioningId: string | null;
}

const OrderCard: React.FC<OrderCardProps> = ({
  booking,
  onAdvance,
  onCancel,
  onReopen,
  onToggleExpand,
  expanded,
  notesDraft,
  onNotesChange,
  onSaveNotes,
  savingNotesId,
  actioningId,
}) => {
  const svc = SERVICE_META[booking.serviceType] || SERVICE_META.drawing_only;
  const SvcIcon = svc.icon;
  const statusMeta = STATUS_META[booking.status];
  const StatusIcon = statusMeta.icon;
  const pay = PAYMENT_META[booking.paymentStatus];
  const isActioning = actioningId === booking.id;
  const isSavingNotes = savingNotesId === booking.id;
  const createdMs = new Date(booking.createdAt).getTime();
  const canReopen =
    booking.status === 'cancelled' &&
    Number.isFinite(createdMs) &&
    Date.now() - createdMs < REOPEN_WINDOW_MS;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm overflow-hidden"
    >
      {/* ---- top row: client + badges ---- */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-1 ring-white/10">
            <AvatarImage
              src={booking.client?.profilePic || avatarFallbackUrl(booking.client?.name || '')}
              alt={booking.client?.name || 'Client'}
            />
            <AvatarFallback className="bg-slate-800 text-amber-300 text-xs font-bold">
              {avatarInitials(booking.client?.name || '?')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white truncate">
                {booking.client?.name || 'Unknown client'}
              </span>
              <a
                href={`mailto:${booking.client?.email}`}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition"
              >
                <Mail className="w-3 h-3" />
                <span className="truncate max-w-[160px] sm:max-w-[200px]">
                  {booking.client?.email}
                </span>
              </a>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`${svc.cls} border gap-1`}
              >
                <SvcIcon className="w-3 h-3" />
                {svc.label}
              </Badge>
              {booking.subject && (
                <Badge
                  variant="outline"
                  className={
                    SUBJECT_COLORS[booking.subject] ||
                    'text-slate-300 border-white/15 bg-white/[0.03]'
                  }
                >
                  {booking.subject}
                </Badge>
              )}
              <Badge variant="outline" className={`${statusMeta.cls} border gap-1`}>
                <StatusIcon className={`w-3 h-3 ${booking.status === 'in_progress' ? 'animate-spin' : ''}`} />
                {statusMeta.label}
              </Badge>
              <Badge variant="outline" className={`${pay.cls} border`}>
                {pay.label}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{relTime(booking.createdAt)}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono">{fmtDate(booking.createdAt)}</span>
            </div>
          </div>
        </div>
        {/* Price + commission breakdown (top-right on desktop) */}
        <div className="flex sm:flex-col sm:items-end sm:justify-start shrink-0 gap-2 sm:gap-0.5">
          <div className="text-xl sm:text-2xl font-black text-amber-300 leading-none">
            {fmtBDT(booking.artistEarnings || booking.price)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            {booking.commissionPercent ? `Your earnings (after ${booking.commissionPercent}% commission)` : 'Hire'}
          </div>
          {booking.commissionPercent ? (
            <div className="text-[9px] text-fuchsia-400 font-mono">
              Total: ৳{booking.price} − Comm: ৳{booking.commissionAmount}
            </div>
          ) : null}
        </div>
      </div>

      {/* ---- description + subject detail ---- */}
      <div className="px-4 sm:px-5 pb-3">
        <div className="text-[11px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-1">
          Subject Brief
        </div>
        <p
          className={`text-xs sm:text-sm text-slate-300 leading-relaxed ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {booking.description || 'No description provided.'}
        </p>
        {booking.description && booking.description.length > 140 && (
          <button
            type="button"
            onClick={() => onToggleExpand(booking.id)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 transition min-h-[28px] cursor-pointer"
          >
            {expanded ? 'Show less' : 'Show more'}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* ---- reference images ---- */}
      {booking.referenceImages && booking.referenceImages.length > 0 && (
        <div className="px-4 sm:px-5 pb-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-2">
            Reference Images ({booking.referenceImages.length})
          </div>
          <div className="flex gap-2 flex-wrap">
            {booking.referenceImages.map((url, idx) => (
              <RefImageThumb key={`${booking.id}-${idx}`} url={url} />
            ))}
          </div>
        </div>
      )}

      {/* ---- client notes (if any) ---- */}
      {booking.clientNotes && booking.clientNotes.trim() && (
        <div className="px-4 sm:px-5 pb-3">
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-widest text-amber-400/70 font-mono font-bold mb-1">
              Client Notes
            </div>
            <p className="text-xs text-amber-100/80 leading-relaxed whitespace-pre-wrap">
              {booking.clientNotes}
            </p>
          </div>
        </div>
      )}

      {/* ---- artist notes editor ---- */}
      <div className="px-4 sm:px-5 pb-3">
        <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
          <Label
            htmlFor={`notes-${booking.id}`}
            className="text-[10px] uppercase tracking-widest text-slate-400 font-mono font-bold mb-1.5 flex items-center gap-1.5"
          >
            <Pen className="w-3 h-3" />
            Artist Notes
            <span className="text-slate-600 normal-case font-medium tracking-normal">
              (private — only you see this)
            </span>
          </Label>
          <Textarea
            id={`notes-${booking.id}`}
            value={notesDraft}
            onChange={(e) => onNotesChange(booking.id, e.target.value)}
            placeholder="Add private notes about this hire — client preferences, progress, TODOs…"
            rows={expanded ? 4 : 2}
            className="bg-slate-900/60 border-white/[0.06] text-slate-200 text-xs placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40 resize-y min-h-[60px]"
          />
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onSaveNotes(booking.id)}
              disabled={
                isSavingNotes ||
                notesDraft.trim() === (booking.artistNotes || '').trim()
              }
              className="min-h-[40px] h-9 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              {isSavingNotes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Notes
            </Button>
          </div>
        </div>
      </div>

      {/* ---- action row ---- */}
      <div className="px-4 sm:px-5 py-3 border-t border-white/[0.04] bg-white/[0.01] flex flex-wrap items-center gap-2">
        {booking.status === 'pending' && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => onAdvance(booking.id, 'in_progress')}
              disabled={isActioning}
              className="min-h-[44px] h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              {isActioning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Accept &amp; Start
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCancel(booking)}
              disabled={isActioning}
              className="min-h-[44px] h-10 px-4 border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}

        {booking.status === 'in_progress' && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => onAdvance(booking.id, 'completed')}
              disabled={isActioning}
              className="min-h-[44px] h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              {isActioning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark Complete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCancel(booking)}
              disabled={isActioning}
              className="min-h-[44px] h-10 px-4 border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}

        {booking.status === 'completed' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onToggleExpand(booking.id)}
            className="min-h-[44px] h-10 px-4 border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white text-xs font-bold gap-1.5"
          >
            <Eye className="w-4 h-4" />
            {expanded ? 'Hide Details' : 'View Details'}
            <ChevronRight
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </Button>
        )}

        {booking.status === 'cancelled' && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onToggleExpand(booking.id)}
              className="min-h-[44px] h-10 px-4 border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white text-xs font-bold gap-1.5"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Button>
            {canReopen && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onReopen(booking.id)}
                disabled={isActioning}
                className="min-h-[44px] h-10 px-4 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-bold gap-1.5 disabled:opacity-50"
                title="Cancelled within the last 24 hours"
              >
                {isActioning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Re-open
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Portfolio Card                                                             */
/* -------------------------------------------------------------------------- */

interface PortfolioCardProps {
  item: PortfolioItem;
  onDelete: (item: PortfolioItem) => void;
  onZoom: (item: PortfolioItem) => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onDelete, onZoom }) => {
  const [broken, setBroken] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-white/[0.06] bg-slate-900/40 overflow-hidden flex flex-col"
    >
      <button
        type="button"
        onClick={() => onZoom(item)}
        className="block relative aspect-[4/3] w-full bg-slate-950 overflow-hidden cursor-pointer"
        title={item.title}
      >
        {broken ? (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <ImageIcon className="w-8 h-8" />
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            onError={() => setBroken(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-slate-950/70 border border-amber-500/20 rounded-full px-2 py-1 backdrop-blur">
            <Eye className="w-3 h-3" /> Enlarge
          </span>
        </div>
      </button>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {item.tags.slice(0, 4).map((t, i) => (
              <span
                key={`${item.id}-tag-${i}`}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-white/10 bg-white/[0.03] text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
          <span className="text-[10px] text-slate-500 font-mono">
            {fmtDate(item.createdAt)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDelete(item)}
            className="min-h-[36px] h-8 px-2 border-rose-500/25 bg-rose-500/5 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 text-[11px] font-bold gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Upload Modal                                                               */
/* -------------------------------------------------------------------------- */

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    imageUrl: string;
    title: string;
    description: string;
    tags: string[];
  }) => Promise<void>;
  submitting: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [previewBroken, setPreviewBroken] = useState(false);
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  // Local file picker — converts to base64 data URL and fills the imageUrl field
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (portfolioFileRef.current) portfolioFileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      console.warn('Invalid file type');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      console.warn('File too large');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result || ''));
      setPreviewBroken(false);
      // Auto-fill title from filename if empty
      if (!title.trim()) {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(name.slice(0, 60));
      }
    };
    reader.onerror = () => console.warn('Read failed');
    reader.readAsDataURL(file);
  };

  // The parent remounts this component via `key` whenever the modal reopens,
  // so local form state is naturally fresh for every upload session — no
  // effect-based reset needed (which would otherwise trip the
  // `react-hooks/set-state-in-effect` rule).

  const tagsPreview = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const canSubmit =
    imageUrl.trim().length > 5 && title.trim().length >= 2 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      imageUrl: imageUrl.trim(),
      title: title.trim(),
      description: description.trim(),
      tags: tagsPreview,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-slate-950 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center gap-3 sticky top-0 bg-slate-950/95 backdrop-blur-md z-10">
            <div className="p-2.5 rounded-xl border border-amber-500/15 bg-amber-500/10 text-amber-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-extrabold text-white leading-tight">
                Upload New Work
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add a portfolio piece to attract clients.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {/* Image source — file upload OR URL */}
            <div className="space-y-2">
              <Label
                htmlFor="portfolio-url"
                className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-bold"
              >
                Image <span className="text-rose-400">*</span>
              </Label>

              {/* File picker button */}
              <input
                ref={portfolioFileRef}
                type="file"
                accept="image/*"
                onChange={handleFilePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => portfolioFileRef.current?.click()}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Upload from device
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[9px] uppercase font-mono text-slate-500 tracking-widest">or paste URL</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <Input
                id="portfolio-url"
                value={imageUrl.startsWith('data:') ? '(uploaded image)' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewBroken(false);
                }}
                placeholder="https://…/my-drawing.jpg"
                disabled={imageUrl.startsWith('data:')}
                className="bg-slate-900/60 border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40 min-h-[44px] disabled:opacity-60"
              />
              {imageUrl.startsWith('data:') && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[10px] text-rose-300 hover:text-rose-200 underline cursor-pointer"
                >
                  Remove uploaded image
                </button>
              )}
              {imageUrl.trim().length > 5 && (
                <div className="rounded-xl border border-white/[0.06] bg-slate-950/60 overflow-hidden">
                  {previewBroken ? (
                    <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-600 gap-1">
                      <ImageIcon className="w-7 h-7" />
                      <span className="text-[11px] font-medium">
                        Could not load preview
                      </span>
                    </div>
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      onError={() => setPreviewBroken(true)}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label
                htmlFor="portfolio-title"
                className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-bold"
              >
                Title <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="portfolio-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Physics — Ohm's Law Diagram"
                required
                maxLength={80}
                className="bg-slate-900/60 border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40 min-h-[44px]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="portfolio-desc"
                className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-bold"
              >
                Description <span className="text-slate-600 font-medium normal-case tracking-normal">(optional)</span>
              </Label>
              <Textarea
                id="portfolio-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's in the drawing? Which practical / topic? What tools were used?"
                rows={3}
                maxLength={500}
                className="bg-slate-900/60 border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40 resize-y min-h-[80px]"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label
                htmlFor="portfolio-tags"
                className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-bold"
              >
                Tags <span className="text-slate-600 font-medium normal-case tracking-normal">(comma-separated)</span>
              </Label>
              <Input
                id="portfolio-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Physics, Diagram, Ink"
                className="bg-slate-900/60 border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40 min-h-[44px]"
              />
              {tagsPreview.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {tagsPreview.map((t, i) => (
                    <span
                      key={`tag-prev-${i}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-amber-500/20 bg-amber-500/10 text-amber-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <Button
                type="button"
                onClick={onClose}
                className="min-h-[44px] h-11 px-4 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-bold border border-white/[0.08]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="min-h-[44px] h-11 px-5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Work
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  Image Lightbox Dialog                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Self-contained broken-image handler. Keyed by URL in the parent so each
 * new image starts with `broken=false` without an effect-based reset
 * (which would trip `react-hooks/set-state-in-effect`).
 */
const LightboxImage: React.FC<{ item: PortfolioItem }> = ({ item }) => {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-600 gap-2 py-16">
        <ImageIcon className="w-10 h-10" />
        <span className="text-xs">Image could not be loaded.</span>
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-amber-300 hover:text-amber-200 underline break-all px-4"
        >
          {item.imageUrl}
        </a>
      </div>
    );
  }
  return (
    <img
      src={item.imageUrl}
      alt={item.title}
      onError={() => setBroken(true)}
      className="max-h-[75vh] w-auto object-contain"
    />
  );
};

const ImageLightbox: React.FC<{
  item: PortfolioItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-slate-950 border-white/10 max-w-3xl p-0 overflow-hidden"
      >
        {item && (
          <div className="flex flex-col">
            <div className="relative bg-black/60 flex items-center justify-center min-h-[40vh] max-h-[75vh]">
              <LightboxImage key={item.id} item={item} />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 p-2 rounded-full bg-slate-950/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <DialogTitle className="text-base font-extrabold text-white">
                {item.title}
              </DialogTitle>
              {item.description && (
                <DialogDescription className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </DialogDescription>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-3">
                  {item.tags.map((t, i) => (
                    <span
                      key={`lb-tag-${i}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-white/10 bg-white/[0.03] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-slate-500 font-mono">
                Uploaded {fmtDate(item.createdAt)}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------------------------------------------------- */
/*  Earnings breakdown helpers                                                 */
/* -------------------------------------------------------------------------- */

interface EarningsBySubject {
  subject: string;
  total: number;
  count: number;
}

const SubjectBar: React.FC<{
  subject: string;
  total: number;
  count: number;
  maxTotal: number;
}> = ({ subject, total, count, maxTotal }) => {
  const pct = maxTotal > 0 ? Math.min(100, Math.round((total / maxTotal) * 100)) : 0;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              SUBJECT_COLORS[subject]?.split(' ')[0] || 'bg-slate-400'
            }`}
          />
          {subject}
        </span>
        <span className="text-xs font-mono text-amber-300 font-bold">
          {fmtBDT(total)}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            subject === 'Physics'
              ? 'bg-cyan-400'
              : subject === 'Chemistry'
                ? 'bg-emerald-400'
                : subject === 'Biology'
                  ? 'bg-lime-400'
                  : subject === 'Higher Math'
                    ? 'bg-amber-400'
                    : subject === 'ICT'
                      ? 'bg-indigo-400'
                      : 'bg-slate-400'
          }`}
        />
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        {count} hire{count === 1 ? '' : 's'} • {pct}% of top subject
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main ArtistDashboard component                                              */
/* -------------------------------------------------------------------------- */

type OrderFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ArtistDashboard: React.FC<ArtistDashboardProps> = ({
  activeTheme,
}) => {
  const { user, apiFetch, setUser, updateSession } = useAuth();
  void activeTheme;

  /* ---- state ---- */
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  const [uploadSubmitting, setUploadSubmitting] = useState<boolean>(false);
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);
  const [availabilityToggling, setAvailabilityToggling] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notesInitRef = useRef<Record<string, boolean>>({});

  /* ---- toasts ---- */
  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => setSuccessMsg(null), TOAST_DURATION_MS);
  }, []);
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    window.setTimeout(() => setErrorMsg(null), TOAST_DURATION_MS);
  }, []);

  /* ---- fetch bookings + portfolio on mount ---- */
  const refreshBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await apiFetch('/api/bookings?scope=artist');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load incoming orders.');
      }
      const list: Booking[] = Array.isArray(data) ? data : [];
      setBookings(list);
      // Seed notes drafts for any booking that doesn't already have one
      setNotesDrafts((prev) => {
        const next = { ...prev };
        for (const b of list) {
          if (!(b.id in next)) {
            next[b.id] = b.artistNotes || '';
          }
        }
        return next;
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not load incoming orders.';
      showError(msg);
    } finally {
      setBookingsLoading(false);
    }
  }, [apiFetch, showError]);

  const refreshPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    try {
      const res = await apiFetch('/api/portfolio');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load portfolio.');
      }
      const list: PortfolioItem[] = Array.isArray(data) ? data : [];
      setPortfolio(list);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not load portfolio.';
      showError(msg);
    } finally {
      setPortfolioLoading(false);
    }
  }, [apiFetch, showError]);

  useEffect(() => {
    void refreshBookings();
    void refreshPortfolio();
  }, [refreshBookings, refreshPortfolio]);

  /* ---- keep notes drafts in sync when bookings load/change ---- */
  useEffect(() => {
    setNotesDrafts((prev) => {
      const next = { ...prev };
      for (const b of bookings) {
        // If we have never initialised a draft for this booking, seed from server
        if (!notesInitRef.current[b.id]) {
          next[b.id] = b.artistNotes || '';
          notesInitRef.current[b.id] = true;
        }
      }
      return next;
    });
  }, [bookings]);

  /* ---- derived: top stats ---- */
  const stats = useMemo(() => {
    const active = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'in_progress',
    ).length;
    const completedBookingsCount = bookings.filter(
      (b) => b.status === 'completed',
    ).length;
    const completedTotal =
      completedBookingsCount + (user?.completedOrders ?? 0);
    const totalEarnings = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.artistEarnings) || Number(b.price) || 0), 0);
    const pendingEarnings = bookings
      .filter((b) => b.status === 'in_progress')
      .reduce((sum, b) => sum + (Number(b.artistEarnings) || Number(b.price) || 0), 0);
    const totalCommissionPaid = bookings
      .filter((b) => b.status === 'completed' && b.commissionAmount)
      .reduce((sum, b) => sum + (Number(b.commissionAmount) || 0), 0);
    const rating = user?.rating ?? 0;
    return {
      active,
      completedBookingsCount,
      completedTotal,
      totalEarnings,
      pendingEarnings,
      rating,
    };
  }, [bookings, user]);

  /* ---- derived: filtered orders ---- */
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === orderFilter);
  }, [bookings, orderFilter]);

  const filterCounts = useMemo(() => {
    const base: Record<OrderFilter, number> = {
      all: bookings.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) {
      base[b.status] = (base[b.status] || 0) + 1;
    }
    return base;
  }, [bookings]);

  /* ---- derived: earnings breakdowns ---- */
  const earningsBreakdown = useMemo(() => {
    const completed = bookings.filter((b) => b.status === 'completed');
    const byService = {
      drawing_only: 0,
      drawing_writing: 0,
    };
    const bySubjectMap: Record<string, EarningsBySubject> = {};
    for (const b of completed) {
      byService[b.serviceType] =
        (byService[b.serviceType] || 0) + (Number(b.price) || 0);
      const key = b.subject || 'Other';
      if (!bySubjectMap[key]) {
        bySubjectMap[key] = { subject: key, total: 0, count: 0 };
      }
      bySubjectMap[key].total += Number(b.price) || 0;
      bySubjectMap[key].count += 1;
    }
    const bySubject = Object.values(bySubjectMap).sort(
      (a, b) => b.total - a.total,
    );
    const maxSubject = bySubject.length
      ? Math.max(...bySubject.map((s) => s.total))
      : 0;
    return { byService, bySubject, maxSubject, completedCount: completed.length };
  }, [bookings]);

  /* ---- action handlers ---- */
  const handleAdvance = useCallback(
    async (id: string, newStatus: BookingStatus) => {
      setActioningId(id);
      try {
        const res = await apiFetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Could not update booking to ${newStatus}.`);
        }
        // Optimistic local update
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: newStatus,
                }
              : b,
          ),
        );
        const label = STATUS_META[newStatus].label.toLowerCase();
        showSuccess(
          newStatus === 'completed'
            ? `Hire marked complete — well done!`
            : `Hire moved to ${label}.`,
        );
        // Refresh user record so completedOrders / stats stay in sync.
        // Only the completed transition changes the user.completedOrders count.
        if (newStatus === 'completed' && user) {
          setUser({
            ...user,
            completedOrders: (user.completedOrders ?? 0) + 1,
          });
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not update booking.';
        showError(msg);
      } finally {
        setActioningId(null);
      }
    },
    [apiFetch, showSuccess, showError, user, setUser],
  );

  const handleCancelBooking = useCallback(
    async (booking: Booking) => {
      setActioningId(booking.id);
      try {
        const res = await apiFetch(`/api/bookings/${booking.id}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Could not cancel booking.');
        }
        setBookings((prev) =>
          prev.map((b) =>
            b.id === booking.id ? { ...b, status: 'cancelled' } : b,
          ),
        );
        showSuccess('Booking cancelled.');
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not cancel booking.';
        showError(msg);
      } finally {
        setActioningId(null);
      }
    },
    [apiFetch, showSuccess, showError],
  );

  const handleReopen = useCallback(
    async (id: string) => {
      setActioningId(id);
      try {
        const res = await apiFetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || 'Could not re-open booking. The cancellation window may have closed.',
          );
        }
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'pending' } : b)),
        );
        showSuccess('Booking re-opened as pending.');
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not re-open booking.';
        showError(msg);
      } finally {
        setActioningId(null);
      }
    },
    [apiFetch, showSuccess, showError],
  );

  const handleNotesChange = useCallback((id: string, value: string) => {
    setNotesDrafts((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSaveNotes = useCallback(
    async (id: string) => {
      const draft = (notesDrafts[id] ?? '').trim();
      setSavingNotesId(id);
      try {
        const res = await apiFetch(`/api/bookings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistNotes: draft }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Could not save notes.');
        }
        setBookings((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, artistNotes: draft } : b,
          ),
        );
        showSuccess('Notes saved.');
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not save notes.';
        showError(msg);
      } finally {
        setSavingNotesId(null);
      }
    },
    [apiFetch, notesDrafts, showSuccess, showError],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* ---- portfolio upload + delete ---- */
  const handleUpload = useCallback(
    async (data: {
      imageUrl: string;
      title: string;
      description: string;
      tags: string[];
    }) => {
      setUploadSubmitting(true);
      try {
        const res = await apiFetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || 'Could not upload portfolio item.');
        }
        const created: PortfolioItem = {
          id: json.id,
          imageUrl: json.imageUrl,
          title: json.title,
          description: json.description || '',
          tags: Array.isArray(json.tags) ? json.tags : [],
          createdAt: json.createdAt || new Date().toISOString(),
        };
        setPortfolio((prev) => [created, ...prev]);
        setUploadOpen(false);
        showSuccess(`"${created.title}" added to your portfolio.`);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not upload portfolio item.';
        showError(msg);
      } finally {
        setUploadSubmitting(false);
      }
    },
    [apiFetch, showSuccess, showError],
  );

  const handleDeletePortfolio = useCallback(
    async (item: PortfolioItem) => {
      try {
        const res = await apiFetch(`/api/portfolio/${item.id}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Could not delete portfolio item.');
        }
        setPortfolio((prev) => prev.filter((p) => p.id !== item.id));
        showSuccess(`"${item.title}" removed from your portfolio.`);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not delete portfolio item.';
        showError(msg);
      }
    },
    [apiFetch, showSuccess, showError],
  );

  /* ---- availability toggle ---- */
  const handleAvailabilityToggle = useCallback(
    async (checked: boolean) => {
      if (!user) return;
      setAvailabilityToggling(true);
      // Optimistic local update so the switch feels responsive
      setUser({ ...user, isAvailable: checked });
      try {
        const res = await apiFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: checked }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Could not update availability.');
        }
        if (data?.token && data?.user) {
          updateSession(data.token, data.user);
        }
        showSuccess(
          checked
            ? 'You are now accepting new hires.'
            : 'You are no longer accepting new hires.',
        );
      } catch (err: unknown) {
        // Rollback on failure
        setUser({ ...user, isAvailable: !checked });
        const msg =
          err instanceof Error ? err.message : 'Could not update availability.';
        showError(msg);
      } finally {
        setAvailabilityToggling(false);
      }
    },
    [apiFetch, user, setUser, updateSession, showSuccess, showError],
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  const isAvailable = !!user?.isAvailable;

  return (
    <div className="text-slate-100 pb-6 select-none relative overflow-hidden bg-[#04060b] rounded-3xl">
      {/* Ambient glows */}
      <div className="absolute top-[3%] left-[10%] w-[45%] h-[28%] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[8%] right-[12%] w-[40%] h-[30%] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[45%] left-[40%] w-[35%] h-[35%] rounded-full bg-gradient-to-tr from-cyan-500/5 to-transparent blur-[150px] pointer-events-none" />

      {/* Top toast banners */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100vw-1rem)] max-w-lg px-4"
          >
            <div className="flex items-center gap-3 p-4 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="break-words flex-1">{successMsg}</span>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100vw-1rem)] max-w-lg px-4"
          >
            <div className="flex items-center gap-3 p-4 bg-rose-500/15 border border-rose-500/25 rounded-2xl text-rose-300 text-xs font-semibold shadow-2xl backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="break-words flex-1">{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-8 relative z-10">
        {/* ---------- Header ---------- */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono tracking-widest uppercase font-bold">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Artist Studio
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ring-1 ring-white/10 shrink-0">
                <AvatarImage
                  src={user?.profilePic || avatarFallbackUrl(user?.name || '')}
                  alt={user?.name || 'Artist'}
                />
                <AvatarFallback className="bg-slate-800 text-amber-300 font-bold rounded-2xl">
                  {avatarInitials(user?.name || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight truncate">
                  {user?.name || 'Artist'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Manage incoming hires, your portfolio and your earnings
                  in one place.
                </p>
              </div>
            </div>
          </div>

          {/* Availability toggle */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 shrink-0">
              {isAvailable ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  Accepting New Hires
                </span>
                {isAvailable ? (
                  <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    Available
                  </Badge>
                ) : (
                  <Badge className="bg-slate-500/15 border border-slate-500/30 text-slate-300">
                    Paused
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                {isAvailable
                  ? 'Students can find you on the marketplace and submit new commissions.'
                  : 'You are hidden from new commission requests. Existing orders remain active.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`text-xs font-bold ${
                  isAvailable ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                {isAvailable ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={isAvailable}
                onCheckedChange={(c) => void handleAvailabilityToggle(c)}
                disabled={availabilityToggling}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-700 h-6 w-11"
              />
              {availabilityToggling && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              )}
            </div>
          </div>
        </section>

        {/* ---------- Stats Strip ---------- */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            icon={Package}
            label="Active Orders"
            value={stats.active.toString()}
            sub="Pending + In Progress"
            tone="amber"
            loading={bookingsLoading}
          />
          <StatTile
            icon={CheckCircle2}
            label="Completed"
            value={stats.completedTotal.toString()}
            sub={`${stats.completedBookingsCount} in this view`}
            tone="emerald"
            loading={bookingsLoading}
          />
          <StatTile
            icon={DollarSign}
            label="Total Earnings"
            value={fmtBDT(stats.totalEarnings)}
            sub="From completed commissions"
            tone="cyan"
            loading={bookingsLoading}
          />
          <StatTile
            icon={Star}
            label="Rating"
            value={
              stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : '—'
            }
            sub="Avg client rating"
            tone="indigo"
            loading={false}
          />
        </section>

        {/* ---------- Tabs ---------- */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="bg-slate-900/60 border border-white/[0.06] h-auto p-1.5 flex w-full sm:w-fit gap-1 rounded-2xl">
            <TabsTrigger
              value="orders"
              className="min-h-[44px] flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm font-bold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 rounded-xl gap-1.5"
            >
              <Package className="w-4 h-4" />
              Orders
              {stats.active > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold">
                  {stats.active}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="portfolio"
              className="min-h-[44px] flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm font-bold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 rounded-xl gap-1.5"
            >
              <ImageIcon className="w-4 h-4" />
              Portfolio
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/[0.08] text-slate-300 text-[10px] font-bold">
                {portfolio.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="min-h-[44px] flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm font-bold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 rounded-xl gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              Earnings
            </TabsTrigger>
          </TabsList>

          {/* --------------- Tab 1: Orders --------------- */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-5 outline-none">
            <SectionTitle
              icon={Package}
              title="Incoming Orders"
              sub="Hires requested from you by students"
            />

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {FILTERS.map((f) => {
                const isActive = orderFilter === f.value;
                const count = filterCounts[f.value] ?? 0;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setOrderFilter(f.value)}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition min-h-[36px] cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:text-white hover:border-white/15'
                    }`}
                  >
                    {f.label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-amber-500/30 text-amber-200'
                          : 'bg-white/[0.06] text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Orders list */}
            {bookingsLoading ? (
              <OrdersSkeleton />
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No orders here yet"
                message={
                  orderFilter === 'all'
                    ? 'No orders yet. Browse the marketplace to see other artists.'
                    : `No ${orderFilter.replace('_', ' ')} orders to show.`
                }
              />
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((b) => (
                    <OrderCard
                      key={b.id}
                      booking={b}
                      onAdvance={handleAdvance}
                      onCancel={(booking) => setCancelTarget(booking)}
                      onReopen={handleReopen}
                      onToggleExpand={handleToggleExpand}
                      expanded={!!expandedOrders[b.id]}
                      notesDraft={notesDrafts[b.id] ?? ''}
                      onNotesChange={handleNotesChange}
                      onSaveNotes={handleSaveNotes}
                      savingNotesId={savingNotesId}
                      actioningId={actioningId}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* --------------- Tab 2: Portfolio --------------- */}
          <TabsContent
            value="portfolio"
            className="space-y-4 sm:space-y-5 outline-none"
          >
            <SectionTitle
              icon={ImageIcon}
              title="Portfolio Management"
              sub={`${portfolio.length} item${portfolio.length === 1 ? '' : 's'} in your gallery`}
              action={
                <Button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="min-h-[44px] h-11 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Upload New Work
                </Button>
              }
            />

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">
                  Items
                </div>
                <div className="text-xl font-black text-amber-300 mt-1">
                  {portfolioLoading ? '—' : portfolio.length}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">
                  Tags
                </div>
                <div className="text-xl font-black text-emerald-300 mt-1">
                  {portfolioLoading
                    ? '—'
                    : new Set(
                        portfolio.flatMap((p) => p.tags || []),
                      ).size}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">
                  Latest
                </div>
                <div className="text-xl font-black text-cyan-300 mt-1">
                  {portfolioLoading || portfolio.length === 0
                    ? '—'
                    : relTime(portfolio[0]!.createdAt)}
                </div>
              </div>
            </div>

            {portfolioLoading ? (
              <PortfolioSkeleton />
            ) : portfolio.length === 0 ? (
              <EmptyState
                icon={ImageIcon}
                title="No portfolio items yet"
                message="Upload your first work to attract clients. Quality drawings and clear tags are how students find you on the marketplace."
              />
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {portfolio.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      item={item}
                      onDelete={(it) => setDeleteTarget(it)}
                      onZoom={(it) => setLightboxItem(it)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* --------------- Tab 3: Earnings --------------- */}
          <TabsContent
            value="earnings"
            className="space-y-4 sm:space-y-5 outline-none"
          >
            <SectionTitle
              icon={BarChart3}
              title="Earnings & Analytics"
              sub="A snapshot of your completed-commission revenue"
            />

            {bookingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-28 rounded-2xl bg-slate-900/40"
                  />
                ))}
              </div>
            ) : (
              <>
                {/* Top earnings cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-slate-900/40 p-5"
                  >
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[11px] uppercase tracking-widest font-mono font-bold text-emerald-300/80">
                        Total Earnings
                      </span>
                      <Wallet className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="mt-2 text-3xl sm:text-4xl font-black text-emerald-300">
                      {fmtBDT(stats.totalEarnings)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      From {stats.completedBookingsCount} completed commission
                      {stats.completedBookingsCount === 1 ? '' : 's'}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-slate-900/40 p-5"
                  >
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[11px] uppercase tracking-widest font-mono font-bold text-amber-300/80">
                        Pending Earnings
                      </span>
                      <Clock className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="mt-2 text-3xl sm:text-4xl font-black text-amber-300">
                      {fmtBDT(stats.pendingEarnings)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Currently in-progress — paid on completion
                    </div>
                  </motion.div>
                </div>

                {/* Service-type breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                        <Pen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest font-mono font-bold text-amber-300/80">
                          Drawing Only
                        </div>
                        <div className="text-xs text-slate-400">
                          Diagram-only commissions
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-2xl sm:text-3xl font-black text-amber-300">
                      {fmtBDT(earningsBreakdown.byService.drawing_only)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <TrendingUp className="w-3 h-3" />
                      Completed earnings
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                        <PenLine className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-widest font-mono font-bold text-indigo-300/80">
                          Drawing + Writing
                        </div>
                        <div className="text-xs text-slate-400">
                          Full practical write-ups
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-2xl sm:text-3xl font-black text-indigo-300">
                      {fmtBDT(earningsBreakdown.byService.drawing_writing)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <TrendingUp className="w-3 h-3" />
                      Completed earnings
                    </div>
                  </motion.div>
                </div>

                {/* Subject breakdown */}
                <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-slate-300" />
                    <h3 className="text-sm font-bold text-white">
                      Earnings by Subject
                    </h3>
                  </div>
                  {earningsBreakdown.bySubject.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No completed commissions yet — earnings by subject will
                      appear here once you deliver your first order.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {earningsBreakdown.bySubject.map((row) => (
                        <SubjectBar
                          key={row.subject}
                          subject={row.subject}
                          total={row.total}
                          count={row.count}
                          maxTotal={earningsBreakdown.maxSubject}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Rating banner */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.06] to-slate-900/40 p-5 flex items-center gap-4 sm:gap-5"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
                  <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 shrink-0">
                    <Star className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-widest font-mono font-bold text-slate-400">
                      Client Rating
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-amber-300">
                        {stats.rating > 0 ? stats.rating.toFixed(1) : '—'}
                      </span>
                      {stats.rating > 0 && (
                        <span className="text-sm font-bold text-amber-300/70">
                          / 5.0
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {stats.rating > 0
                        ? 'Based on client reviews after delivery.'
                        : 'No ratings yet — they will appear once clients review your completed work.'}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                    <Award className="w-5 h-5 text-amber-300" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Reputation
                    </span>
                  </div>
                </motion.div>

                {/* Foot note */}
                {stats.completedBookingsCount === 0 && (
                  <p className="text-[11px] text-slate-500 text-center">
                    <TrendingDown className="inline w-3 h-3 mr-1 -mt-0.5" />
                    Tip: Completing commissions on time improves your rating,
                    which in turn attracts more clients.
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ---------- Modals ---------- */}
      {/* `key` on UploadModal makes it remount whenever uploadOpen toggles,
          so the form's local state is naturally fresh for every upload
          session (no effect-based reset needed). */}
      <UploadModal
        key={uploadOpen ? 'upload-open' : 'upload-closed'}
        isOpen={uploadOpen}
        onClose={() => !uploadSubmitting && setUploadOpen(false)}
        onSubmit={handleUpload}
        submitting={uploadSubmitting}
      />

      <ImageLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) void handleCancelBooking(cancelTarget);
        }}
        title="Cancel this commission?"
        message={`"${truncate(cancelTarget?.subject || '', 40) || 'This commission'}" from ${cancelTarget?.client?.name || 'this client'} will be marked as cancelled. The client will be notified. This cannot be undone.`}
        confirmText="Yes, cancel it"
        cancelText="Keep it"
        isDestructive
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDeletePortfolio(deleteTarget);
        }}
        title="Delete this portfolio item?"
        message={`"${truncate(deleteTarget?.title || '', 40)}" will be permanently removed from your public gallery. Students will no longer see it.`}
        confirmText="Delete"
        cancelText="Keep"
        isDestructive
      />

      {/* Hidden preview of the delete target image — purely for the confirm modal context */}
      {deleteTarget && (
        <div className="sr-only">
          <img src={deleteTarget.imageUrl} alt={deleteTarget.title} />
        </div>
      )}
    </div>
  );
};

export default ArtistDashboard;
