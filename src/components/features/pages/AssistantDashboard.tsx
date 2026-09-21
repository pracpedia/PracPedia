'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Palette, PenTool, CheckCircle2, Clock, Loader2, AlertCircle,
  RefreshCw, Star, Package, DollarSign, TrendingUp, User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScientificAnalytics, SkillBreakdown, EarningsForecast, TaskProgressRing,
  type AnalyticsTask,
} from '@/components/features/DashboardAnalytics';

interface SubTask {
  id: string;
  bookingId: string;
  taskType: string;
  splitPercent: number;
  earnings: number;
  status: string;
  assignedAt: string;
  completedAt: string | null;
  notes: string | null;
  booking: {
    id: string; subject: string; description: string; price: number;
    serviceType: string; notebookProvider: string; status: string; updatedAt: string;
  };
  parentArtist: { id: string; name: string; email: string; profilePic: string | null };
}

type StatusFilter = 'all' | 'assigned' | 'in_progress' | 'completed' | 'declined';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  assigned: { label: 'Assigned', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In Progress', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: <Loader2 className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  declined: { label: 'Declined', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: <AlertCircle className="w-3 h-3" /> },
};

function formatBDT(amount: number): string {
  return `৳${Number(amount || 0).toLocaleString('en-US')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export const AssistantDashboard: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const fetchSubtasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch('/api/subtasks');
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
      const data = await res.json();
      setSubtasks(Array.isArray(data.subtasks) ? data.subtasks : []);
    } catch (e: any) { setError(e?.message || 'Failed to load your tasks'); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { fetchSubtasks(); }, [fetchSubtasks]);

  const updateSubtaskStatus = async (subtaskId: string, newStatus: string) => {
    setUpdatingId(subtaskId); setError(null); setSuccess(null);
    try {
      const res = await apiFetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : s.completedAt } : s));
      if (newStatus === 'in_progress') setSuccess('Task started. Good luck!');
      else if (newStatus === 'completed') setSuccess('Task marked as completed. The main artist has been notified.');
      else if (newStatus === 'declined') setSuccess('Task declined. The main artist will be notified.');
    } catch (e: any) { setError(e?.message || 'Could not update task status'); }
    finally { setUpdatingId(null); }
  };

  const saveNotes = async (subtaskId: string) => {
    const draft = notesDraft[subtaskId]; if (draft === undefined) return;
    setUpdatingId(subtaskId);
    try {
      const res = await apiFetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: draft }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
      setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, notes: draft } : s));
      setSuccess('Notes saved.');
      setNotesDraft((prev) => { const next = { ...prev }; delete next[subtaskId]; return next; });
    } catch (e: any) { setError(e?.message || 'Could not save notes'); }
    finally { setUpdatingId(null); }
  };

  const stats = {
    total: subtasks.length,
    completed: subtasks.filter((s) => s.status === 'completed').length,
    inProgress: subtasks.filter((s) => s.status === 'in_progress').length,
    assigned: subtasks.filter((s) => s.status === 'assigned').length,
    totalEarnings: subtasks.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.earnings, 0),
    pendingEarnings: subtasks.filter((s) => s.status === 'in_progress' || s.status === 'assigned').reduce((sum, s) => sum + s.earnings, 0),
  };

  // Convert subtasks to AnalyticsTask format for analytics components
  const analyticsTasks: AnalyticsTask[] = useMemo(() => subtasks.map((s) => ({
    id: s.id, subject: s.booking.subject, status: s.status, earnings: s.earnings,
    price: s.booking.price, createdAt: s.assignedAt, completedAt: s.completedAt,
    taskType: s.taskType, splitPercent: s.splitPercent,
  })), [subtasks]);

  const filteredSubtasks = statusFilter === 'all' ? subtasks : subtasks.filter((s) => s.status === statusFilter);

  return (
    <div className="text-slate-100 pb-6 select-none relative overflow-hidden bg-[#04060b] rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/40">
      <div className="absolute top-[3%] left-[10%] w-[45%] h-[28%] rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[8%] right-[12%] w-[40%] h-[30%] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[140px] pointer-events-none" />

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100vw-1rem)] max-w-lg px-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs font-semibold shadow-2xl backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="break-words flex-1">{success}</span>
              <button type="button" onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Dismiss">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono tracking-widest uppercase font-bold">
            <Sparkles className="w-3 h-3 animate-pulse" /> Assistant Studio
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Palette className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight truncate">{user?.name || 'Assistant'}</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Working under your parent artist — complete assigned tasks to earn income.</p>
              </div>
            </div>
            <button type="button" onClick={() => void fetchSubtasks()} disabled={loading}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-white/[0.06] text-slate-300 hover:text-white hover:bg-slate-900 transition-colors text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile icon={Package} label="Assigned" value={stats.assigned.toString()} sub="Waiting for you" tone="amber" loading={loading} />
          <StatTile icon={Clock} label="In Progress" value={stats.inProgress.toString()} sub="Currently working" tone="cyan" loading={loading} />
          <StatTile icon={CheckCircle2} label="Completed" value={stats.completed.toString()} sub="Lifetime total" tone="emerald" loading={loading} />
          <StatTile icon={DollarSign} label="Total Earned" value={formatBDT(stats.totalEarnings)} sub={`Pending: ${formatBDT(stats.pendingEarnings)}`} tone="indigo" loading={loading} />
        </section>

        {/* ═══ NEW: Scientific Analytics ═══ */}
        <ScientificAnalytics tasks={analyticsTasks} loading={loading} />

        {/* ═══ NEW: Skill Breakdown + Earnings Forecast (side by side on desktop) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <SkillBreakdown tasks={analyticsTasks} loading={loading} />
          <EarningsForecast tasks={analyticsTasks} loading={loading} />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300">✕</button>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            const count = f.value === 'all' ? subtasks.length : subtasks.filter((s) => s.status === f.value).length;
            return (
              <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition min-h-[36px] cursor-pointer ${
                  isActive ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:text-white hover:border-white/15'
                }`}>
                {f.label}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/[0.06] text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Task list with enhanced cards (TaskProgressRing added) */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">Loading your tasks...</span>
          </div>
        ) : filteredSubtasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/30 px-6 py-12 sm:py-16 flex flex-col items-center text-center">
            <div className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-slate-500"><Package className="w-7 h-7" /></div>
            <h3 className="mt-4 text-sm font-bold text-slate-300">{statusFilter === 'all' ? 'No tasks assigned yet' : `No ${statusFilter.replace('_', ' ')} tasks`}</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md leading-relaxed">When your parent artist assigns you a task, it'll appear here. Check back later or refresh.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filteredSubtasks.map((s) => {
                const status = STATUS_STYLES[s.status] || STATUS_STYLES.assigned;
                const TaskIcon = s.taskType === 'drawing' ? Palette : PenTool;
                const isUpdating = updatingId === s.id;
                const isCompleted = s.status === 'completed';
                const isDeclined = s.status === 'declined';
                const draftNote = notesDraft[s.id] !== undefined ? notesDraft[s.id] : (s.notes || '');

                // Complexity derived from price
                const complexity = s.booking.price >= 2000 ? 'Complex' : s.booking.price >= 800 ? 'Moderate' : 'Simple';
                const complexityColor = s.booking.price >= 2000 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : s.booking.price >= 800 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                // Time elapsed since assignment
                const daysElapsed = Math.floor((Date.now() - new Date(s.assignedAt).getTime()) / (24 * 60 * 60 * 1000));

                return (
                  <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm p-4 sm:p-5 flex flex-col gap-3">
                    {/* Header with Progress Ring */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <TaskProgressRing status={s.status} size={36} />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">{s.booking.subject}</h3>
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                            {s.taskType === 'drawing' ? 'Drawing' : 'Writing'} · {formatDate(s.assignedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${complexityColor}`}>
                          {complexity}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                    </div>

                    {s.booking.description && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{s.booking.description}</p>}

                    {/* Time elapsed + complexity info */}
                    <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {daysElapsed}d elapsed</span>
                      <span>·</span>
                      <span>৳{s.booking.price} total</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                          {s.parentArtist?.profilePic ? <img src={s.parentArtist.profilePic} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-3.5 h-3.5 text-slate-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Parent Artist</p>
                          <p className="text-xs text-slate-300 truncate">{s.parentArtist?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Your Share ({s.splitPercent}%)</p>
                        <p className="text-base font-black text-cyan-400">{formatBDT(s.earnings)}</p>
                      </div>
                    </div>

                    {!isDeclined && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Your Notes</label>
                        <textarea value={draftNote} onChange={(e) => setNotesDraft((prev) => ({ ...prev, [s.id]: e.target.value.slice(0, 1000) }))} disabled={isUpdating} rows={2}
                          placeholder="Add notes about your progress, materials used, or anything the main artist should know…"
                          className="w-full bg-slate-950/60 border border-white/[0.06] focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none resize-none leading-relaxed disabled:opacity-50" />
                        {notesDraft[s.id] !== undefined && notesDraft[s.id] !== (s.notes || '') && (
                          <button type="button" onClick={() => void saveNotes(s.id)} disabled={isUpdating} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold disabled:opacity-50">
                            {isUpdating ? 'Saving…' : 'Save Notes'}
                          </button>
                        )}
                      </div>
                    )}

                    {!isDeclined && !isCompleted && (
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {s.status === 'assigned' && (
                          <button type="button" onClick={() => void updateSubtaskStatus(s.id, 'in_progress')} disabled={isUpdating}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
                            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />} Start Work
                          </button>
                        )}
                        {s.status === 'in_progress' && (
                          <button type="button" onClick={() => void updateSubtaskStatus(s.id, 'completed')} disabled={isUpdating}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
                            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark Completed
                          </button>
                        )}
                        <button type="button" onClick={() => { if (confirm('Decline this task? The main artist will be notified and may reassign it.')) void updateSubtaskStatus(s.id, 'declined'); }} disabled={isUpdating}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50">
                          Decline
                        </button>
                      </div>
                    )}

                    {isCompleted && s.completedAt && <div className="pt-1 text-[10px] text-slate-500 font-mono">Completed on {formatDate(s.completedAt)}</div>}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface StatTileProps { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone: 'amber' | 'cyan' | 'emerald' | 'indigo'; loading: boolean; }
const STAT_TONE: Record<string, { text: string; bg: string }> = {
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
};
const StatTile: React.FC<StatTileProps> = ({ icon: Icon, label, value, sub, tone, loading }) => {
  const t = STAT_TONE[tone];
  return (
    <div className="p-3 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/[0.06] relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-${tone}-400/50 to-transparent opacity-70`} />
      <div className="flex items-start justify-between gap-1.5">
        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider border ${t.bg} ${t.text}`}>{label}</span>
        <div className={`p-1.5 sm:p-2.5 rounded-xl border ${t.bg} ${t.text} shrink-0`}><Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></div>
      </div>
      <div className="mt-3 sm:mt-4 space-y-0.5">
        <div className="text-xl sm:text-3xl font-black text-white tracking-tight font-sans">{loading ? '—' : value}</div>
        <p className="text-[11px] sm:text-xs font-bold text-slate-200">{loading ? '' : sub}</p>
      </div>
    </div>
  );
};
