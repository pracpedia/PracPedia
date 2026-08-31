'use client';

/**
 * ProfilePage — a professional profile editor for students, artists and admins.
 *
 * Layout: sticky left sidebar (avatar + role + stats + actions) and a main
 * content area with up to 5 internal tabs:
 *
 *   1. Profile Information      — name, phone, bio, profile pic URL (everyone)
 *   2. Artist Marketplace Settings — two-tier BDT pricing, specialties,
 *      availability toggle + live marketplace card preview (artist only)
 *   3. Portfolio Preview         — artist's own portfolio grid (artist only)
 *   4. My Hires            — bookings where the user is a client (all)
 *   5. Account & Security        — email display, change-password placeholder,
 *      AI credits, account type, delete account confirmation (all)
 *
 * All API calls go through `useAuth().apiFetch` so the bearer token is always
 * attached. PUT /api/profile returns `{ token, user }` and we call
 * `updateSession(token, user)` to refresh the auth context.
 *
 * Toasts match the AdminCmsPage / ArtistsPage / ArtistDashboard pattern —
 * fixed top banner, auto-dismiss after 4.5s, dismissible. Mobile-first
 * responsive design throughout.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  User as UserIcon,
  Mail,
  Phone,
  Camera,
  Save,
  Star,
  ShoppingBag,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Pen,
  PenLine,
  Trash2,
  Eye,
  X,
  Sparkles,
  Key,
  LogOut,
  ImageOff,
  Shield,
  Coins,
  RotateCcw,
  ChevronRight,
  GraduationCap,
  Crown,
  Upload,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { ConfirmModal } from '@/components/features/ConfirmModal';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ProfilePageProps {
  /**
   * Optional callback used by the Portfolio Preview tab's "Manage Portfolio"
   * button to switch the parent view (e.g. to the Artist Dashboard). If not
   * provided, a toast is shown instead.
   */
  onSwitchView?: (view: string) => void;
}

type ServiceType = 'drawing_only' | 'drawing_writing';
type BookingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

interface Artist {
  id: string;
  name: string;
  email: string;
  profilePic?: string | null;
  rating?: number;
  completedOrders?: number;
}

interface Booking {
  id: string;
  clientId: string;
  artistId: string;
  serviceType: ServiceType;
  subject: string;
  description: string;
  price: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  referenceImages: string[];
  clientNotes?: string | null;
  artistNotes?: string | null;
  createdAt: string;
  artist: Artist;
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
const BIO_MAX_CHARS = 500;
const SPECIALTY_OPTIONS = ['Physics', 'Chemistry', 'Biology', 'Higher Math', 'ICT'];
const RATE_DRAWING_ONLY_MIN = 50;
const RATE_DRAWING_ONLY_MAX = 5000;
const RATE_DRAWING_WRITING_MIN = 100;
const RATE_DRAWING_WRITING_MAX = 10000;

const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
  Chemistry: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  Biology: 'text-lime-300 border-lime-500/30 bg-lime-500/10',
  'Higher Math': 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  ICT: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10',
};

const ROLE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  user: {
    label: 'Student',
    icon: GraduationCap,
    cls: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
  },
  artist: {
    label: 'Artist',
    icon: Pen,
    cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    cls: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300',
  },
  super_admin: {
    label: 'Super Admin',
    icon: Crown,
    cls: 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-300',
  },
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

const SERVICE_META: Record<
  ServiceType,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  drawing_only: {
    label: 'Drawing Only',
    cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    icon: Pen,
  },
  drawing_writing: {
    label: 'Drawing + Writing',
    cls: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300',
    icon: PenLine,
  },
};

const formatBdt = (n: number): string =>
  `৳${new Intl.NumberFormat('en-IN').format(Math.max(0, Math.round(Number(n) || 0)))}`;

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

interface StatRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: 'amber' | 'emerald' | 'cyan' | 'indigo' | 'rose';
}

const STAT_TONE: Record<NonNullable<StatRowProps['tone']>, string> = {
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  cyan: 'text-cyan-300',
  indigo: 'text-indigo-300',
  rose: 'text-rose-300',
};

const StatRow: React.FC<StatRowProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'cyan',
}) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
    <div className={`p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] ${STAT_TONE[tone]}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
        {label}
      </div>
      <div className="text-sm font-bold text-white truncate">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const SectionTitle: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, sub, action }) => (
  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3 min-w-0">
      <div className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-200 shrink-0">
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
  action?: React.ReactNode;
}> = ({ icon: Icon, title, message, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/30 px-6 py-12 sm:py-16 flex flex-col items-center text-center"
  >
    <div className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-slate-500">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="mt-4 text-sm font-bold text-slate-300">{title}</h3>
    <p className="mt-1 text-xs text-slate-500 max-w-md leading-relaxed">
      {message}
    </p>
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
);

const CommissionsSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 sm:p-5 flex flex-col gap-3"
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
      </div>
    ))}
  </div>
);

const PortfolioSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-white/[0.06] bg-slate-900/40 overflow-hidden"
      >
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const PortfolioThumb: React.FC<{ url: string; alt: string }> = ({ url, alt }) => {
  const [broken, setBroken] = useState(false);
  if (broken || !url) {
    return (
      <div className="w-full aspect-[4/3] flex items-center justify-center bg-slate-900 text-slate-600 border-b border-white/[0.06]">
        <ImageOff className="w-6 h-6" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      onError={() => setBroken(true)}
      className="w-full aspect-[4/3] object-cover bg-slate-900 border-b border-white/[0.06]"
      loading="lazy"
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Live avatar preview (self-contained broken-image state)                    */
/* -------------------------------------------------------------------------- */

interface LiveAvatarProps {
  url: string;
  size?: string;
  rounded?: string;
}

const LiveAvatar: React.FC<LiveAvatarProps> = ({
  url,
  size = 'w-20 h-20',
  rounded = 'rounded-2xl',
}) => {
  const [broken, setBroken] = useState(false);
  const src = broken || !url.trim() ? avatarFallbackUrl('') : url.trim();
  return (
    <Avatar className={`${size} ${rounded} ring-1 ring-white/10 shrink-0`}>
      <AvatarImage
        src={src}
        alt="Avatar preview"
        onError={() => setBroken(true)}
      />
      <AvatarFallback className={`bg-slate-800 text-amber-300 font-bold ${rounded}`}>
        <Camera className="w-5 h-5" />
      </AvatarFallback>
    </Avatar>
  );
};

/* -------------------------------------------------------------------------- */
/*  Avatar editor (sidebar)                                                   */
/* -------------------------------------------------------------------------- */

interface AvatarFieldProps {
  url: string;
  onApply: (url: string) => Promise<void>;
  saving: boolean;
}

// NOTE: Parent must supply `key={url}` on AvatarField so the internal draft
// state resets whenever the saved URL changes (after a successful save).
const AvatarField: React.FC<AvatarFieldProps> = ({ url, onApply, saving }) => {
  const [draft, setDraft] = useState(url);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isUnchanged = draft.trim() === url;

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Max 2 MB for avatars.'); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => { setDraft(String(reader.result || '')); setIsUploading(false); };
    reader.onerror = () => { alert('Read failed.'); setIsUploading(false); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <LiveAvatar key={draft} url={draft} />
        <div className="flex-1 min-w-0">
          <Label
            htmlFor="avatar-url"
            className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold"
          >
            Profile Picture
          </Label>
          <Input
            id="avatar-url"
            value={draft.startsWith('data:') ? '(uploaded image)' : draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://…/avatar.png"
            disabled={draft.startsWith('data:')}
            className="mt-1.5 bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-10 disabled:opacity-60"
          />
        </div>
      </div>

      {/* Upload from device */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={saving || isUploading}
        onClick={() => fileRef.current?.click()}
        className="w-full h-9 min-h-[36px] text-[12px] bg-slate-950 border-white/10 text-slate-200 hover:bg-slate-900 gap-1.5"
      >
        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Upload className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">Upload from device</span>
      </Button>

      {draft.startsWith('data:') && (
        <button
          type="button"
          onClick={() => setDraft('')}
          className="text-[10px] text-rose-300 hover:text-rose-200 underline cursor-pointer"
        >
          Remove uploaded image
        </button>
      )}

      <Button
        type="button"
        size="sm"
        disabled={saving || isUnchanged || !draft.trim()}
        onClick={() => void onApply(draft.trim())}
        className="w-full min-w-0 shrink h-9 min-h-[36px] text-[12px] bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
        <span className="truncate">Save</span>
      </Button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Toast banners                                                              */
/* -------------------------------------------------------------------------- */

interface ToastsProps {
  successMsg: string | null;
  errorMsg: string | null;
  onDismissSuccess: () => void;
  onDismissError: () => void;
}

const Toasts: React.FC<ToastsProps> = ({
  successMsg,
  errorMsg,
  onDismissSuccess,
  onDismissError,
}) => (
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
            onClick={onDismissSuccess}
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
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="break-words flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="text-rose-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* -------------------------------------------------------------------------- */
/*  Tab 1: Profile Information                                                 */
/* -------------------------------------------------------------------------- */

interface ProfileTabProps {
  name: string;
  phoneNumber: string;
  bio: string;
  profilePic: string;
  email: string;
  saving: boolean;
  onChange: (patch: {
    name?: string;
    phoneNumber?: string;
    bio?: string;
    profilePic?: string;
  }) => void;
  onReset: () => void;
  onSave: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({
  name,
  phoneNumber,
  bio,
  profilePic,
  email,
  saving,
  onChange,
  onReset,
  onSave,
}) => {
  const nameEmpty = !name.trim();
  const bioOver = bio.length > BIO_MAX_CHARS;
  const phoneValid =
    !phoneNumber || /^[0-9+\-\s()]{6,20}$/.test(phoneNumber.trim());

  return (
    <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
      <CardHeader className="pb-4 border-b border-white/[0.04]">
        <SectionTitle
          icon={UserIcon}
          title="Profile Information"
          sub="Public identity shown across the platform"
        />
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name" className="text-xs font-bold text-slate-300">
            Full Name <span className="text-rose-400">*</span>
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Your display name"
            className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
            aria-invalid={nameEmpty}
          />
          {nameEmpty && (
            <p className="text-[11px] text-rose-400 font-medium">
              Name cannot be empty.
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-email"
            className="text-xs font-bold text-slate-300"
          >
            Email <span className="text-slate-500 font-normal">(read-only)</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <Input
              id="profile-email"
              value={email}
              disabled
              className="bg-slate-950/60 border-white/10 text-slate-400 pl-10 h-11"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-phone"
            className="text-xs font-bold text-slate-300"
          >
            Phone Number
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <Input
              id="profile-phone"
              value={phoneNumber}
              onChange={(e) => onChange({ phoneNumber: e.target.value })}
              placeholder="+880…"
              className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 pl-10 h-11"
              aria-invalid={!phoneValid}
            />
          </div>
          {!phoneValid && (
            <p className="text-[11px] text-rose-400 font-medium">
              Phone number looks invalid (6-20 digits, +, -, spaces allowed).
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="profile-bio"
              className="text-xs font-bold text-slate-300"
            >
              Bio
            </Label>
            <span
              className={`text-[11px] font-mono ${bioOver ? 'text-rose-400' : 'text-slate-500'}`}
            >
              {bio.length}/{BIO_MAX_CHARS}
            </span>
          </div>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="A short intro — your study focus, interests, what you draw, etc."
            className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 min-h-24"
          />
          {bioOver && (
            <p className="text-[11px] text-rose-400 font-medium">
              Bio exceeds {BIO_MAX_CHARS} characters. Trim it before saving.
            </p>
          )}
        </div>
      </CardContent>

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.04]">
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          disabled={saving}
          className="text-slate-400 hover:text-white hover:bg-white/5 h-11 min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || nameEmpty || bioOver || !phoneValid}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-11 min-h-[44px]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Tab 2: Artist Marketplace Settings                                         */
/* -------------------------------------------------------------------------- */

interface ArtistSettingsTabProps {
  rateDrawingOnly: number;
  rateDrawingWriting: number;
  specialties: string[];
  isAvailable: boolean;
  artistName: string;
  artistBio: string;
  artistProfilePic: string;
  rating: number;
  completedOrders: number;
  saving: boolean;
  onChange: (patch: {
    rateDrawingOnly?: number;
    rateDrawingWriting?: number;
    specialties?: string[];
    isAvailable?: boolean;
  }) => void;
  onSave: () => void;
}

const ArtistSettingsTab: React.FC<ArtistSettingsTabProps> = ({
  rateDrawingOnly,
  rateDrawingWriting,
  specialties,
  isAvailable,
  artistName,
  artistBio,
  artistProfilePic,
  rating,
  completedOrders,
  saving,
  onChange,
  onSave,
}) => {
  const toggleSpecialty = (s: string) => {
    if (specialties.includes(s)) {
      onChange({ specialties: specialties.filter((x) => x !== s) });
    } else {
      onChange({ specialties: [...specialties, s] });
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* Left: forms */}
      <div className="space-y-5">
        <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
          <CardHeader className="pb-4 border-b border-white/[0.04]">
            <SectionTitle
              icon={Coins}
              title="Two-Tier Pricing"
              sub="Set your BDT rates for each hire type"
            />
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Drawing Only */}
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
                    <Pen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-200">Drawing Only</div>
                    <div className="text-[10px] text-amber-400/70 font-mono">
                      {RATE_DRAWING_ONLY_MIN}–{RATE_DRAWING_ONLY_MAX} BDT
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-300 pointer-events-none">
                    ৳
                  </span>
                  <Input
                    type="number"
                    value={Number.isFinite(rateDrawingOnly) ? rateDrawingOnly : 0}
                    min={RATE_DRAWING_ONLY_MIN}
                    max={RATE_DRAWING_ONLY_MAX}
                    onChange={(e) =>
                      onChange({ rateDrawingOnly: Number(e.target.value) || 0 })
                    }
                    className="bg-slate-950 border-white/10 text-slate-100 pl-7 h-11"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pen-only illustration of the practical — diagrams, labels, and
                  schematic structure without written theory.
                </p>
              </div>

              {/* Drawing + Writing */}
              <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    <PenLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-200">Drawing + Writing</div>
                    <div className="text-[10px] text-indigo-400/70 font-mono">
                      {RATE_DRAWING_WRITING_MIN}–{RATE_DRAWING_WRITING_MAX} BDT
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-300 pointer-events-none">
                    ৳
                  </span>
                  <Input
                    type="number"
                    value={Number.isFinite(rateDrawingWriting) ? rateDrawingWriting : 0}
                    min={RATE_DRAWING_WRITING_MIN}
                    max={RATE_DRAWING_WRITING_MAX}
                    onChange={(e) =>
                      onChange({ rateDrawingWriting: Number(e.target.value) || 0 })
                    }
                    className="bg-slate-950 border-white/10 text-slate-100 pl-7 h-11"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Complete practical — diagram plus full procedural write-up,
                  observations, and conclusion.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
          <CardHeader className="pb-4 border-b border-white/[0.04]">
            <SectionTitle
              icon={Sparkles}
              title="Specialties"
              sub="Tap a subject to include it in your marketplace card"
            />
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((s) => {
                const on = specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`inline-flex items-center gap-1.5 px-3 h-10 min-h-[44px] rounded-full border text-xs font-bold transition-all ${
                      on
                        ? SUBJECT_COLORS[s] ??
                          'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    {on && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="specialties-text"
                className="text-xs font-bold text-slate-300"
              >
                Or add custom subjects (comma-separated)
              </Label>
              <Input
                id="specialties-text"
                value={specialties.join(', ')}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onChange({ specialties: arr });
                }}
                placeholder="e.g. Physics, Chemistry, Electronics"
                className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You can mix preset pills above with custom free-text entries here.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
          <CardHeader className="pb-4 border-b border-white/[0.04]">
            <SectionTitle
              icon={isAvailable ? CheckCircle2 : Clock}
              title="Availability"
              sub="Control whether you appear in the marketplace"
            />
          </CardHeader>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">
                  Accepting New Hires
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  When off, you won&apos;t appear in marketplace search results.
                </p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={(v) => onChange({ isAvailable: v })}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-11 min-h-[44px]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Artist Settings
          </Button>
        </div>
      </div>

      {/* Right: live preview card */}
      <div className="space-y-3 lg:sticky lg:top-6 self-start">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
          Live Marketplace Preview
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.08] bg-slate-950/60 overflow-hidden"
        >
          <div className="p-4 flex items-center gap-3 border-b border-white/[0.06]">
            <Avatar className="w-12 h-12 rounded-xl ring-1 ring-white/10">
              <AvatarImage
                src={artistProfilePic || avatarFallbackUrl(artistName)}
                alt={artistName}
              />
              <AvatarFallback className="bg-slate-800 text-amber-300 font-bold rounded-xl">
                {avatarInitials(artistName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">
                {artistName || 'Artist'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                {isAvailable ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Available
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Unavailable
                  </>
                )}
              </div>
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-1 text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                {rating.toFixed(1)}
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {artistBio && (
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {artistBio}
              </p>
            )}
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specialties.slice(0, 5).map((s) => (
                  <span
                    key={s}
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      SUBJECT_COLORS[s] ??
                      'bg-amber-500/10 border-amber-500/25 text-amber-300'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5">
                <div className="text-[9px] font-mono uppercase text-amber-400/70">
                  Drawing Only
                </div>
                <div className="text-sm font-black text-amber-200">
                  {formatBdt(rateDrawingOnly)}
                </div>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] p-2.5">
                <div className="text-[9px] font-mono uppercase text-indigo-400/70">
                  Drawing + Writing
                </div>
                <div className="text-sm font-black text-indigo-200">
                  {formatBdt(rateDrawingWriting)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{completedOrders} completed</span>
              <span className="flex items-center gap-1 text-slate-400">
                <ChevronRight className="w-3 h-3" />
                View Portfolio
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Tab 3: Portfolio Preview                                                    */
/* -------------------------------------------------------------------------- */

interface PortfolioTabProps {
  loading: boolean;
  items: PortfolioItem[];
  onManage: () => void;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ loading, items, onManage }) => {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={Sparkles}
        title="Portfolio Preview"
        sub="Your uploaded works as they appear to clients"
        action={
          <Button
            type="button"
            size="sm"
            onClick={onManage}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-10 min-h-[44px]"
          >
            Manage Portfolio
            <ChevronRight className="w-4 h-4" />
          </Button>
        }
      />

      {loading ? (
        <PortfolioSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No portfolio items yet"
          message="Go to the Artist Dashboard to upload your first work — clients love to see samples before hiring."
          action={
            <Button
              type="button"
              onClick={onManage}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-11 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              Upload First Work
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/40 overflow-hidden flex flex-col"
              >
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block group relative"
                >
                  <PortfolioThumb url={item.imageUrl} alt={item.title} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                            SUBJECT_COLORS[t] ??
                            'bg-white/[0.04] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-auto">
                    {relTime(item.createdAt)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Tab 4: My Hires                                                       */
/* -------------------------------------------------------------------------- */

interface CommissionsTabProps {
  loading: boolean;
  bookings: Booking[];
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onRated?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Rating Card — shown for completed bookings so the client can rate the     */
/*  artist 1-5 stars. Once submitted, the rating is locked.                   */
/* -------------------------------------------------------------------------- */

interface BookingRatingCardProps {
  bookingId: string;
  artistNotes?: string | null;
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onRated?: () => void;
}

const BookingRatingCard: React.FC<BookingRatingCardProps> = ({
  bookingId,
  artistNotes,
  apiFetch,
  onRated,
}) => {
  // Detect prior rating from artistNotes marker `[Rating: X/5 ...]`
  const priorMatch = artistNotes?.match(/\[Rating:\s*(\d)(?:\/5)?(?:\s*—\s*"([^"]*)")?\]/);
  const priorRating = priorMatch ? Number(priorMatch[1]) : null;
  const priorReview = priorMatch?.[2] ?? '';

  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(priorRating ?? 0);
  const [review, setReview] = useState<string>(priorReview);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(priorRating !== null);

  const handleSubmit = async () => {
    if (submitted || selected < 1 || selected > 5) return;
    if (!apiFetch) {
      setError('Auth not ready — please reload.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selected, review: review.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not submit rating.');
      }
      setSubmitted(true);
      onRated?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
        <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
          {submitted ? 'Your Rating' : 'Rate This Artist'}
        </span>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-4 h-4 ${
                  n <= (priorRating ?? selected)
                    ? 'text-amber-300 fill-amber-300'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-300 font-bold">
            {(priorRating ?? selected)}/5
          </span>
          {priorReview && (
            <p className="text-[11px] text-slate-400 italic w-full mt-1">
              &ldquo;{priorReview}&rdquo;
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold ml-auto">
            <CheckCircle2 className="w-3 h-3" />
            Submitted
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={submitting}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(n)}
                  className="p-0.5 rounded hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform hover:scale-110 ${
                      n <= (hover ?? selected)
                        ? 'text-amber-300 fill-amber-300'
                        : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-bold ml-1">
              {selected > 0 ? `${selected}/5` : 'Tap a star'}
            </span>
          </div>

          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Optional review (max 500 chars)…"
            maxLength={500}
            disabled={submitting}
            className="mt-2 min-h-[60px] max-h-[120px] text-[11px] bg-slate-950/70 border-white/10 text-slate-100 placeholder:text-slate-500 resize-y"
          />

          {error && (
            <p className="mt-2 text-[10px] text-red-300 flex items-center gap-1">
              <XCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting || selected < 1 || selected > 5}
              onClick={() => void handleSubmit()}
              className="h-8 min-h-[32px] text-[11px] bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 px-3 gap-1.5 shrink"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <Star className="w-3 h-3 fill-amber-300 shrink-0" />
              )}
              <span className="truncate">
                {submitting ? 'Submitting…' : 'Submit Rating'}
              </span>
            </Button>
            {selected > 0 && !submitting && (
              <button
                type="button"
                onClick={() => setSelected(0)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const CommissionsTab: React.FC<CommissionsTabProps> = ({ loading, bookings, apiFetch, onRated }) => {
  if (loading) {
    return <CommissionsSkeleton />;
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No hires yet"
        message="You haven't hired any drawings yet. Browse the Marketplace to find an artist."
      />
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {bookings.map((b) => {
          const StatusIcon = STATUS_META[b.status].icon;
          const ServiceIcon = SERVICE_META[b.serviceType].icon;
          return (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3 flex-wrap">
                <Avatar className="w-10 h-10 rounded-xl ring-1 ring-white/10 shrink-0">
                  <AvatarImage
                    src={b.artist.profilePic || avatarFallbackUrl(b.artist.name)}
                    alt={b.artist.name}
                  />
                  <AvatarFallback className="bg-slate-800 text-amber-300 font-bold rounded-xl text-xs">
                    {avatarInitials(b.artist.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {b.artist.name}
                    </span>
                    {b.artist.rating ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-300 font-bold">
                        <Star className="w-3 h-3 fill-amber-300" />
                        {b.artist.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hired {relTime(b.createdAt)} · {formatDate(b.createdAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-black text-amber-300">
                    {formatBdt(b.price)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${SERVICE_META[b.serviceType].cls}`}
                >
                  <ServiceIcon className="w-3 h-3" />
                  {SERVICE_META[b.serviceType].label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    SUBJECT_COLORS[b.subject] ??
                    'bg-white/[0.04] border-white/[0.08] text-slate-300'
                  }`}
                >
                  {b.subject}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_META[b.status].cls}`}
                >
                  <StatusIcon
                    className={`w-3 h-3 ${b.status === 'in_progress' ? 'animate-spin' : ''}`}
                  />
                  {STATUS_META[b.status].label}
                </span>
              </div>

              {b.description && (
                <p className="mt-3 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {b.description}
                </p>
              )}

              {b.status === 'completed' && (
                <BookingRatingCard
                  bookingId={b.id}
                  artistNotes={b.artistNotes}
                  apiFetch={apiFetch}
                  onRated={onRated}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Tab 5: Account & Security                                                  */
/* -------------------------------------------------------------------------- */

interface SecurityTabProps {
  email: string;
  isPremium: boolean;
  role: string;
  onSubmitPassword: () => void;
  onOpenDelete: () => void;
}

const SecurityTab: React.FC<SecurityTabProps> = ({
  email,
  isPremium,
  role,
  onSubmitPassword,
  onOpenDelete,
}) => {
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const mismatch = newPwd !== confPwd;
  const tooShort = newPwd.length > 0 && newPwd.length < 8;
  const blocked = !curPwd || !newPwd || mismatch || tooShort;

  return (
    <div className="space-y-5">
      {/* Account type */}
      <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
        <CardHeader className="pb-4 border-b border-white/[0.04]">
          <SectionTitle
            icon={Crown}
            title="Account Type"
            sub={isPremium ? 'Premium scholar with extended limits' : 'Free tier — upgrade to unlock more'}
          />
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">
                {role === 'artist' ? 'Artist / Scholar' : 'Student / Scholar'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {isPremium
                  ? 'Premium features active — unlimited AI requests and reduced rate limits.'
                  : 'Free tier — request a premium upgrade from an admin to unlock unlimited AI usage.'}
              </p>
            </div>
            {isPremium ? (
              <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-300">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/10 text-slate-400">
                Free
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change password (placeholder) */}
      <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
        <CardHeader className="pb-4 border-b border-white/[0.04]">
          <SectionTitle
            icon={Lock}
            title="Change Password"
            sub="Update your sign-in credentials"
          />
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pwd" className="text-xs font-bold text-slate-300">
              Current Password
            </Label>
            <Input
              id="cur-pwd"
              type="password"
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd" className="text-xs font-bold text-slate-300">
                New Password
              </Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="min 8 characters"
                className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
                aria-invalid={tooShort}
              />
              {tooShort && (
                <p className="text-[11px] text-rose-400 font-medium">
                  Password must be at least 8 characters.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf-pwd" className="text-xs font-bold text-slate-300">
                Confirm Password
              </Label>
              <Input
                id="conf-pwd"
                type="password"
                value={confPwd}
                onChange={(e) => setConfPwd(e.target.value)}
                placeholder="re-type new password"
                className="bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 h-11"
                aria-invalid={!!confPwd && mismatch}
              />
              {!!confPwd && mismatch && (
                <p className="text-[11px] text-rose-400 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.04]">
          <Button
            type="button"
            onClick={onSubmitPassword}
            disabled={blocked}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10 h-11 min-h-[44px]"
          >
            <Lock className="w-4 h-4" />
            Update Password
          </Button>
        </div>
      </Card>

      {/* Email display */}
      <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-5 shadow-none">
        <CardHeader className="pb-4 border-b border-white/[0.04]">
          <SectionTitle
            icon={Mail}
            title="Account Email"
            sub="Used for sign-in — cannot be changed"
          />
        </CardHeader>
        <CardContent className="pt-5">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <Input
              value={email}
              disabled
              className="bg-slate-950/60 border-white/10 text-slate-400 pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="bg-rose-500/[0.03] border-rose-500/15 gap-0 py-5 shadow-none">
        <CardHeader className="pb-4 border-b border-rose-500/[0.08]">
          <SectionTitle
            icon={AlertTriangle}
            title="Danger Zone"
            sub="Irreversible account actions"
          />
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-rose-200">Delete Account</div>
              <p className="text-[11px] text-rose-300/70 mt-1 leading-relaxed">
                Requires super admin approval. Cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-11 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main ProfilePage component                                                 */
/* -------------------------------------------------------------------------- */

export const ProfilePage: React.FC<ProfilePageProps> = ({ onSwitchView }) => {
  const { user, apiFetch, updateSession, logout, setIsKeyModalOpen } = useAuth();

  /* ---- toasts ---- */
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => setSuccessMsg(null), TOAST_DURATION_MS);
  }, []);
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    window.setTimeout(() => setErrorMsg(null), TOAST_DURATION_MS);
  }, []);

  /* ---- active tab ---- */
  const [tab, setTab] = useState<string>('profile');

  /* ---- profile form ---- */
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  /* ---- artist settings ---- */
  const [rateDrawingOnly, setRateDrawingOnly] = useState(250);
  const [rateDrawingWriting, setRateDrawingWriting] = useState(550);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [savingArtist, setSavingArtist] = useState(false);

  /* ---- portfolio + bookings data ---- */
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  /* ---- delete account modal ---- */
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Track whether the initial sync from `user` has happened so we don't
  // clobber local form state whenever `user` updates (e.g. after a save).
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (syncRef.current === user.id) return;
    syncRef.current = user.id;

    setName(user.name || '');
    setPhoneNumber(user.phoneNumber || '');
    setBio(user.bio || '');
    setProfilePic(user.profilePic || '');
    setRateDrawingOnly(Number(user.rateDrawingOnly) || 0);
    setRateDrawingWriting(Number(user.rateDrawingWriting) || 0);
    setSpecialties(Array.isArray(user.specialties) ? user.specialties : []);
    setIsAvailable(user.isAvailable !== false);
  }, [user]);

  // Auto-switch tab if artist-only tabs become hidden (e.g. role changed).
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'artist' && (tab === 'artist' || tab === 'portfolio')) {
      setTab('profile');
    }
  }, [user, tab]);

  /* ---- fetch portfolio (artist only) ---- */
  const refreshPortfolio = useCallback(async () => {
    if (!user || user.role !== 'artist') {
      setPortfolio([]);
      setPortfolioLoading(false);
      return;
    }
    setPortfolioLoading(true);
    try {
      const res = await apiFetch('/api/portfolio');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load portfolio.');
      }
      setPortfolio(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load portfolio.';
      showError(msg);
    } finally {
      setPortfolioLoading(false);
    }
  }, [apiFetch, user, showError]);

  /* ---- fetch bookings as client ---- */
  const refreshBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    setBookingsLoading(true);
    try {
      const res = await apiFetch('/api/bookings?scope=client');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not load hires.');
      }
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load hires.';
      showError(msg);
    } finally {
      setBookingsLoading(false);
    }
  }, [apiFetch, user, showError]);

  useEffect(() => {
    void refreshBookings();
  }, [refreshBookings]);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-400 font-mono text-xs">
        No active user session resolved. Please log in.
      </div>
    );
  }

  const isArtist = user.role === 'artist';
  const roleMeta = ROLE_META[user.role] || ROLE_META.user;
  const RoleIcon = roleMeta.icon;

  /* ---- save profile ---- */
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showError('Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          bio: bio.slice(0, BIO_MAX_CHARS),
          profilePic: profilePic.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Server rejected profile update.');
      }
      if (data.token) {
        updateSession(data.token, data.user);
      }
      showSuccess('Profile saved successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      showError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  /* ---- reset profile ---- */
  const handleResetProfile = () => {
    setName(user.name || '');
    setPhoneNumber(user.phoneNumber || '');
    setBio(user.bio || '');
    setProfilePic(user.profilePic || '');
  };

  /* ---- save avatar (one-click from sidebar) ---- */
  const handleSaveAvatar = async (url: string) => {
    if (!url.trim()) {
      showError('Avatar URL cannot be empty.');
      return;
    }
    setSavingAvatar(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePic: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Server rejected avatar update.');
      }
      if (data.token) {
        updateSession(data.token, data.user);
      }
      setProfilePic(url.trim());
      showSuccess('Avatar updated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save avatar.';
      showError(msg);
    } finally {
      setSavingAvatar(false);
    }
  };

  /* ---- save artist settings ---- */
  const handleSaveArtist = async () => {
    setSavingArtist(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateDrawingOnly: Number(rateDrawingOnly) || 0,
          rateDrawingWriting: Number(rateDrawingWriting) || 0,
          specialties,
          isAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Server rejected artist settings.');
      }
      if (data.token) {
        updateSession(data.token, data.user);
      }
      showSuccess('Artist marketplace settings saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save artist settings.';
      showError(msg);
    } finally {
      setSavingArtist(false);
    }
  };

  /* ---- artist settings change handler ---- */
  const handleArtistChange = (patch: {
    rateDrawingOnly?: number;
    rateDrawingWriting?: number;
    specialties?: string[];
    isAvailable?: boolean;
  }) => {
    if (patch.rateDrawingOnly !== undefined) setRateDrawingOnly(patch.rateDrawingOnly);
    if (patch.rateDrawingWriting !== undefined) setRateDrawingWriting(patch.rateDrawingWriting);
    if (patch.specialties !== undefined) setSpecialties(patch.specialties);
    if (patch.isAvailable !== undefined) setIsAvailable(patch.isAvailable);
  };

  /* ---- profile change handler ---- */
  const handleProfileChange = (patch: {
    name?: string;
    phoneNumber?: string;
    bio?: string;
    profilePic?: string;
  }) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.phoneNumber !== undefined) setPhoneNumber(patch.phoneNumber);
    if (patch.bio !== undefined) setBio(patch.bio);
    if (patch.profilePic !== undefined) setProfilePic(patch.profilePic);
  };

  /* ---- delete account confirm (placeholder) ---- */
  const handleConfirmDelete = () => {
    setDeleteOpen(false);
    showError('Account deletion requires super admin approval.');
  };

  /* ---- password submit (placeholder) ---- */
  const handlePasswordSubmit = () => {
    showError('Password change is not yet supported in this version.');
  };

  /* ---- manage portfolio (switch view if callback provided) ---- */
  const handleManagePortfolio = () => {
    if (onSwitchView) {
      onSwitchView('artistDashboard');
    } else {
      showError('Open the Artist Dashboard from the sidebar to manage your portfolio.');
    }
  };

  /* ---- derived: optional member-since (not exposed by serializer) ---- */
  const memberSince = formatDate(
    (user as unknown as { createdAt?: string }).createdAt,
  );

  return (
    <div className="relative">
      <Toasts
        successMsg={successMsg}
        errorMsg={errorMsg}
        onDismissSuccess={() => setSuccessMsg(null)}
        onDismissError={() => setErrorMsg(null)}
      />

      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[5%] left-[10%] w-[40%] h-[30%] rounded-full bg-gradient-to-br from-amber-500/[0.06] to-transparent blur-[140px]" />
        <div className="absolute bottom-[10%] right-[12%] w-[35%] h-[28%] rounded-full bg-gradient-to-tr from-indigo-500/[0.05] to-transparent blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid lg:grid-cols-[320px_1fr] gap-5 sm:gap-6 relative z-10"
      >
        {/* ---------- Sidebar ---------- */}
        <aside className="lg:sticky lg:top-6 self-start space-y-4">
          <Card className="bg-slate-900/40 border-white/[0.06] gap-0 py-0 shadow-none overflow-hidden">
            {/* Avatar + role badge */}
            <div className="p-5 flex flex-col items-center text-center border-b border-white/[0.04]">
              <Avatar className="w-24 h-24 rounded-2xl ring-2 ring-white/10">
                <AvatarImage
                  src={user.profilePic || avatarFallbackUrl(user.name)}
                  alt={user.name || 'User'}
                />
                <AvatarFallback className="bg-slate-800 text-amber-300 font-bold rounded-2xl text-2xl">
                  {avatarInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="mt-3 text-xl font-black text-white tracking-tight break-words w-full">
                {user.name || 'Member'}
              </h1>
              <div
                className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest font-mono ${roleMeta.cls}`}
              >
                <RoleIcon className="w-3 h-3" />
                {roleMeta.label}
              </div>
            </div>

            {/* Avatar URL editor — key on profilePic so the draft resets when
                the saved URL changes after a successful avatar update. */}
            <div className="p-5 border-b border-white/[0.04]">
              <AvatarField
                key={profilePic}
                url={profilePic}
                onApply={handleSaveAvatar}
                saving={savingAvatar}
              />
            </div>

            {/* Quick stats */}
            <div className="p-5 space-y-2.5">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  <Mail className="w-3 h-3" />
                  Email
                </div>
                <div className="text-xs text-slate-300 break-all leading-relaxed mt-1">
                  {user.email}
                </div>
              </div>

              <Separator className="bg-white/[0.04]" />

              {user.phoneNumber && (
                <>
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                      <Phone className="w-3 h-3" />
                      Phone
                    </div>
                    <div className="text-xs text-slate-300 break-all leading-relaxed mt-1">
                      {user.phoneNumber}
                    </div>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                </>
              )}

              {memberSince !== '—' && (
                <StatRow
                  icon={Crown}
                  label="Member Since"
                  value={memberSince}
                  tone="indigo"
                />
              )}

              {isArtist && (
                <>
                  <StatRow
                    icon={Star}
                    label="Rating"
                    value={`${(Number(user.rating) || 0).toFixed(1)} ★`}
                    sub={`${Number(user.completedOrders) || 0} completed orders`}
                    tone="amber"
                  />
                  <StatRow
                    icon={user.isAvailable !== false ? CheckCircle2 : Clock}
                    label="Availability"
                    value={user.isAvailable !== false ? 'Available' : 'Unavailable'}
                    tone={user.isAvailable !== false ? 'emerald' : 'rose'}
                  />
                </>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 flex flex-col gap-2 border-t border-white/[0.04]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsKeyModalOpen(true)}
                className="bg-white/[0.02] border-white/10 text-slate-200 hover:bg-white/5 hover:text-white h-11 min-h-[44px]"
              >
                <Key className="w-4 h-4" />
                Gemini Key
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={logout}
                className="bg-rose-500/[0.04] border border-rose-500/15 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 h-11 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </Card>
        </aside>

        {/* ---------- Main content with tabs ---------- */}
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <TabsList className="bg-slate-900/60 border border-white/[0.06] h-auto p-1 w-fit">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 text-slate-400 px-3 h-9 text-xs font-bold"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Profile
                </TabsTrigger>
                {isArtist && (
                  <TabsTrigger
                    value="artist"
                    className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 text-slate-400 px-3 h-9 text-xs font-bold"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Artist
                  </TabsTrigger>
                )}
                {isArtist && (
                  <TabsTrigger
                    value="portfolio"
                    className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 text-slate-400 px-3 h-9 text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Portfolio
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="hires"
                  className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 text-slate-400 px-3 h-9 text-xs font-bold"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Hires
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 text-slate-400 px-3 h-9 text-xs font-bold"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Security
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile">
              <ProfileTab
                name={name}
                phoneNumber={phoneNumber}
                bio={bio}
                profilePic={profilePic}
                email={user.email}
                saving={savingProfile}
                onChange={handleProfileChange}
                onReset={handleResetProfile}
                onSave={handleSaveProfile}
              />
            </TabsContent>

            {isArtist && (
              <TabsContent value="artist">
                <ArtistSettingsTab
                  rateDrawingOnly={rateDrawingOnly}
                  rateDrawingWriting={rateDrawingWriting}
                  specialties={specialties}
                  isAvailable={isAvailable}
                  artistName={name}
                  artistBio={bio}
                  artistProfilePic={profilePic}
                  rating={Number(user.rating) || 0}
                  completedOrders={Number(user.completedOrders) || 0}
                  saving={savingArtist}
                  onChange={handleArtistChange}
                  onSave={handleSaveArtist}
                />
              </TabsContent>
            )}

            {isArtist && (
              <TabsContent value="portfolio">
                <PortfolioTab
                  loading={portfolioLoading}
                  items={portfolio}
                  onManage={handleManagePortfolio}
                />
              </TabsContent>
            )}

            <TabsContent value="hires">
              <CommissionsTab
                loading={bookingsLoading}
                bookings={bookings}
                apiFetch={apiFetch}
                onRated={refreshBookings}
              />
            </TabsContent>

            <TabsContent value="security">
              <SecurityTab
                email={user.email}
                isPremium={!!user.isPremium}
                role={user.role}
                onSubmitPassword={handlePasswordSubmit}
                onOpenDelete={() => setDeleteOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {/* Delete account confirm modal */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message="This action is permanent. All your data will be lost."
        confirmText="Delete Account"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  );
};

export default ProfilePage;
