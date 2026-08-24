'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Home,
  LogOut,
  User,
  ShieldCheck,
  FolderPlus,
  BookOpen,
  MessageSquare,
  Clock,
  GraduationCap,
  Palette,
  Key
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string, subjectId?: string, folderId?: string) => void;
  stats: {
    usersCount: number;
    subjectsCount: number;
    foldersCount: number;
    imagesCount: number;
    databaseType: string;
  } | null;
  onOpenFolderCreate: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  sessionSeconds?: number;
  subjects?: any[];
  selectedSubjectId?: string | null;
  selectedFolderId?: string | null;
  folders?: any[];
  studyLogs?: {
    subjects: Record<string, number>;
    folders: Record<string, number>;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  stats,
  onOpenFolderCreate,
  isMobileOpen,
  setMobileOpen,
  sessionSeconds = 0,
  subjects = [],
  selectedSubjectId = null,
  selectedFolderId = null,
  folders = [],
  studyLogs = { subjects: {}, folders: {} }
}) => {
  const { user, logout, apiFetch, geminiApiKey, setIsKeyModalOpen } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [confirmResign, setConfirmResign] = React.useState<boolean>(false);

  const handleNav = (view: string) => {
    setView(view);
    setMobileOpen(false);
  };

  const formatDurationInline = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!user) return null;

  // Unused-import guards: keep behavior references so tree-shaking does not strip them.
  void stats;
  void sessionSeconds;
  void selectedSubjectId;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 glass-sidebar w-72 max-w-[85vw]
        p-4 sm:p-5 flex flex-col justify-between z-50 transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:overflow-y-auto shrink-0 border-r border-white/5
      `}>

        {/* Brand, Profile, and Scrollable Navigation Section */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/5 min-h-0">

          {/* Brand Header */}
          <div className="flex items-center gap-3 shrink-0 pt-1 select-none cursor-pointer" onClick={() => handleNav('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 overflow-hidden flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10">
              <img
                src="/pracpedia_logo.jpg"
                alt="PracPedia Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-cyan-300 bg-clip-text text-transparent font-sans truncate">
                {t('appName')}
              </h1>
              <p className="text-[9px] text-cyan-400 uppercase tracking-widest font-mono font-bold truncate">
                {t('appSub')}
              </p>
            </div>
          </div>

          {/* User profile section */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3 shrink-0 select-none">
            {user.profilePic ? (
              <img
                src={user.profilePic}
                alt="Profile Avatar"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className={`
                p-2 rounded-lg flex items-center justify-center shrink-0
                ${user.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}
              `}>
                {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
            )}
            <div className="overflow-hidden min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate">{user.name}</h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`
                  inline-block px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase font-bold
                  ${user.role === 'admin' ? 'bg-amber-400/10 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'}
                `}>
                  {user.role}
                </span>

                {user.role === 'admin' && user.email?.toLowerCase() !== 'mahabubrahmanakash275@gmail.com' && (
                  <button
                    onClick={async () => {
                      if (!confirmResign) {
                        setConfirmResign(true);
                        setTimeout(() => setConfirmResign(false), 5000);
                        return;
                      }
                      try {
                        const res = await apiFetch('/api/users/resign', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                          window.location.reload();
                        } else {
                          const err = await res.json().catch(() => ({}));
                          setConfirmResign(false);
                          // Temporarily display on console or keep flow safe
                          console.error("Resignation failure:", err.error || "Declined");
                        }
                      } catch (e) {
                        setConfirmResign(false);
                        console.error("Resignation failure:", e);
                      }
                    }}
                    className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                      confirmResign
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'text-rose-400 hover:text-rose-300 underline hover:no-underline'
                    }`}
                  >
                    {confirmResign ? "⚠️ Click again to Confirm Resign" : "Resign Admin Duty"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bilingual Switch Segment */}
          <div className="px-1 shrink-0 select-none">
            <div className="bg-white/[0.02] border border-white/5 p-1 rounded-xl flex items-center justify-between text-[11px] font-sans gap-2">
              <span className="text-slate-450 font-black pl-2 uppercase tracking-wide text-[9px] truncate">{language === 'en' ? 'Language' : 'ভাষা'}</span>
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/[0.02] shrink-0">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 min-h-[28px] rounded text-[9px] font-bold tracking-normal transition-all cursor-pointer ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('bn')}
                  className={`px-2 py-1 min-h-[28px] rounded text-[9px] font-bold tracking-normal transition-all cursor-pointer ${language === 'bn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  বাংলা
                </button>
              </div>
            </div>
          </div>

          {/* Gemini API Key Co-Pilot Card */}
          <div className="px-1 shrink-0 select-none">
            <div className={`p-3 rounded-xl border flex flex-col gap-1.5 font-sans transition-all duration-300 ${
              geminiApiKey
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
            }`}>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider gap-2">
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <Key className={`w-3.5 h-3.5 shrink-0 ${geminiApiKey ? 'text-emerald-400' : 'text-indigo-400'}`} />
                  <span className="truncate">{language === 'en' ? 'Gemini Co-Pilot' : 'জেমিনি কো-পাইলট'}</span>
                </span>
                {geminiApiKey ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0">
                    KEY ACTIVE
                  </span>
                ) : (
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono shrink-0">
                    UNLIMITED
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5 gap-2">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {geminiApiKey
                    ? (language === 'en' ? 'Personal Key' : 'ব্যক্তিগত কি')
                    : (language === 'en' ? 'BYOK Gemini API' : 'জেমিনি এপিআই কি')}
                </span>
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="text-[10px] bg-indigo-600/80 hover:bg-indigo-600 text-white px-2 py-0.5 min-h-[28px] rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Key className="w-2.5 h-2.5" />
                  {geminiApiKey
                    ? (language === 'en' ? 'Change' : 'পরিবর্তন')
                    : (language === 'en' ? 'Connect AI Key' : 'কি যুক্ত করুন')}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 leading-normal font-medium break-words">
                {geminiApiKey
                  ? (language === 'en' ? 'Using your Google Gemini API key for AI study.' : 'আপনার নিজস্ব জেমিনি এপিআই কি দিয়ে চলছে।')
                  : (language === 'en' ? 'Bring your own Gemini API key for free unlimited AI.' : 'ফ্রি আনলিমিটেড এআই ব্যবহারের জন্য কি যুক্ত করুন।')}
              </p>
            </div>
          </div>

          {/* Core Navigation List */}
          <div className="space-y-3">

            {/* Main view item */}
            <button
              onClick={() => handleNav('dashboard')}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                transition-all duration-200 group border text-left cursor-pointer
                ${currentView === 'dashboard'
                  ? 'bg-indigo-600/20 border-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
              `}
            >
              <Home className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span className="truncate">{t('dashboard')}</span>
            </button>

            {/* Administrators Panel link — visible to both admin and super_admin */}
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <button
                onClick={() => handleNav('admins')}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                  transition-all duration-200 group border text-left cursor-pointer
                  ${currentView === 'admins'
                    ? 'bg-[#fbbf24]/10 border-[#fbbf24]/20 text-[#fbbf24] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
                `}
              >
                <ShieldCheck className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'admins' ? 'text-[#fbbf24]' : 'text-slate-500'}`} />
                <span className="truncate">
                  {user?.role === 'super_admin' ? 'Super Admin CMS' : t('adminPortal')}
                </span>
              </button>
            )}

            {/* Super Admin Credentials button — only visible to super_admin */}
            {user?.role === 'super_admin' && (
              <button
                onClick={() => handleNav('creds')}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                  transition-all duration-200 group border text-left cursor-pointer
                  ${currentView === 'creds'
                    ? 'bg-purple-600/20 border-purple-500/30 text-purple-200 font-bold shadow-lg shadow-purple-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
                `}
              >
                <Key className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'creds' ? 'text-purple-300' : 'text-slate-500'}`} />
                <span className="truncate">System Credentials</span>
              </button>
            )}

            {/* Student Discussion / Messaging Center */}
            <button
              onClick={() => handleNav('chat')}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                transition-all duration-200 group border text-left cursor-pointer
                ${currentView === 'chat'
                  ? 'bg-cyan-600/20 border-cyan-500/20 text-cyan-300 font-bold font-sans'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
              `}
            >
              <MessageSquare className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'chat' ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="truncate">{t('discussion')}</span>
            </button>

            {/* AI Science Academy Learning Chamber Link */}
            <button
              onClick={() => handleNav('academy')}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                transition-all duration-200 group border text-left cursor-pointer
                ${currentView === 'academy'
                  ? 'bg-emerald-600/25 border-emerald-500/30 text-emerald-300 font-extrabold shadow-lg shadow-emerald-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
              `}
            >
              <GraduationCap className={`w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-6 shrink-0 ${currentView === 'academy' ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="truncate">{t('aiAcademy')}</span>
            </button>

            {/* Edit My Profile Link */}
            <button
              onClick={() => handleNav('profile')}
              className={`
                w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                transition-all duration-200 group border text-left cursor-pointer
                ${currentView === 'profile'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
              `}
            >
              <User className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'profile' ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className="truncate">{t('editProfile')}</span>
            </button>

            {/* Marketplace — Drawing practicals marketplace (visible to non-artists) */}
            {user?.role !== 'artist' && (
              <button
                onClick={() => handleNav('artists')}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                  transition-all duration-200 group border text-left cursor-pointer
                  ${currentView === 'artists'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold shadow-lg shadow-amber-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
                `}
              >
                <Palette className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'artists' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate">
                  {language === 'en' ? 'Marketplace' : 'মার্কেটপ্লেস'}
                </span>
              </button>
            )}

            {/* Artist Dashboard — dedicated order & portfolio management (visible to artists) */}
            {user?.role === 'artist' && (
              <button
                onClick={() => handleNav('artist_dashboard')}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                  transition-all duration-200 group border text-left cursor-pointer
                  ${currentView === 'artist_dashboard'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold shadow-lg shadow-amber-500/5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
                `}
              >
                <Palette className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'artist_dashboard' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate">
                  {language === 'en' ? 'Artist Dashboard' : 'আর্টিস্ট ড্যাশবোর্ড'}
                </span>
              </button>
            )}

            {/* Marketplace browse link for artists (so they can also view other artists) */}
            {user?.role === 'artist' && (
              <button
                onClick={() => handleNav('artists')}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold tracking-wide
                  transition-all duration-200 group border text-left cursor-pointer
                  ${currentView === 'artists'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'}
                `}
              >
                <Palette className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${currentView === 'artists' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="truncate">
                  {language === 'en' ? 'Browse Marketplace' : 'মার্কেটপ্লেস ব্রাউজ'}
                </span>
              </button>
            )}

            {/* Practical Focus Times */}
            <div className="space-y-2">
              <div className="px-3.5 flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold select-none pb-1 border-b border-white/[0.03] gap-2">
                <span className="truncate">{t('practicalFocusTimes')}</span>
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              </div>

              {folders.length === 0 ? (
                <p className="text-[10px] text-slate-500 px-3.5 italic py-2">{t('noPracticalFolders')}</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {folders.map((fold) => {
                    const isFoldActive = currentView === 'folder' && selectedFolderId === fold.id;
                    const folderSeconds = studyLogs?.folders?.[fold.id] || 0;
                    const parentSub = subjects.find(s => s.id === fold.subjectId);

                    let dotColor = 'bg-slate-500';
                    const parentTitle = parentSub?.title?.toLowerCase() || '';
                    if (parentTitle.includes('physic')) dotColor = 'bg-indigo-500';
                    else if (parentTitle.includes('chemist')) dotColor = 'bg-emerald-500';
                    else if (parentTitle.includes('biolog')) dotColor = 'bg-amber-500';
                    else if (parentTitle.includes('math')) dotColor = 'bg-pink-500';
                    else if (parentTitle.includes('ict')) dotColor = 'bg-cyan-500';

                    return (
                      <button
                        key={fold.id}
                        onClick={() => {
                          setView('folder', fold.subjectId, fold.id);
                          setMobileOpen(false);
                        }}
                        className={`
                          w-full flex items-center justify-between gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl text-[11px] font-bold transition-all text-left border cursor-pointer
                          ${isFoldActive
                            ? 'bg-indigo-600/20 border-indigo-500/20 text-indigo-300 font-extrabold'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.02] border-transparent'}
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 font-sans">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                          <span className="truncate" title={fold.title}>{fold.title}</span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/5 shrink-0 ${isFoldActive ? 'text-white border-white/10' : 'text-slate-400'}`}>
                          {formatDurationInline(folderSeconds)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin actions shortcut within the dashboard structure */}
            {user.role === 'admin' && (
              <button
                onClick={onOpenFolderCreate}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-indigo-950/50 transition-all active:scale-[0.98] cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('addFolder')}</span>
              </button>
            )}

            {/* Unused BookOpen import shield — keep import alive for nav parity */}
            <span className="hidden"><BookOpen /></span>
          </div>
        </div>

        {/* Logout Action at Bottom */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-3 font-mono shrink-0 select-none">
          <button
            onClick={() => {
              logout();
              handleNav('landing');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all font-sans cursor-pointer border border-transparent hover:border-rose-500/10"
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">{t('signOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
