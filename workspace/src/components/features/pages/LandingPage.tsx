'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '@/components/features/Logo';

interface BannerConfig {
  enabled: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  size: 'sm' | 'md' | 'lg';
}

interface LandingPageProps {
  onEnter: () => void;
  isAuthenticated: boolean;
  onGoToDashboard: () => void;
  subjects?: any[];
  bannerConfig?: BannerConfig;
  folders?: any[];
  announcements?: any[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  isAuthenticated,
  onGoToDashboard,
  subjects = [],
  folders = [],
  announcements = [],
  bannerConfig,
}) => {
  // Compute dynamic contextual statistics
  const physicsCount = folders.filter(f => f.subjectId === 'sub-physics' || f.subjectId?.toLowerCase().includes('phys')).length || 6;
  const biologyCount = folders.filter(f => f.subjectId === 'sub-biology' || f.subjectId?.toLowerCase().includes('bio')).length || 8;
  const totalLabSheets = folders.length || 14;

  return (
    <div
      id="landing_page_container"
      className="w-full min-h-screen text-slate-200 bg-[#060814] relative font-sans flex flex-col justify-between overflow-y-auto overflow-x-hidden scroll-smooth selection:bg-cyan-500/20 selection:text-cyan-300"
    >
      {/* Premium ambient space backdrops */}
      <div className="absolute top-[-10%] left-[-15%] w-[80%] h-[70%] rounded-full bg-gradient-to-br from-cyan-950/20 to-indigo-950/15 blur-[160px] pointer-events-none select-none" />
      <div className="absolute bottom-[5%] right-[-15%] w-[80%] h-[70%] rounded-full bg-gradient-to-tr from-indigo-950/15 to-purple-950/15 blur-[160px] pointer-events-none select-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_52%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Top Banner — customizable by super admin */}
      {bannerConfig?.enabled !== false && (
        <div
          className="relative z-20 w-full border-b py-2.5 text-center px-4"
          style={{
            backgroundColor: bannerConfig?.bgColor || 'rgba(8, 47, 73, 0.4)',
            borderColor: 'rgba(6, 182, 212, 0.1)',
          }}
        >
          <span
            className={`inline-flex flex-wrap items-center justify-center gap-2 font-mono uppercase tracking-wider font-extrabold ${
              bannerConfig?.size === 'lg' ? 'text-sm md:text-base' :
              bannerConfig?.size === 'sm' ? 'text-[9px]' :
              'text-[10px] md:text-xs'
            }`}
            style={{ color: bannerConfig?.textColor || '#22d3ee' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: bannerConfig?.textColor || '#22d3ee' }} />
            {bannerConfig?.text || '⭐ 2026 Bangladesh National Board Curriculum Standards Fully Integrated for HSC Candidates'}
          </span>
        </div>
      )}

      {/* Top Header */}
      <header id="landing_header" className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size="lg" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <button
              onClick={onGoToDashboard}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-white tracking-wide transition-all cursor-pointer shadow-sm flex items-center gap-1.5 min-h-[40px]"
            >
              <Layout className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          ) : (
            <button
              onClick={onEnter}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black tracking-wider uppercase transition-all cursor-pointer shadow-md shadow-cyan-500/10 min-h-[40px]"
            >
              Enter Portal
            </button>
          )}
        </div>
      </header>

      {/* Hero Body */}
      <main id="landing_hero" className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-16 text-center flex-1 flex flex-col justify-center items-center space-y-10 sm:space-y-12">
        <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.15em] font-black shadow-lg"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span>EXCELLENCE IN HSC SCIENCE SCHOLASTIC PREPARATION</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-white leading-tight sm:leading-tight text-center"
          >
            Secure Your Perfect Score in <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 text-transparent bg-clip-text filter drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              Science Practical Board Exams
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-slate-400 text-xs sm:text-sm md:text-[13.5px] max-w-2xl mx-auto leading-relaxed font-sans font-medium text-center"
          >
            A pristine educational guide customized for Higher Secondary Certificate science candidates in Bangladesh. Learn the exact experimental procedures, trace scientific calculation parameters, and analyze handwritten lab records instantly.
          </motion.p>
        </div>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="w-full max-w-md px-4 flex flex-col items-center gap-4"
        >
          {isAuthenticated ? (
            <button
              id="cta_dashboard_btn"
              onClick={onGoToDashboard}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-sans text-xs sm:text-[13px] font-extrabold tracking-wider uppercase shadow-[0_10px_25px_rgba(6,182,212,0.25)] hover:shadow-[0_14px_32px_rgba(6,182,212,0.4)] transition-all duration-300 flex items-center justify-center gap-2 border border-white/10 group cursor-pointer min-h-[48px]"
            >
              <Layout className="w-4 h-4 text-slate-950 shrink-0" />
              <span>ACCESS REVISION WORKSPACE</span>
              <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          ) : (
            <button
              id="cta_authenticate_btn"
              onClick={onEnter}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-sans text-xs sm:text-[13px] font-extrabold tracking-wider uppercase shadow-[0_10px_25px_rgba(6,182,212,0.25)] hover:shadow-[0_14px_32px_rgba(6,182,212,0.4)] transition-all duration-300 flex items-center justify-center gap-2 border border-white/10 group cursor-pointer min-h-[48px]"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
              <span>LOG IN TO ACADEMIC CONSOLE</span>
              <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          )}
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.18em] font-extrabold flex items-center gap-2 text-center">
            <span className="w-1 h-1 rounded-full bg-emerald-500" /> REAL-TIME SYNCHRONIZATION • DRAFT AUTOSAVE
          </span>
        </motion.div>

        {/* Dynamic Contextual Statistics Counter banner */}
        <div id="stats_counter_banner" className="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1 backdrop-blur-md">
            <strong className="block text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{totalLabSheets}</strong>
            <span className="text-[8.5px] sm:text-[9px] text-slate-450 uppercase font-mono font-bold tracking-wider block">Lab Exp Modules</span>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1 backdrop-blur-md">
            <strong className="block text-xl sm:text-2xl font-black text-cyan-400 font-mono tracking-tight">{physicsCount}</strong>
            <span className="text-[8.5px] sm:text-[9px] text-slate-450 uppercase font-mono font-bold tracking-wider block">Physics Experiments</span>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1 backdrop-blur-md">
            <strong className="block text-xl sm:text-2xl font-black text-[#fbbf24] font-mono tracking-tight">{biologyCount}</strong>
            <span className="text-[8.5px] sm:text-[9px] text-slate-450 uppercase font-mono font-bold tracking-wider block">Biology Specimens</span>
          </div>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-1 backdrop-blur-md">
            <strong className="block text-xl sm:text-2xl font-black text-indigo-400 font-mono tracking-tight">3</strong>
            <span className="text-[8.5px] sm:text-[9px] text-slate-450 uppercase font-mono font-bold tracking-wider block">Drawing Specialists Online</span>
          </div>
        </div>

        {/* Live Classroom Bulletin Announcements Feed */}
        <div id="bulletin_announcements_section" className="w-full text-left pt-10 sm:pt-14 border-t border-white/[0.04] space-y-6 sm:space-y-8">
          <div className="text-center md:text-left space-y-1.5">
            <h2 className="text-base font-black uppercase text-white tracking-wider flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 block shrink-0" /> LIVE EDUCATOR NOTICE BOARD
            </h2>
            <p className="text-[11px] text-slate-500 max-w-xl">
              Recent circulars, schedule adjustments, and notice bulletins published live by senior administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {announcements && announcements.length > 0 ? (
              announcements.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-md flex flex-col justify-between gap-4 py-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 font-bold uppercase py-0.5 px-2 rounded-md border border-indigo-500/20 font-mono whitespace-nowrap">
                        Active bulletin
                      </span>
                      <span className="text-[9px] text-slate-550 font-mono flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-100 font-sans tracking-wide leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-[11.2px] text-slate-450 leading-relaxed line-clamp-4 font-sans">
                      {ann.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-500 gap-2 flex-wrap">
                    <span className="truncate">By: <strong className="text-slate-400">{ann.createdByName || "Faculty Host"}</strong></span>
                    {ann.deadline && <span className="text-amber-400 font-bold whitespace-nowrap">Due: {ann.deadline}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 p-8 rounded-2xl bg-slate-950/30 border border-slate-900 text-center">
                <p className="text-xs text-slate-550 italic font-medium font-sans">No active notices published on the central notice board.</p>
              </div>
            )}
          </div>
        </div>

        {/* Marketplace Illustrators Hub Card (Contextual Highlight) */}
        <div className="w-full pt-6">
          <div className="p-5 sm:p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-indigo-950/30 border border-indigo-500/15 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div className="space-y-2.5 max-w-xl w-full">
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                Stem Illustrator Marketplace
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight font-sans">Flawless lab drawing plates drawn for you</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                Skip the drawing anxiety. Commission veteran physical notebook illustrators to construct hand-shaded scientific drawings on high-grade sheet plates delivered securely. Select if you will deliver the book or have the artist purchase one for you.
              </p>
            </div>
            <button
              onClick={onEnter}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer shrink-0 w-full md:w-auto text-center min-h-[48px]"
            >
              Consult Sketch Artists
            </button>
          </div>
        </div>

        {/* Regulatory Examination Info */}
        <div className="w-full text-left pt-10 sm:pt-14 border-t border-white/[0.04] space-y-6 sm:space-y-8">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-base font-black uppercase text-white tracking-wider">
              📝 REGULATORY EXAMINATION ADVANTAGES
            </h2>
            <p className="text-[11px] text-slate-500 max-w-xl leading-relaxed">
              Learn how the HSC Practical Portal streamlines preparation to help you score the complete 25 marks on exam day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs leading-relaxed text-slate-400 font-sans font-medium">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                Are these guidelines aligned with national curricula?
              </h4>
              <p className="text-[11px] text-slate-400 pl-6">
                Yes. Every experiment, data observation sheet, and calculation formula strictly is cross-verified against current NCTB standards and board practical examination formats.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fbbf24] shrink-0" />
                How do I get my graphs and calculations checked?
              </h4>
              <p className="text-[11px] text-slate-400 pl-6">
                Our Gemini multimodal co-pilot allows you to photograph your handwritten data collections, and immediately highlights calculation mistakes, plotting errors, or scale discrepancies.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                How does the Sketch Artist service help?
              </h4>
              <p className="text-[11px] text-slate-400 pl-6">
                Drawing intricate anatomy tissues or optics pathways requires precision. You can safely assign targeted diagrams to expert illustrators who draft perfect pencil-shaded layouts delivered physical right inside your notebook.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Is this platform authenticated and secure?
              </h4>
              <p className="text-[11px] text-slate-400 pl-6">
                Completely. The student workspace, marketplace orders, and personal draft images are all protected under standard session encryption protocols, guaranteeing complete data privacy.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer id="landing_footer" className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-[0.14em] text-center">
        <span>© 2026 Bangladesh HSC Science Practical Portal • All Rights Reserved</span>
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>OFFICIALLY LINKED WITH STUDENT COMMUNITIES</span>
        </div>
      </footer>
    </div>
  );
};
