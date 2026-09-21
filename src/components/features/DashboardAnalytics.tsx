'use client';

/**
 * DashboardAnalytics — 4 reusable scientific analytics components.
 *
 * Components:
 *   1. ScientificAnalytics  — animated counters + line chart + bar chart + donut chart
 *   2. TaskProgressRing      — SVG progress ring for task cards
 *   3. SkillBreakdown        — per-subject proficiency bars
 *   4. EarningsForecast      — projected earnings + 90-day area chart
 *
 * All pure SVG + Framer Motion. No chart libraries.
 * All responsive: mobile-first, reshape across breakpoints.
 *
 * Usage:
 *   import { ScientificAnalytics, SkillBreakdown, EarningsForecast, TaskProgressRing } from '@/components/features/DashboardAnalytics';
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Clock, CheckCircle2, Target,
  Activity, Zap, Award, DollarSign, BarChart3,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   Shared Types
   ═══════════════════════════════════════════════════════════════════════════ */

export interface AnalyticsTask {
  id: string;
  subject: string;
  status: string;
  earnings: number;
  price: number;
  createdAt: string;
  completedAt: string | null;
  taskType?: string;
  splitPercent?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper: Animated Counter (counts up from 0 to value)
   ═══════════════════════════════════════════════════════════════════════════ */

const AnimatedCounter: React.FC<{ value: number; format?: (n: number) => string; duration?: number }> = ({
  value, format = (n) => Math.round(n).toString(), duration = 1.5,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => format(latest));
  const [display, setDisplay] = useState(format(0));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration, ease: 'easeOut' });
      const unsub = rounded.on('change', (v) => setDisplay(v));
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, value, count, rounded, duration]);

  return <span ref={ref}>{display}</span>;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Helper: Format BDT
   ═══════════════════════════════════════════════════════════════════════════ */

const fmtBDT = (n: number) => `৳${Math.round(n || 0).toLocaleString('en-US')}`;

/* ═══════════════════════════════════════════════════════════════════════════
   1. ScientificAnalytics
   ═══════════════════════════════════════════════════════════════════════════ */

export const ScientificAnalytics: React.FC<{ tasks: AnalyticsTask[]; loading?: boolean }> = ({ tasks, loading }) => {
  // Compute metrics
  const completed = tasks.filter((t) => t.status === 'completed');
  const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending');
  const totalEarnings = completed.reduce((s, t) => s + t.earnings, 0);

  // On-time rate (completed within 7 days of assignment)
  const onTime = completed.filter((t) => {
    if (!t.completedAt) return false;
    const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;

  // Avg turnaround time (days)
  const avgTurnaround = completed.length > 0
    ? completed.reduce((sum, t) => {
        if (!t.completedAt) return sum;
        return sum + (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime());
      }, 0) / completed.length / (24 * 60 * 60 * 1000)
    : 0;

  // Earnings trend (last 30 days, daily)
  const earningsTrend = useMemo(() => {
    const days: { date: Date; earnings: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({ date: day, earnings: 0 });
    }
    completed.forEach((t) => {
      if (!t.completedAt) return;
      const cd = new Date(t.completedAt);
      const dayIndex = days.findIndex((d) =>
        d.date.getDate() === cd.getDate() &&
        d.date.getMonth() === cd.getMonth() &&
        d.date.getFullYear() === cd.getFullYear()
      );
      if (dayIndex >= 0) days[dayIndex].earnings += t.earnings;
    });
    return days;
  }, [completed]);

  // Tasks per week (last 4 weeks)
  const weeklyTasks = useMemo(() => {
    const weeks = [0, 0, 0, 0];
    const now = Date.now();
    tasks.forEach((t) => {
      const created = new Date(t.createdAt).getTime();
      const weeksAgo = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 4) weeks[3 - weeksAgo]++;
    });
    return weeks;
  }, [tasks]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-900/40 border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-sm font-black text-white tracking-tight">Scientific Analytics</h2>
      </div>

      {/* Metric counters row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard icon={CheckCircle2} label="Completion Rate" value={`${Math.round((completed.length / Math.max(tasks.length, 1)) * 100)}%`} tone="emerald" />
        <MetricCard icon={Clock} label="Avg Turnaround" value={`${avgTurnaround.toFixed(1)}d`} tone="cyan" />
        <MetricCard icon={Target} label="On-Time Rate" value={`${Math.round(onTimeRate)}%`} tone="amber" />
        <MetricCard icon={Zap} label="Productivity" value={`${(completed.length / Math.max(1, tasks.length / 4)).toFixed(1)}/wk`} tone="indigo" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Line chart — earnings trend (30 days) */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Earnings Trend (30d)</h3>
            <span className="text-xs font-black text-cyan-400">{fmtBDT(earningsTrend.reduce((s, d) => s + d.earnings, 0))}</span>
          </div>
          <MiniLineChart data={earningsTrend.map((d) => d.earnings)} />
        </div>

        {/* Donut chart — task status distribution */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06]">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-3">Task Distribution</h3>
          <MiniDonutChart
            segments={[
              { label: 'Completed', value: completed.length, color: '#34d399' },
              { label: 'In Progress', value: inProgress.length, color: '#22d3ee' },
              { label: 'Assigned', value: tasks.filter((t) => t.status === 'assigned' || t.status === 'pending').length, color: '#fbbf24' },
            ]}
          />
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06]">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-3">Tasks Per Week (4w)</h3>
        <MiniBarChart data={weeklyTasks} labels={['W-3', 'W-2', 'W-1', 'This Wk']} />
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; tone: string;
}> = ({ icon: Icon, label, value, tone }) => (
  <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/40 border border-white/[0.06] relative overflow-hidden">
    <div className={`absolute top-0 left-0 right-0 h-[1px] bg-${tone}-400/30`} />
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={`w-3 h-3 text-${tone}-400`} />
      <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold truncate">{label}</span>
    </div>
    <div className="text-base sm:text-lg font-black text-white tracking-tight">{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Mini Line Chart — SVG path with draw-on animation
   ═══════════════════════════════════════════════════════════════════════════ */

const MiniLineChart: React.FC<{ data: number[] }> = ({ data }) => {
  const width = 300, height = 80, padding = 8;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (v / max) * (height - padding * 2),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${height - padding} L ${points[0]?.x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={areaD} fill="url(#lineGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
      <motion.path
        d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      {points.filter((_, i) => data[i] > 0).map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r="2" fill="#22d3ee"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i * 0.05 }}
        />
      ))}
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Mini Bar Chart — SVG rects growing from bottom
   ═══════════════════════════════════════════════════════════════════════════ */

const MiniBarChart: React.FC<{ data: number[]; labels: string[] }> = ({ data, labels }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end justify-around gap-2 h-20 px-2">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-[9px] font-mono font-bold text-slate-400">{v}</span>
          <motion.div
            className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-cyan-500/40 to-cyan-400"
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
            style={{ minHeight: v > 0 ? '4px' : '0' }}
          />
          <span className="text-[8px] font-mono text-slate-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Mini Donut Chart — SVG circle with stroke-dasharray animation
   ═══════════════════════════════════════════════════════════════════════════ */

const MiniDonutChart: React.FC<{ segments: { label: string; value: number; color: string }[] }> = ({ segments }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = 28, circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="w-20 h-20 shrink-0">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const circle = (
            <motion.circle
              key={i}
              cx="40" cy="40" r={radius}
              fill="none" stroke={seg.color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              transform="rotate(-90 40 40)"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - dash }}
              transition={{ delay: 0.3 + i * 0.2, duration: 0.8, ease: 'easeOut' }}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="40" y="44" textAnchor="middle" className="fill-white text-[10px] font-black">{total}</text>
      </svg>
      <div className="space-y-1 flex-1 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-slate-400 truncate flex-1">{seg.label}</span>
            <span className="font-bold text-white">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. TaskProgressRing — SVG circular progress for task cards
   ═══════════════════════════════════════════════════════════════════════════ */

export const TaskProgressRing: React.FC<{ status: string; size?: number }> = ({ status, size = 36 }) => {
  const progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : status === 'assigned' || status === 'pending' ? 15 : 0;
  const color = status === 'completed' ? '#34d399' : status === 'in_progress' ? '#22d3ee' : status === 'assigned' || status === 'pending' ? '#fbbf24' : '#64748b';
  const radius = 14, circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 36 36" className="shrink-0" style={{ width: size, height: size }}>
      <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <motion.circle
        cx="18" cy="18" r={radius}
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="21" textAnchor="middle" className="fill-white text-[7px] font-black">{progress}%</text>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. SkillBreakdown — per-subject proficiency bars
   ═══════════════════════════════════════════════════════════════════════════ */

const SUBJECT_META: { match: string; label: string; color: string; icon: string }[] = [
  { match: 'physic', label: 'Physics', color: '#818cf8', icon: '⚛' },
  { match: 'chemist', label: 'Chemistry', color: '#34d399', icon: '⚗' },
  { match: 'biolog', label: 'Biology', color: '#fbbf24', icon: '🧬' },
  { match: 'math', label: 'Math', color: '#f472b6', icon: '∑' },
  { match: 'ict', label: 'ICT', color: '#22d3ee', icon: '💻' },
];

export const SkillBreakdown: React.FC<{ tasks: AnalyticsTask[]; loading?: boolean }> = ({ tasks, loading }) => {
  const skills = useMemo(() => {
    const map: Record<string, { count: number; earnings: number; completed: number }> = {};
    tasks.forEach((t) => {
      const subj = t.subject || '';
      const meta = SUBJECT_META.find((m) => subj.toLowerCase().includes(m.match)) || { label: 'Other', color: '#94a3b8' };
      const key = meta.label;
      if (!map[key]) map[key] = { count: 0, earnings: 0, completed: 0 };
      map[key].count++;
      map[key].earnings += t.earnings;
      if (t.status === 'completed') map[key].completed++;
    });
    const maxCount = Math.max(...Object.values(map).map((v) => v.count), 1);
    return SUBJECT_META
      .map((meta) => ({ ...meta, ...(map[meta.label] || { count: 0, earnings: 0, completed: 0 }) }))
      .concat([{ match: '', label: 'Other', color: '#94a3b8', icon: '◯', count: map['Other']?.count || 0, earnings: map['Other']?.earnings || 0, completed: map['Other']?.completed || 0 }])
      .filter((s) => s.count > 0)
      .map((s) => ({ ...s, proficiency: (s.count / maxCount) * 100 }));
  }, [tasks]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-slate-900/40 border border-white/[0.06] animate-pulse" />;
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Award className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-sm font-black text-white tracking-tight">Skill Breakdown</h2>
      </div>

      {skills.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No subject data yet.</p>
      ) : (
        <div className="space-y-3">
          {skills.map((skill, i) => (
            <div key={skill.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{skill.icon}</span>
                  <span className="text-xs font-bold text-slate-200 truncate">{skill.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                  <span className="text-slate-500">{skill.count} tasks</span>
                  <span className="text-emerald-400 font-bold">{fmtBDT(skill.earnings)}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${skill.color}80, ${skill.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.proficiency}%` }}
                  transition={{ delay: i * 0.1, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   4. EarningsForecast — projected earnings + 90-day area chart
   ═══════════════════════════════════════════════════════════════════════════ */

export const EarningsForecast: React.FC<{ tasks: AnalyticsTask[]; loading?: boolean }> = ({ tasks, loading }) => {
  const completed = tasks.filter((t) => t.status === 'completed');
  const totalEarnings = completed.reduce((s, t) => s + t.earnings, 0);
  const pendingEarnings = tasks
    .filter((t) => t.status === 'in_progress' || t.status === 'assigned' || t.status === 'pending')
    .reduce((s, t) => s + t.earnings, 0);

  // Daily average (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentEarnings = completed
    .filter((t) => t.completedAt && new Date(t.completedAt) >= thirtyDaysAgo)
    .reduce((s, t) => s + t.earnings, 0);
  const dailyAvg = recentEarnings / 30;
  const monthProjection = dailyAvg * 30;

  // 90-day forecast data (extend trend)
  const forecastData = useMemo(() => {
    const data: number[] = [];
    const past90 = Array(90).fill(0);
    completed.forEach((t) => {
      if (!t.completedAt) return;
      const daysAgo = Math.floor((now.getTime() - new Date(t.completedAt).getTime()) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 90) past90[89 - daysAgo] += t.earnings;
    });
    // Cumulative
    let cumulative = 0;
    const cumData = past90.map((v) => { cumulative += v; return cumulative; });
    // Project next 30 days
    const projection = [...cumData];
    const lastVal = cumData[cumData.length - 1] || 0;
    for (let i = 1; i <= 30; i++) {
      projection.push(lastVal + dailyAvg * i);
    }
    return projection;
  }, [completed, dailyAvg]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-slate-900/40 border border-white/[0.06] animate-pulse" />;
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <DollarSign className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-sm font-black text-white tracking-tight">Earnings Forecast</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Total Earned</p>
          <p className="text-base sm:text-lg font-black text-emerald-400">{fmtBDT(totalEarnings)}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Pending</p>
          <p className="text-base sm:text-lg font-black text-amber-400">{fmtBDT(pendingEarnings)}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Month Projection</p>
          <p className="text-base sm:text-lg font-black text-cyan-400">{fmtBDT(monthProjection)}</p>
        </div>
      </div>

      {/* 90-day chart */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">90-Day Cumulative + 30-Day Forecast</span>
        </div>
        <ForecastChart data={forecastData} splitPoint={90} />
      </div>

      <div className="flex items-center gap-4 text-[9px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-emerald-400" />
          <span className="text-slate-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded-full bg-cyan-400/50" style={{ borderTop: '1px dashed #22d3ee' }} />
          <span className="text-slate-500">Forecast</span>
        </div>
        <div className="ml-auto text-slate-500">
          Daily avg: <span className="text-cyan-400 font-bold">{fmtBDT(dailyAvg)}</span>
        </div>
      </div>
    </div>
  );
};

const ForecastChart: React.FC<{ data: number[]; splitPoint: number }> = ({ data, splitPoint }) => {
  const width = 400, height = 100, padding = 6;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (v / max) * (height - padding * 2),
  }));
  const actualPath = points.slice(0, splitPoint).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const forecastPath = points.slice(splitPoint - 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const actualArea = `${actualPath} L ${points[splitPoint - 1]?.x} ${height - padding} L ${points[0]?.x} ${height - padding} Z`;
  const splitX = points[splitPoint - 1]?.x || width;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
      <defs>
        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={actualArea} fill="url(#forecastGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} />
      <motion.path
        d={actualPath} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.path
        d={forecastPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.5, duration: 0.8, ease: 'easeInOut' }}
      />
      <line x1={splitX} y1={padding} x2={splitX} y2={height - padding} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
};
