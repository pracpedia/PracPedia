'use client';

/**
 * Marketplace — Professional hire board for practical notebook
 * drawings. Two service tiers (Drawing Only vs Drawing + Writing), artist
 * grid with portfolio previews, full artist detail modal with portfolio
 * lightbox, and a 5-step booking modal that POSTs to /api/bookings.
 *
 * Replaces the legacy ArtistsPage workspace/marketplace hybrid. The artist
 * dashboard lives elsewhere; this page is now a pure marketplace view.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Palette,
  Pen,
  PenLine,
  Image as ImageIcon,
  Star,
  ShoppingBag,
  Clock,
  Search,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  BadgeCheck,
  Eye,
  TrendingUp,
  Award,
  Users,
  ChevronDown,
  Info,
  AlertCircle,
  CheckCircle2,
  FileText,
  Send,
  SlidersHorizontal,
  Mail,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Phone,
  Upload,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

/* -------------------------------------------------------------------------- */
/*  Types & Constants                                                         */
/* -------------------------------------------------------------------------- */

type ServiceType = 'drawing_only' | 'drawing_writing';
type NotebookProvider = 'client' | 'artist';

interface Artist {
  id: string;
  name: string;
  email: string;
  profilePic: string;
  bio: string;
  role: 'artist';
  rateDrawingOnly: number;
  rateDrawingWriting: number;
  notebookCost: number;
  specialties: string[];
  isAvailable: boolean;
  rating: number;
  completedOrders: number;
  phoneNumber?: string;
}

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
}

interface ArtistsPageProps {
  activeTheme?: string;
}

const SUBJECTS: string[] = ['Physics', 'Chemistry', 'Biology', 'Higher Math', 'ICT'];
const SPECIALTY_FILTERS: string[] = ['All', ...SUBJECTS];
const TOAST_DURATION_MS = 4500;

type SortKey = 'rating' | 'completed' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'completed', label: 'Most Completed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const fmtPriceRange = (vals: number[]): string => {
  if (vals.length === 0) return '—';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return min === max ? `${min} BDT` : `${min}–${max} BDT`;
};

const avatarUrl = (a: Artist): string => {
  if (a.profilePic && a.profilePic.trim()) return a.profilePic;
  const seed = encodeURIComponent(a.name || a.id);
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e293b,0f172a,f59e0b,312e81&textColor=ffffff`;
};

const portfolioFallbackUrl = (artistId: string, idx: number): string => {
  const seed = encodeURIComponent(`${artistId}-${idx}`);
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0f172a,1e293b,312e81,f59e0b`;
};

const truncate = (text: string, max: number): string => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

const avatarInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};

/* -------------------------------------------------------------------------- */
/*  Service Tier Comparison Card                                               */
/* -------------------------------------------------------------------------- */

interface TierCardProps {
  type: ServiceType;
  artists: Artist[];
}

const TierCard: React.FC<TierCardProps> = ({ type, artists }) => {
  const isDrawingOnly = type === 'drawing_only';
  const Icon = isDrawingOnly ? Pen : PenLine;
  const rates = artists.map((a) =>
    isDrawingOnly ? a.rateDrawingOnly : a.rateDrawingWriting,
  );
  const priceText = fmtPriceRange(rates);

  const bullets = isDrawingOnly
    ? [
        'Hand-drawn labelled apparatus, schematics and inked diagrams',
        'Clean linework + shading tuned for practical notebooks',
        'Delivered as high-resolution scanned images',
        'Best when you already have the written theory and just need the figure',
      ]
    : [
        'Complete practical write-up: theory, observation, calculation, conclusion',
        'Hand-drawn labelled diagram included in the same hire',
        'Board-curriculum-aligned theory section, word-perfect',
        'Combined delivery — no need to hire a separate writer',
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 ${
        isDrawingOnly
          ? 'bg-amber-500/[0.05] border-amber-500/25'
          : 'bg-indigo-500/[0.05] border-indigo-500/25'
      }`}
    >
      <div
        className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
          isDrawingOnly ? 'bg-amber-500' : 'bg-indigo-500'
        }`}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div
            className={`p-3 rounded-2xl border ${
              isDrawingOnly
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
          {isDrawingOnly ? (
            <Badge className="bg-white/5 text-slate-300 border-white/10 hover:bg-white/5">
              Most Affordable
            </Badge>
          ) : (
            <Badge className="bg-indigo-500/15 text-indigo-200 border-indigo-500/25 hover:bg-indigo-500/15">
              Best Value
            </Badge>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isDrawingOnly ? 'Drawing Only' : 'Drawing + Writing'}
        </h3>
        <p
          className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${
            isDrawingOnly ? 'text-amber-100/70' : 'text-indigo-100/70'
          }`}
        >
          {isDrawingOnly
            ? 'The artist creates the diagram, sketch or illustration only.'
            : 'The artist creates both the diagram AND the written practical content.'}
        </p>

        <div className="mt-4 mb-4">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
            Market Range
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black mt-1 ${
              isDrawingOnly ? 'text-amber-300' : 'text-indigo-300'
            }`}
          >
            {priceText}
          </div>
        </div>

        <ul className="space-y-2 flex-1">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs sm:text-sm text-slate-300"
            >
              <Check
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isDrawingOnly ? 'text-amber-400' : 'text-indigo-400'
                }`}
              />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Artist Card                                                                */
/* -------------------------------------------------------------------------- */

/* ── Visual star rating display (1-5 stars) ── */
const StarRating: React.FC<{ rating: number; size?: string; showNumber?: boolean }> = ({
  rating,
  size = 'w-3 h-3',
  showNumber = true,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const isFull = n <= fullStars;
        const isHalf = n === fullStars + 1 && hasHalf;
        return (
          <div key={n} className="relative">
            {/* Empty star (background) */}
            <Star className={`${size} text-slate-700`} />
            {/* Filled star (overlay) */}
            {(isFull || isHalf) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? '50%' : '100%' }}
              >
                <Star className={`${size} text-amber-400 fill-amber-400`} />
              </div>
            )}
          </div>
        );
      })}
      {showNumber && (
        <span className="ml-1 text-[10px] font-bold text-amber-300 font-mono">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

interface ArtistCardProps {
  artist: Artist;
  portfolioThumbs: string[];
  portfolioLoading: boolean;
  onView: () => void;
  onHire: () => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  portfolioThumbs,
  portfolioLoading,
  onView,
  onHire,
}) => {
  const unavailable = !artist.isAvailable;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="relative rounded-3xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-3.5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 rounded-2xl border border-white/10">
          <AvatarImage
            src={avatarUrl(artist)}
            alt={artist.name}
            className="object-cover"
          />
          <AvatarFallback className="rounded-2xl bg-slate-800 text-amber-300 text-sm font-black">
            {avatarInitials(artist.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm sm:text-base font-black text-white truncate">
              {artist.name}
            </h3>
            <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider border-0 ${
                artist.isAvailable
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1 ${
                  artist.isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {artist.isAvailable ? 'Available' : 'Unavailable'}
            </Badge>
            <span className="text-[10px] text-slate-400 font-mono inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {artist.rating.toFixed(1)}
              <span className="text-slate-600">·</span>
              <span>{artist.completedOrders} done</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[2.4em]">
        {artist.bio || 'No bio provided.'}
      </p>

      {/* Rating + completed orders */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-950/40 border border-white/[0.04] p-2.5">
        <StarRating rating={artist.rating} size="w-3.5 h-3.5" />
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <span className="text-amber-300 font-bold">{artist.rateDrawingOnly}</span>
          <span>–</span>
          <span className="text-indigo-300 font-bold">{artist.rateDrawingWriting}</span>
          <span>BDT</span>
        </div>
      </div>

      {/* Specialties */}
      {artist.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {artist.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold"
            >
              {s}
            </span>
          ))}
          {artist.specialties.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400 text-[10px] font-bold">
              +{artist.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Portfolio thumbnails */}
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((idx) => {
          const src = portfolioThumbs[idx] ?? portfolioFallbackUrl(artist.id, idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={onView}
              aria-label={`View ${artist.name}'s portfolio`}
              className="aspect-[4/3] rounded-lg overflow-hidden border border-white/[0.04] bg-slate-950 relative group"
            >
              {portfolioLoading && !portfolioThumbs[idx] ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <img
                  src={src}
                  alt={`Portfolio sample ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 bg-slate-950/40 border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:text-white min-h-[40px] text-xs font-bold"
        >
          <Eye className="w-3.5 h-3.5" />
          Portfolio
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onHire}
          disabled={unavailable}
          className={`flex-1 min-h-[40px] text-xs font-black border border-white/10 ${
            unavailable
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/15'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {unavailable ? 'Unavailable' : 'Hire'}
        </Button>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Filter Bar                                                                 */
/* -------------------------------------------------------------------------- */

interface FilterBarProps {
  query: string;
  setQuery: (q: string) => void;
  specialty: string;
  setSpecialty: (s: string) => void;
  availableOnly: boolean;
  setAvailableOnly: (v: boolean) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  query,
  setQuery,
  specialty,
  setSpecialty,
  availableOnly,
  setAvailableOnly,
  sort,
  setSort,
}) => {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-md p-3 sm:p-4 flex flex-col gap-3">
      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists by name or specialty…"
            className="pl-9 bg-slate-950/40 border-white/[0.06] text-slate-200 placeholder:text-slate-500 h-10 text-xs sm:text-sm"
          />
        </div>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger
            size="default"
            className="w-full sm:w-52 h-10 bg-slate-950/40 border-white/[0.06] text-slate-200"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
            {SORT_OPTIONS.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                className="text-xs focus:bg-white/5"
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setAvailableOnly(!availableOnly)}
          aria-pressed={availableOnly}
          className={`flex items-center gap-2 h-10 px-4 rounded-md border text-xs font-bold transition-all cursor-pointer ${
            availableOnly
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950/40 border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              availableOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          Available only
        </button>
      </div>

      {/* Specialty pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
        {SPECIALTY_FILTERS.map((s) => {
          const active = specialty === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialty(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer min-h-[32px] ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-950/40 text-slate-400 hover:text-white hover:bg-white/5 border border-white/[0.06]'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Portfolio Lightbox (inside the detail modal)                               */
/* -------------------------------------------------------------------------- */

interface PortfolioLightboxProps {
  items: PortfolioItem[];
  index: number;
  onClose: () => void;
  onNav: (newIndex: number) => void;
}

const PortfolioLightbox: React.FC<PortfolioLightboxProps> = ({
  items,
  index,
  onClose,
  onNav,
}) => {
  const item = items[index];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white"
      >
        <X className="w-5 h-5" />
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNav((index - 1 + items.length) % items.length);
            }}
            aria-label="Previous"
            className="absolute left-3 sm:left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNav((index + 1) % items.length);
            }}
            aria-label="Next"
            className="absolute right-3 sm:right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <motion.div
        key={item.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="max-w-5xl w-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={item.imageUrl}
          alt={item.title}
          className="max-h-[78vh] max-w-full object-contain rounded-2xl border border-white/10 shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <div className="text-center max-w-lg">
          <p className="text-sm font-bold text-white">{item.title}</p>
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {item.tags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="bg-white/[0.03] border-white/[0.06] text-slate-400 text-[9px] font-mono"
                >
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Artist Detail Modal                                                        */
/* -------------------------------------------------------------------------- */

interface ArtistDetailModalProps {
  artist: Artist | null;
  portfolio: PortfolioItem[];
  loading: boolean;
  onClose: () => void;
  onHire: () => void;
}

const ArtistDetailModal: React.FC<ArtistDetailModalProps> = ({
  artist,
  portfolio,
  loading,
  onClose,
  onHire,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // The parent passes a `key` containing the artist id so this modal remounts
  // (and resets lightboxIndex) whenever a different artist is opened — no
  // setState-in-effect needed.

  if (!artist) return null;

  const stats = [
    {
      icon: Star,
      label: 'Rating',
      value: artist.rating.toFixed(1),
      color: 'text-amber-300',
    },
    {
      icon: Award,
      label: 'Completed',
      value: artist.completedOrders.toString(),
      color: 'text-emerald-300',
    },
    {
      icon: Clock,
      label: 'Response',
      value: '≤ 24h',
      color: 'text-cyan-300',
    },
  ];

  return (
    <Dialog open={!!artist} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 border-white/10 text-slate-200 p-0"
        showCloseButton
      >
        <DialogTitle className="sr-only">{artist.name} — Artist Portfolio</DialogTitle>
        <DialogDescription className="sr-only">
          View the full portfolio, pricing and specialties of {artist.name}.
        </DialogDescription>

        {/* Header banner */}
        <div className="relative p-5 sm:p-6 border-b border-white/[0.06] bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/10 shrink-0">
              <AvatarImage
                src={avatarUrl(artist)}
                alt={artist.name}
                className="object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-slate-800 text-amber-300 text-lg font-black">
                {avatarInitials(artist.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {artist.name}
                </h2>
                <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/15">
                  <BadgeCheck className="w-3 h-3 mr-1" />
                  Verified Artist
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border-0 ${
                    artist.isAvailable
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      artist.isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {artist.isAvailable ? 'Available for hire' : 'Currently unavailable'}
                </Badge>
                <span className="text-xs text-slate-400 font-mono inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {artist.email}
                </span>
                {artist.phoneNumber && (
                  <a
                    href={`tel:${artist.phoneNumber}`}
                    className="text-xs text-emerald-300 font-mono inline-flex items-center gap-1 hover:text-emerald-200 transition-colors mt-1"
                  >
                    <Phone className="w-3 h-3" />
                    {artist.phoneNumber}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-slate-950/40 border border-white/[0.04] p-2.5 flex flex-col items-center justify-center text-center"
              >
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-base sm:text-lg font-black text-white mt-1">
                  {s.value}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Bio */}
          <section>
            <h3 className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-2">
              About
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {artist.bio || 'This artist has not added a bio yet.'}
            </p>
          </section>

          {/* Specialties */}
          {artist.specialties.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-2">
                Specialties
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {artist.specialties.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="bg-amber-500/10 border-amber-500/20 text-amber-200 text-[10px] font-mono"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Portfolio gallery */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                Portfolio ({portfolio.length})
              </h3>
              {portfolio.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Click any image to enlarge
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                ))}
              </div>
            ) : portfolio.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.04] bg-slate-950/40 p-6 text-center">
                <ImageIcon className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">
                  This artist hasn&apos;t uploaded any portfolio samples yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {portfolio.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.06] bg-slate-950"
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] font-bold text-white line-clamp-1">
                        {p.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/[0.04]">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="sm:flex-1 bg-slate-950/40 border-white/[0.06] text-slate-300 hover:bg-white/5 hover:text-white min-h-[44px] text-xs font-bold"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={onHire}
              disabled={!artist.isAvailable}
              className={`sm:flex-[2] min-h-[44px] text-sm font-black border border-white/10 ${
                !artist.isAvailable
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {artist.isAvailable
                ? `Hire ${artist.name.split(' ')[0]}`
                : 'Artist unavailable'}
            </Button>
          </div>
        </div>

        {/* Lightbox overlay (rendered inside the dialog's portal) */}
        {lightboxIndex !== null && (
          <PortfolioLightbox
            items={portfolio}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNav={setLightboxIndex}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------------------------------------------------- */
/*  Booking Modal                                                              */
/* -------------------------------------------------------------------------- */

interface BookingModalProps {
  artist: Artist | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isAuthed: boolean;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const BookingModal: React.FC<BookingModalProps> = ({
  artist,
  onClose,
  onSuccess,
  onError,
  isAuthed,
  apiFetch,
}) => {
  const [serviceType, setServiceType] = useState<ServiceType>('drawing_only');
  const [notebookProvider, setNotebookProvider] = useState<NotebookProvider>('client');
  const [subject, setSubject] = useState<string>('Physics');
  const [description, setDescription] = useState<string>('');
  const [referenceImages, setReferenceImages] = useState<string[]>(['']);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const refImageFileRef = useRef<HTMLInputElement>(null);

  // Upload a local image file → convert to base64 data URL
  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (refImageFileRef.current) refImageFileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { onError('Please choose an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { onError('Max 4 MB per reference image.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      // Find the first empty slot, or append
      setReferenceImages((prev) => {
        const firstEmpty = prev.findIndex((u) => !u.trim());
        if (firstEmpty >= 0) {
          const next = [...prev];
          next[firstEmpty] = dataUrl;
          return next;
        }
        return [...prev, dataUrl];
      });
    };
    reader.onerror = () => onError('Could not read image file.');
    reader.readAsDataURL(file);
  };

  // The parent passes a `key` containing the artist id so this modal remounts
  // (and resets all form state) whenever a different artist is opened — no
  // setState-in-effect needed.

  if (!artist) return null;

  // 4-tier pricing: base price + notebookCost if artist provides the notebook
  const basePrice = serviceType === 'drawing_only' ? artist.rateDrawingOnly : artist.rateDrawingWriting;
  const notebookExtra = notebookProvider === 'artist' ? (artist.notebookCost || 0) : 0;
  const price = basePrice + notebookExtra;

  // 2 service options (Step 1)
  const serviceOptions: { value: ServiceType; label: string; desc: string; price: number }[] = [
    {
      value: 'drawing_only',
      label: 'Drawing Only',
      desc: 'Diagram only — you handle the write-up.',
      price: artist.rateDrawingOnly,
    },
    {
      value: 'drawing_writing',
      label: 'Drawing + Writing',
      desc: 'Diagram + full written practical content.',
      price: artist.rateDrawingWriting,
    },
  ];

  // 2 notebook provider options (Step 2 — mandatory)
  const notebookOptions: { value: NotebookProvider; label: string; desc: string; extra: number }[] = [
    {
      value: 'client',
      label: 'I will provide notebook',
      desc: 'You supply the notebook, no extra charge.',
      extra: 0,
    },
    {
      value: 'artist',
      label: 'Artist will provide notebook',
      desc: `Artist supplies the notebook (+${artist.notebookCost} BDT extra).`,
      extra: artist.notebookCost,
    },
  ];

  const canSubmit =
    isAuthed &&
    artist.isAvailable &&
    description.trim().length >= 10 &&
    !submitting;

  const handleSubmit = async () => {
    if (!artist) return;
    if (!isAuthed) {
      onError('Please log in to submit a hire request.');
      return;
    }
    if (!artist.isAvailable) {
      onError('This artist is currently unavailable for new hires.');
      return;
    }
    if (description.trim().length < 10) {
      onError('Please describe the work in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          serviceType,
          notebookProvider,
          subject,
          description: description.trim(),
          referenceImages: referenceImages
            .map((u) => u.trim())
            .filter(Boolean),
          clientNotes: clientNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not create booking.');
      }
      onSuccess(
        `Request submitted to ${artist.name}. Track progress in your bookings.`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create booking.';
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!artist} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-950 border-white/10 text-slate-200 p-0"
        showCloseButton
      >
        <DialogTitle className="sr-only">
          Hire {artist.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Submit a new hire request to {artist.name}.
        </DialogDescription>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/[0.06] bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 rounded-2xl border border-white/10">
              <AvatarImage
                src={avatarUrl(artist)}
                alt={artist.name}
                className="object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-slate-800 text-amber-300 text-sm font-black">
                {avatarInitials(artist.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Hire {artist.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tell us exactly what diagram or write-up you need. Pricing is
                fixed per artist.
              </p>
            </div>
          </div>

          {!isAuthed && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                You need to be logged in to submit a hire request. Log in
                to your account, then return here to hire {artist.name}.
              </p>
            </div>
          )}

          {!artist.isAvailable && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                This artist is currently unavailable and not accepting new
                hires. Try another artist or check back later.
              </p>
            </div>
          )}
        </div>

        {/* Body — step-by-step form */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Step 1 — Service type (2 options) */}
          <section>
            <StepHeader index={1} title="Choose a service" />
            <RadioGroup
              value={serviceType}
              onValueChange={(v) => setServiceType(v as ServiceType)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3"
            >
              {serviceOptions.map((opt) => {
                const active = serviceType === opt.value;
                const isDrawingOnly = opt.value === 'drawing_only';
                return (
                  <label
                    key={opt.value}
                    htmlFor={`svc-${opt.value}`}
                    className={`relative flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      active
                        ? isDrawingOnly
                          ? 'border-amber-500/40 bg-amber-500/[0.06]'
                          : 'border-indigo-500/40 bg-indigo-500/[0.06]'
                        : 'border-white/[0.06] bg-slate-950/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`svc-${opt.value}`}
                      className="mt-1 data-[state=checked]:border-amber-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">
                          {opt.label}
                        </span>
                        <span
                          className={`text-sm font-black shrink-0 ${
                            isDrawingOnly ? 'text-amber-300' : 'text-indigo-300'
                          }`}
                        >
                          {opt.price} BDT
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </section>

          {/* Step 2 — Notebook provider (2 mandatory options) */}
          <section>
            <StepHeader index={2} title="Who provides the notebook?" />
            <RadioGroup
              value={notebookProvider}
              onValueChange={(v) => setNotebookProvider(v as NotebookProvider)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3"
            >
              {notebookOptions.map((opt) => {
                const active = notebookProvider === opt.value;
                const isArtist = opt.value === 'artist';
                return (
                  <label
                    key={opt.value}
                    htmlFor={`np-${opt.value}`}
                    className={`relative flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      active
                        ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                        : 'border-white/[0.06] bg-slate-950/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`np-${opt.value}`}
                      className="mt-1 data-[state=checked]:border-emerald-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">
                          {opt.label}
                        </span>
                        {opt.extra > 0 ? (
                          <span className="text-xs font-black text-emerald-300 shrink-0">
                            +{opt.extra} BDT
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 shrink-0">
                            FREE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </section>

          {/* Step 3 — Subject */}
          <section>
            <StepHeader index={3} title="Select subject" />
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger
                size="default"
                className="w-full h-11 mt-3 bg-slate-950/40 border-white/[0.06] text-slate-200"
              >
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                {SUBJECTS.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-xs focus:bg-white/5"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Step 3 — Description */}
          <section>
            <StepHeader
              index={4}
              title="Describe the work"
              subtitle="Be specific: apparatus name, required labels, board paper number, etc."
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Acid-base titration apparatus with burette, pipette, conical flask and indicator — all parts labelled."
              className="mt-3 min-h-[110px] bg-slate-950/40 border-white/[0.06] text-slate-200 placeholder:text-slate-500 text-sm"
              aria-label="Work description"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500 font-mono">
                {description.trim().length < 10
                  ? `At least ${10 - description.trim().length} more characters`
                  : 'Looks good'}
              </span>
              <span className="text-[10px] text-slate-600 font-mono">
                {description.length} chars
              </span>
            </div>
          </section>

          {/* Step 4 — Reference images */}
          <section>
            <StepHeader
              index={5}
              title="Reference images"
              subtitle="Optional — upload from device or paste URLs of diagrams you want the artist to follow."
            />
            <div className="space-y-2 mt-3">
              {/* Upload from device button */}
              <input
                ref={refImageFileRef}
                type="file"
                accept="image/*"
                onChange={handleRefImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => refImageFileRef.current?.click()}
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

              {referenceImages.map((url, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2"
                >
                  {/* Thumbnail if uploaded image */}
                  {url.startsWith('data:') && (
                    <img
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                  )}
                  <div className="relative flex-1">
                    {!url.startsWith('data:') && (
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    )}
                    <Input
                      type={url.startsWith('data:') ? 'text' : 'url'}
                      value={url.startsWith('data:') ? '(uploaded image)' : url}
                      onChange={(e) => {
                        const next = [...referenceImages];
                        next[idx] = e.target.value;
                        setReferenceImages(next);
                      }}
                      disabled={url.startsWith('data:')}
                      placeholder="https://example.com/reference.png"
                      className={`${url.startsWith('data:') ? 'pl-3' : 'pl-9'} h-10 bg-slate-950/40 border-white/[0.06] text-slate-200 placeholder:text-slate-500 text-xs sm:text-sm disabled:opacity-60`}
                      aria-label={`Reference image ${idx + 1}`}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      setReferenceImages(
                        referenceImages.length > 1
                          ? referenceImages.filter((_, i) => i !== idx)
                          : ['']
                      )
                    }
                    className="h-10 w-10 bg-slate-950/40 border-white/[0.06] text-slate-400 hover:text-rose-300 hover:border-rose-500/30 shrink-0"
                    aria-label="Remove reference image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setReferenceImages([...referenceImages, ''])}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another reference
              </button>
            </div>
          </section>

          {/* Step 5 — Client notes */}
          <section>
            <StepHeader
              index={6}
              title="Client notes"
              subtitle="Optional — deadline, format, anything else the artist should know."
            />
            <Textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="e.g. Need this by Friday for class; A4 scan at 300 DPI."
              className="mt-3 min-h-[80px] bg-slate-950/40 border-white/[0.06] text-slate-200 placeholder:text-slate-500 text-sm"
              aria-label="Client notes"
            />
          </section>
        </div>

        {/* Footer — live price summary + submit */}
        <div className="sticky bottom-0 p-5 sm:p-6 border-t border-white/[0.06] bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                Total
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {price}{' '}
                <span className="text-base font-bold text-slate-400">BDT</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                Service
              </div>
              <div
                className={`text-sm font-black ${
                  serviceType === 'drawing_only'
                    ? 'text-amber-300'
                    : 'text-indigo-300'
                }`}
              >
                {serviceType === 'drawing_only'
                  ? 'Drawing Only'
                  : 'Drawing + Writing'}
              </div>
            </div>

            {/* Notebook provider summary */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                Notebook
              </div>
              <div className="text-sm font-black text-emerald-300">
                {notebookProvider === 'client'
                  ? 'I will provide'
                  : `Artist provides (+${artist.notebookCost} BDT)`}
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full min-h-[48px] text-sm font-black border border-white/10 ${
              !canSubmit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Hire Request
              </>
            )}
          </Button>
          {!isAuthed && (
            <p className="text-[10px] text-slate-500 text-center mt-2">
              You must be logged in to submit.
            </p>
          )}
          {isAuthed && !artist.isAvailable && (
            <p className="text-[10px] text-rose-400 text-center mt-2">
              Artist unavailable — submit disabled.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------------------------------------------------- */
/*  Small step header                                                          */
/* -------------------------------------------------------------------------- */

const StepHeader: React.FC<{
  index: number;
  title: string;
  subtitle?: string;
}> = ({ index, title, subtitle }) => (
  <div className="flex items-start gap-2.5">
    <span className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[11px] font-black flex items-center justify-center shrink-0">
      {index}
    </span>
    <div className="min-w-0">
      <h4 className="text-sm font-bold text-white">{title}</h4>
      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                           */
/* -------------------------------------------------------------------------- */

const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="rounded-3xl border border-white/[0.06] bg-slate-900/40 p-4 sm:p-5 flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Main Marketplace Page                                                      */
/* -------------------------------------------------------------------------- */

export const ArtistsPage: React.FC<ArtistsPageProps> = ({ activeTheme }) => {
  const { user, apiFetch } = useAuth();
  void activeTheme; // theme applied at the page root; we keep the prop for API compat

  const [artists, setArtists] = useState<Artist[]>([]);
  const [portfolioMap, setPortfolioMap] = useState<Record<string, PortfolioItem[]>>({});
  const [portfolioLoading, setPortfolioLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const [query, setQuery] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('All');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<SortKey>('rating');

  const [detailArtist, setDetailArtist] = useState<Artist | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [bookingArtist, setBookingArtist] = useState<Artist | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---- toast helpers ---- */
  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => setSuccessMsg(null), TOAST_DURATION_MS);
  }, []);
  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    window.setTimeout(() => setErrorMsg(null), TOAST_DURATION_MS);
  }, []);

  /* ---- fetch artists on mount ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPortfolioLoading(true);
      try {
        const res = await fetch('/api/artists');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(data?.error || 'Could not load artists.');
        }
        const list: Artist[] = Array.isArray(data) ? data : [];
        setArtists(list);

        // Fetch each artist's portfolio in parallel via the public
        // /api/artists/[id] endpoint. This populates the mini-grid thumbnails
        // on the cards and the full gallery in the detail modal.
        const entries = await Promise.all(
          list.map(
            async (a): Promise<[string, PortfolioItem[]]> => {
              try {
                const r = await fetch(`/api/artists/${a.id}`);
                const j = await r.json();
                if (!r.ok) return [a.id, []];
                const portfolio: PortfolioItem[] = Array.isArray(j?.portfolio)
                  ? j.portfolio
                  : [];
                return [a.id, portfolio];
              } catch {
                return [a.id, []];
              }
            },
          ),
        );
        if (cancelled) return;
        const map: Record<string, PortfolioItem[]> = {};
        for (const [id, portfolio] of entries) {
          map[id] = portfolio;
        }
        setPortfolioMap(map);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Could not load artists.';
        if (!cancelled) showError(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPortfolioLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  /* ---- portfolio thumbs lookup ---- */
  const thumbsFor = useCallback(
    (artist: Artist): string[] => {
      const items = portfolioMap[artist.id] || [];
      return items.slice(0, 3).map((p) => p.imageUrl);
    },
    [portfolioMap],
  );

  /* ---- filtered + sorted list ---- */
  const visibleArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = artists.slice();
    if (q) {
      list = list.filter((a) => {
        const haystack = [
          a.name,
          a.bio,
          a.specialties.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (specialty !== 'All') {
      list = list.filter((a) => a.specialties.includes(specialty));
    }
    if (availableOnly) {
      list = list.filter((a) => a.isAvailable);
    }
    switch (sort) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'completed':
        list.sort((a, b) => b.completedOrders - a.completedOrders);
        break;
      case 'price_asc':
        list.sort((a, b) => a.rateDrawingOnly - b.rateDrawingOnly);
        break;
      case 'price_desc':
        list.sort((a, b) => b.rateDrawingOnly - a.rateDrawingOnly);
        break;
    }
    return list;
  }, [artists, query, specialty, availableOnly, sort]);

  /* ---- derived stats ---- */
  const stats = useMemo(() => {
    const totalArtists = artists.length;
    const totalCompleted = artists.reduce(
      (sum, a) => sum + a.completedOrders,
      0,
    );
    const ratedArtists = artists.filter((a) => a.rating > 0);
    const avgRating =
      ratedArtists.length === 0
        ? 0
        : ratedArtists.reduce((s, a) => s + a.rating, 0) / ratedArtists.length;
    return {
      totalArtists,
      totalCompleted,
      avgRating,
    };
  }, [artists]);

  /* ---- open detail ---- */
  const openDetail = useCallback(
    async (artist: Artist) => {
      setDetailArtist(artist);
      // If portfolio already cached, skip the fetch.
      if (portfolioMap[artist.id] !== undefined) {
        return;
      }
      setDetailLoading(true);
      try {
        const r = await fetch(`/api/artists/${artist.id}`);
        const j = await r.json();
        if (r.ok) {
          const portfolio: PortfolioItem[] = Array.isArray(j?.portfolio)
            ? j.portfolio
            : [];
          setPortfolioMap((prev) => ({ ...prev, [artist.id]: portfolio }));
        }
      } catch {
        // ignore — modal will just show empty portfolio
      } finally {
        setDetailLoading(false);
      }
    },
    [portfolioMap],
  );

  const detailPortfolio = detailArtist
    ? portfolioMap[detailArtist.id] || []
    : [];

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="text-slate-100 pb-6 select-none relative overflow-hidden bg-[#04060b]">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-7 sm:space-y-9 relative z-10">
        {/* ---------- Hero ---------- */}
        <section className="text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono tracking-widest uppercase mb-3 font-bold">
            <Sparkles className="w-3 h-3 animate-pulse" />
            PracPedia Hire Board
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white font-sans tracking-tight leading-[1.05] break-words">
            Hire{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Board-Standard
            </span>{' '}
            Practical Drawings
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-2xl leading-relaxed mx-auto sm:mx-0">
            Hire verified student artists to draw your practical notebook
            diagrams. Pick{' '}
            <span className="text-amber-300 font-bold">Drawing Only</span> for
            labelled figures, or{' '}
            <span className="text-indigo-300 font-bold">Drawing + Writing</span>{' '}
            for the full practical write-up — diagram, theory, observation and
            calculation, all in one place.
          </p>

          {/* Stats strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 max-w-md sm:max-w-xl mx-auto sm:mx-0">
            <StatTile
              icon={Users}
              value={loading ? '—' : stats.totalArtists.toString()}
              label="Artists"
              color="text-amber-300"
            />
            <StatTile
              icon={Award}
              value={loading ? '—' : stats.totalCompleted.toString()}
              label="Hires"
              color="text-emerald-300"
            />
            <StatTile
              icon={Star}
              value={
                loading
                  ? '—'
                  : stats.avgRating === 0
                    ? '—'
                    : stats.avgRating.toFixed(1)
              }
              label="Avg Rating"
              color="text-cyan-300"
            />
          </div>
        </section>

        {/* ---------- Filters ---------- */}
        <section>
          <FilterBar
            query={query}
            setQuery={setQuery}
            specialty={specialty}
            setSpecialty={setSpecialty}
            availableOnly={availableOnly}
            setAvailableOnly={setAvailableOnly}
            sort={sort}
            setSort={setSort}
          />
        </section>

        {/* ---------- Artist grid ---------- */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-black text-white">
              {loading
                ? 'Loading artists…'
                : `${visibleArtists.length} artist${
                    visibleArtists.length === 1 ? '' : 's'
                  } available`}
            </h2>
            {!loading && visibleArtists.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Sorted by {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </span>
            )}
          </div>

          {loading ? (
            <GridSkeleton />
          ) : visibleArtists.length === 0 ? (
            <EmptyState
              hasFilters={
                !!query ||
                specialty !== 'All' ||
                availableOnly
              }
              onReset={() => {
                setQuery('');
                setSpecialty('All');
                setAvailableOnly(false);
              }}
            />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {visibleArtists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    artist={a}
                    portfolioThumbs={thumbsFor(a)}
                    portfolioLoading={portfolioLoading}
                    onView={() => openDetail(a)}
                    onHire={() => {
                      if (!user) {
                        showError(
                          'Please log in to hire an artist.',
                        );
                        return;
                      }
                      if (!a.isAvailable) {
                        showError(
                          `${a.name} is currently unavailable.`,
                        );
                        return;
                      }
                      setBookingArtist(a);
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>

      {/* ---------- Modals ---------- */}
      <ArtistDetailModal
        key={detailArtist ? `detail-${detailArtist.id}` : 'detail-none'}
        artist={detailArtist}
        portfolio={detailPortfolio}
        loading={detailLoading}
        onClose={() => setDetailArtist(null)}
        onHire={() => {
          if (!detailArtist) return;
          if (!user) {
            showError('Please log in to hire an artist.');
            return;
          }
          if (!detailArtist.isAvailable) {
            showError(`${detailArtist.name} is currently unavailable.`);
            return;
          }
          setBookingArtist(detailArtist);
        }}
      />

      <BookingModal
        key={bookingArtist ? `booking-${bookingArtist.id}` : 'booking-none'}
        artist={bookingArtist}
        onClose={() => setBookingArtist(null)}
        onSuccess={showSuccess}
        onError={showError}
        isAuthed={!!user}
        apiFetch={apiFetch}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

const StatTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-md p-3 sm:p-3.5 flex flex-col items-center justify-center text-center">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-lg sm:text-xl font-black text-white mt-1 leading-none">
      {value}
    </span>
    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mt-1">
      {label}
    </span>
  </div>
);

const SectionTitle: React.FC<{
  kicker: string;
  title: string;
  subtitle?: string;
}> = ({ kicker, title, subtitle }) => (
  <div>
    <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400/80 font-bold">
      {kicker}
    </div>
    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
      {title}
    </h2>
    {subtitle && (
      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
        {subtitle}
      </p>
    )}
  </div>
);

const EmptyState: React.FC<{
  hasFilters: boolean;
  onReset: () => void;
}> = ({ hasFilters, onReset }) => (
  <div className="rounded-3xl border border-white/[0.06] bg-slate-900/40 p-10 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950/50 border border-white/[0.06] flex items-center justify-center">
      <Wand2 className="w-6 h-6 text-slate-500" />
    </div>
    <h3 className="text-base font-bold text-white mt-4">
      {hasFilters ? 'No artists match your filters' : 'No artists yet'}
    </h3>
    <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
      {hasFilters
        ? 'Try widening your search, switching the subject, or turning off the availability filter.'
        : 'The first verified artists will appear here once they register.'}
    </p>
    {hasFilters && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        className="mt-4 bg-slate-950/40 border-white/[0.06] text-slate-300 hover:bg-white/5 hover:text-white min-h-[40px] text-xs font-bold"
      >
        Reset filters
      </Button>
    )}
  </div>
);
