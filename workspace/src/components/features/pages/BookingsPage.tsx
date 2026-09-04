'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  User,
  Palette,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Image as ImageIcon,
  Star,
  Package,
  ClipboardList,
  Truck,
} from 'lucide-react';

interface Booking {
  id: string;
  clientId: string;
  artistId: string;
  serviceType: string;
  notebookProvider: string;
  subject: string;
  description: string;
  referenceImages: string[];
  price: number;
  commissionPercent: number;
  commissionAmount: number;
  artistEarnings: number;
  status: string;
  paymentStatus: string;
  clientNotes: string | null;
  artistNotes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; email: string; profilePic?: string | null };
  artist: { id: string; name: string; email: string; profilePic?: string | null; rating: number; completedOrders: number };
}

interface HireRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

// 3-step progress bar: pending → in_progress → completed
// cancelled is a side-state (order cancelled, not part of the progress bar)
type Tab = 'hire_requests' | 'active_orders' | 'completed_cancelled';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Progress steps for the 1-2-3 progress bar
const PROGRESS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: ClipboardList },
  { key: 'in_progress', label: 'In Progress', icon: Package },
  { key: 'completed', label: 'Delivered', icon: Truck },
] as const;

// Map booking status → progress step index (0, 1, 2). Cancelled = -1 (off-track).
function statusToProgressStep(status: string): number {
  if (status === 'pending') return 0;
  if (status === 'in_progress') return 1;
  if (status === 'completed') return 2;
  return -1; // cancelled or unknown
}

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: <Loader2 className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: <XCircle className="w-3 h-3" /> },
};

const PAYMENT_STYLES: Record<string, string> = {
  unpaid: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  refunded: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export const BookingsPage: React.FC<{ activeTheme?: string }> = () => {
  const { user, apiFetch } = useAuth();
  const [tab, setTab] = useState<Tab>('active_orders');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hireRequests, setHireRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/bookings');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : (data.bookings || []));
    } catch (e: any) {
      setError(e?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const fetchHireRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/hire');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHireRequests(Array.isArray(data) ? data : (data.hireRequests || []));
    } catch (e: any) {
      setError(e?.message || 'Failed to load hire requests');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (tab === 'hire_requests') {
      if (isAdmin) fetchHireRequests();
      else { setLoading(false); }
    } else {
      fetchBookings();
    }
  }, [tab, isAdmin, fetchBookings, fetchHireRequests]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to update booking');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateHireStatus = async (hireId: string, newStatus: string) => {
    setUpdatingId(hireId);
    try {
      setHireRequests((prev) =>
        prev.map((h) => (h.id === hireId ? { ...h, status: newStatus } : h)),
      );
    } catch (e: any) {
      setError(e?.message || 'Failed to update hire request');
    } finally {
      setUpdatingId(null);
    }
  };

  // Categorize bookings by tab
  const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'in_progress');
  const completedCancelledBookings = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

  // Apply search to the current tab's bookings
  const filterBySearch = (list: Booking[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((b) =>
      b.subject.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.client?.name?.toLowerCase().includes(q) ||
      b.artist?.name?.toLowerCase().includes(q) ||
      b.client?.email?.toLowerCase().includes(q) ||
      b.artist?.email?.toLowerCase().includes(q)
    );
  };

  const filteredActive = filterBySearch(activeBookings);
  const filteredCompleted = filterBySearch(completedCancelledBookings);

  const filteredHireRequests = hireRequests.filter((h) => {
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        h.fullName.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q) ||
        h.subject.toLowerCase().includes(q) ||
        h.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Progress bar component ──
  const ProgressBar: React.FC<{ status: string }> = ({ status }) => {
    const currentStep = statusToProgressStep(status);
    const isCancelled = status === 'cancelled';

    if (isCancelled) {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/15">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-[11px] font-bold text-rose-300">Order Cancelled</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        {PROGRESS_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isFuture = idx > currentStep;
          return (
            <React.Fragment key={step.key}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1 min-w-[60px] sm:min-w-[80px]">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 animate-pulse'
                        : 'bg-slate-900 border-slate-700 text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                </div>
                <span
                  className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-center leading-tight ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'text-cyan-300'
                        : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[7px] font-mono text-slate-700">{idx + 1}</span>
              </div>
              {/* Connector line */}
              {idx < PROGRESS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-[20px] rounded-full transition-all ${
                    idx < currentStep ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ── Booking card component ──
  const BookingCard: React.FC<{ b: Booking }> = ({ b }) => {
    const style = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
    const payStyle = PAYMENT_STYLES[b.paymentStatus] || PAYMENT_STYLES.unpaid;
    const isClient = b.clientId === user?.id;
    const isArtist = b.artistId === user?.id;
    const canUpdate = isArtist || isAdmin;
    const currentStep = statusToProgressStep(b.status);

    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition-all">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${style.color}`}>
              {style.icon} {style.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${payStyle}`}>
              {b.paymentStatus}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(b.createdAt).toLocaleString()}
            </span>
          </div>
          <span className="text-lg font-black text-white font-mono">৳{b.price}</span>
        </div>

        {/* Subject + description */}
        <div className="mb-3">
          <h3 className="text-sm font-bold text-white">{b.subject}</h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.description}</p>
        </div>

        {/* 1-2-3 Progress bar — shows the order tracking for the client */}
        <div className="mb-3">
          <ProgressBar status={b.status} />
        </div>

        {/* Client + Artist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Client {isClient && '(You)'}</p>
              <p className="text-xs text-slate-200 font-bold truncate">{b.client?.name || 'Unknown'}</p>
              <p className="text-[10px] text-slate-500 truncate">{b.client?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Artist {isArtist && '(You)'}</p>
              <p className="text-xs text-slate-200 font-bold truncate">{b.artist?.name || 'Unknown'}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Star className="w-2.5 h-2.5 text-amber-400" />
                {b.artist?.rating?.toFixed(1) || '5.0'} · {b.artist?.completedOrders || 0} orders
              </div>
            </div>
          </div>
        </div>

        {/* Service details */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-mono">
          <span className="px-2 py-1 rounded bg-white/[0.03] text-slate-400 border border-white/[0.04]">
            {b.serviceType === 'drawing_only' ? 'Drawing Only' : 'Drawing + Writing'}
          </span>
          <span className="px-2 py-1 rounded bg-white/[0.03] text-slate-400 border border-white/[0.04]">
            Notebook: {b.notebookProvider === 'artist' ? 'Artist provides' : 'Client provides'}
          </span>
          {b.referenceImages?.length > 0 && (
            <span className="px-2 py-1 rounded bg-white/[0.03] text-slate-400 border border-white/[0.04] inline-flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5" /> {b.referenceImages.length} ref images
            </span>
          )}
        </div>

        {/* Notes */}
        {(b.clientNotes || b.artistNotes) && (
          <div className="space-y-1.5 mb-3">
            {b.clientNotes && (
              <p className="text-[11px] text-slate-400">
                <span className="text-slate-500 font-bold">Client notes:</span> {b.clientNotes}
              </p>
            )}
            {b.artistNotes && (
              <p className="text-[11px] text-slate-400">
                <span className="text-slate-500 font-bold">Artist notes:</span> {b.artistNotes}
              </p>
            )}
          </div>
        )}

        {/* Artist actions — update progress system-wide */}
        {canUpdate && b.status !== 'cancelled' && b.status !== 'completed' && (
          <div className="flex gap-2 pt-2 border-t border-white/[0.04] flex-wrap">
            {/* Step 1 → 2: Accept (move to in_progress) */}
            {b.status === 'pending' && (
              <>
                <button
                  onClick={() => updateBookingStatus(b.id, 'in_progress')}
                  disabled={updatingId === b.id}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {updatingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                  Accept & Start
                </button>
                <button
                  onClick={() => updateBookingStatus(b.id, 'cancelled')}
                  disabled={updatingId === b.id}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
            {/* Step 2 → 3: Mark Delivered (move to completed) */}
            {b.status === 'in_progress' && (
              <>
                <button
                  onClick={() => updateBookingStatus(b.id, 'completed')}
                  disabled={updatingId === b.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {updatingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Mark Delivered
                </button>
                <button
                  onClick={() => updateBookingStatus(b.id, 'cancelled')}
                  disabled={updatingId === b.id}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel Order
                </button>
              </>
            )}
          </div>
        )}

        {/* Client actions — can cancel pending orders */}
        {isClient && !canUpdate && b.status === 'pending' && (
          <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
            <button
              onClick={() => updateBookingStatus(b.id, 'cancelled')}
              disabled={updatingId === b.id}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel Order
            </button>
          </div>
        )}

        {/* Completed/cancelled — show step label */}
        {(b.status === 'completed' || b.status === 'cancelled') && (
          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>
              {b.status === 'completed'
                ? `Delivered on ${new Date(b.updatedAt).toLocaleDateString()}`
                : `Cancelled on ${new Date(b.updatedAt).toLocaleDateString()}`}
            </span>
            {isArtist && b.status === 'completed' && (
              <span className="text-emerald-400">+৳{b.artistEarnings} earned</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Bookings & Orders
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Track all marketplace orders, hire requests, and deliveries across the platform.'
              : 'Track your marketplace orders from placement to delivery.'}
          </p>
        </div>
        <button
          onClick={() => (tab === 'hire_requests' ? fetchHireRequests() : fetchBookings())}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs — 3 options: Hire Requests | Active Orders | Completed/Cancelled */}
      <div className="flex gap-2 border-b border-white/[0.06] overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => { setTab('hire_requests'); setStatusFilter('all'); }}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer whitespace-nowrap ${
              tab === 'hire_requests'
                ? 'text-purple-400 border-purple-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 inline mr-1.5" />
            Hire Requests ({hireRequests.length})
          </button>
        )}
        <button
          onClick={() => { setTab('active_orders'); setStatusFilter('all'); }}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer whitespace-nowrap ${
            tab === 'active_orders'
              ? 'text-cyan-400 border-cyan-400'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5 inline mr-1.5" />
          Active Orders ({activeBookings.length})
        </button>
        <button
          onClick={() => { setTab('completed_cancelled'); setStatusFilter('all'); }}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer whitespace-nowrap ${
            tab === 'completed_cancelled'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
          Completed / Cancelled ({completedCancelledBookings.length})
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={tab === 'hire_requests' ? 'Search by name, email, subject...' : 'Search by subject, client, artist...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-cyan-500/50 text-xs min-h-[40px]"
          />
        </div>
        {tab === 'hire_requests' && (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  statusFilter === s
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">Loading...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && (
        (tab === 'hire_requests' && filteredHireRequests.length === 0) ||
        (tab === 'active_orders' && filteredActive.length === 0) ||
        (tab === 'completed_cancelled' && filteredCompleted.length === 0)
      ) && (
        <div className="text-center py-12 rounded-2xl bg-slate-950/50 border border-white/[0.06]">
          {tab === 'hire_requests' ? (
            <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          ) : tab === 'active_orders' ? (
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          )}
          <p className="text-sm text-slate-400 font-medium">
            {tab === 'hire_requests'
              ? 'No hire requests found'
              : tab === 'active_orders'
                ? 'No active orders'
                : 'No completed or cancelled orders'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            {search ? 'Try adjusting your search.' : 'New items will appear here.'}
          </p>
        </div>
      )}

      {/* Active orders list */}
      {!loading && tab === 'active_orders' && filteredActive.length > 0 && (
        <div className="space-y-3">
          {filteredActive.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}

      {/* Completed/Cancelled orders list */}
      {!loading && tab === 'completed_cancelled' && filteredCompleted.length > 0 && (
        <div className="space-y-3">
          {filteredCompleted.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}

      {/* Hire requests list */}
      {!loading && tab === 'hire_requests' && filteredHireRequests.length > 0 && (
        <div className="space-y-3">
          {filteredHireRequests.map((h) => {
            const style = STATUS_STYLES[h.status] || STATUS_STYLES.pending;
            return (
              <div
                key={h.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase border ${style.color}`}>
                      {style.icon} {style.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <h3 className="text-sm font-bold text-white">{h.subject}</h3>
                  <p className="text-xs text-slate-400 mt-1">{h.message}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <User className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Name</p>
                      <p className="text-xs text-slate-200 font-bold truncate">{h.fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Email</p>
                      <p className="text-xs text-slate-200 truncate">{h.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Phone</p>
                      <p className="text-xs text-slate-200 truncate">{h.phone}</p>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                    {h.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateHireStatus(h.id, 'completed')}
                          disabled={updatingId === h.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => updateHireStatus(h.id, 'cancelled')}
                          disabled={updatingId === h.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
