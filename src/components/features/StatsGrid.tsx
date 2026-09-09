'use client';

import React from 'react';
import {
  Users,
  BookOpen,
  FolderClosed,
  Image as ImageIcon,
  Database,
  Activity,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface StatsGridProps {
  stats: {
    // Fields from /api/stats response (no "Count" suffix)
    users?: number;
    subjects?: number;
    folders?: number;
    images?: number;
    artists?: number;
    announcements?: number;
    bookings?: number;
    portfolioItems?: number;
    chatMessages?: number;
    hireRequests?: number;
    // Legacy fields (kept for backward compat — no longer used)
    usersCount?: number;
    subjectsCount?: number;
    foldersCount?: number;
    imagesCount?: number;
    databaseType?: string;
    uptime?: number;
  } | null;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-white/5" />
        ))}
      </div>
    );
  }

  // Support both new API shape (users/subjects/folders/images) and legacy shape (usersCount/etc.)
  const users = stats.users ?? stats.usersCount ?? 0;
  const subjects = stats.subjects ?? stats.subjectsCount ?? 0;
  const folders = stats.folders ?? stats.foldersCount ?? 0;
  const images = stats.images ?? stats.imagesCount ?? 0;
  const databaseType = stats.databaseType || (typeof process !== 'undefined' && process.env.DATABASE_URL?.startsWith('postgres') ? 'PostgreSQL' : 'SQLite');

  const items = [
    {
      title: "Active Scholars",
      value: users,
      desc: "Verified students & researchers",
      badge: "LIVE ENROLLMENT",
      icon: Users,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10 border-sky-500/20",
      accentGrad: "from-sky-500/10 via-transparent to-transparent",
      laserColor: "via-sky-400/50",
      badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20"
    },
    {
      title: "Course Subjects",
      value: subjects,
      desc: "Distinct academic faculties",
      badge: "CORE CURRICULUM",
      icon: BookOpen,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      accentGrad: "from-emerald-500/10 via-transparent to-transparent",
      laserColor: "via-emerald-400/50",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Practical Folders",
      value: folders,
      desc: "Indexed lab experiment notebooks",
      badge: "VERIFIED LABS",
      icon: FolderClosed,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      accentGrad: "from-amber-500/10 via-transparent to-transparent",
      laserColor: "via-amber-400/50",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "Experiment Images",
      value: images,
      desc: "High-resolution diagram scans",
      badge: "100% BOARD STD",
      icon: ImageIcon,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
      accentGrad: "from-indigo-500/10 via-transparent to-transparent",
      laserColor: "via-indigo-400/50",
      badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <div
              key={idx}
              className="p-3 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden shadow-xl backdrop-blur-md flex flex-col justify-between"
            >
              {/* Top Laser Accent Line */}
              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${it.laserColor} to-transparent opacity-70 group-hover:opacity-100 transition-opacity`} />

              {/* Ambient Background Radial Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${it.accentGrad} blur-2xl pointer-events-none rounded-full`} />

              <div>
                <div className="flex items-start justify-between gap-1.5">
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider border ${it.badgeColor} flex items-center gap-1 min-w-0`}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse shrink-0" />
                    <span className="truncate">{it.badge}</span>
                  </span>
                  <div className={`p-1.5 sm:p-2.5 rounded-xl border ${it.iconBg} ${it.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-inner shrink-0`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>

                <div className="mt-3 sm:mt-4 space-y-0.5">
                  <div className="text-xl sm:text-3xl font-black text-white tracking-tight font-sans flex items-baseline gap-1.5 sm:gap-2">
                    <span className="truncate">{it.value}</span>
                    <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 font-mono shrink-0">units</span>
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                    {it.title}
                  </h4>
                </div>
              </div>

              <div className="pt-2.5 sm:pt-3 mt-2.5 sm:mt-3 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 gap-2 min-w-0">
                <span className="truncate font-sans">{it.desc}</span>
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      {/* System Engine Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 font-mono shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Storage & Query Engine:</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 text-[10px] shrink-0">
            {databaseType}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {stats.uptime !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">System Uptime: <strong className="text-emerald-300">{(stats.uptime / 60).toFixed(1)}m</strong></span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-300 font-semibold truncate">All Systems Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};
