'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeLocalStorage } from '@/lib/storage';
import { LandingPage } from '@/components/features/pages/LandingPage';
import { AuthPage } from '@/components/features/pages/AuthPage';
import { Sidebar } from '@/components/features/Sidebar';
import { Logo } from '@/components/features/Logo';
import { StatsGrid } from '@/components/features/StatsGrid';
import { Lightbox } from '@/components/features/Lightbox';
import { FolderModal } from '@/components/features/FolderModal';
import { UploadModal } from '@/components/features/UploadModal';
import { DataLoader } from '@/components/features/DataLoader';
import { ClassroomDiscussion } from '@/components/features/ClassroomDiscussion';
import { AiAcademyRoom } from '@/components/features/AiAcademyRoom';
import { ConfirmModal } from '@/components/features/ConfirmModal';
import { GsapStudentCounter } from '@/components/features/GsapStudentCounter';
import { ProfilePage } from '@/components/features/pages/ProfilePage';
import { ArtistsPage } from '@/components/features/pages/ArtistsPage';
import { PublicMarketplace } from '@/components/features/pages/PublicMarketplace';
import { AdminCmsPage } from '@/components/features/pages/AdminCmsPage';
import { ArtistDashboard } from '@/components/features/pages/ArtistDashboard';
import { BookingsPage } from '@/components/features/pages/BookingsPage';
import { CredentialsView } from '@/components/features/pages/CredentialsView';
import { GeminiKeyModal } from '@/components/features/GeminiKeyModal';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';

import {
  FolderClosed,
  ChevronRight,
  Search,
  Plus,
  Trash2,
  Calendar,
  FileText,
  ArrowLeft,
  Compass,
  BookOpen,
  Database,
  Menu,
  X,
  FileImage,
  Layers,
  Edit3,
  ShieldCheck,
  Award,
  Eye,
  Settings,
  Sparkles,
  Loader2,
  Bell,
  LayoutGrid,
  List
} from 'lucide-react';

interface SubjectType {
  id: string;
  _id?: string;
  title: string;
  description: string;
}

interface ImageType {
  url: string;
  title: string;
}

interface FolderType {
  id: string;
  _id?: string;
  subjectId: string;
  title: string;
  description: string;
  images: ImageType[];
  createdAt: string;
}

export interface AnnouncementType {
  id: string;
  _id?: string;
  title: string;
  content: string;
  deadline?: string;
  createdAt: string;
  createdByName: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number;
  targetUserId?: string | null;
}

type ViewState = 'landing' | 'auth' | 'dashboard' | 'subject' | 'folder' | 'admins' | 'chat' | 'academy' | 'profile' | 'artists' | 'artist_dashboard' | 'creds' | 'bookings';

// Unused-import guards: preserve original API surface so tree-shaking does not strip
// icons/components referenced by the original Vite file (kept for behavioral parity).
void FileText;
void Database;
void Layers;
void ShieldCheck;
void Award;
void Settings;
void Sparkles;
void GsapStudentCounter;

function PortalConsole() {
  const { user, apiFetch, updateUserStudyTime, setUser } = useAuth();

  // Active App Theme State
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    return safeLocalStorage.getItem('app_theme') || 'default';
  });

  // Sync theme changes to localStorage
  useEffect(() => {
    safeLocalStorage.setItem('app_theme', activeTheme);
  }, [activeTheme]);

  // Navigation View states
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const saved = safeLocalStorage.getItem('app_current_view');
    if (saved && ['landing', 'auth', 'dashboard', 'subject', 'folder', 'admins', 'chat', 'academy', 'profile', 'artists', 'artist_dashboard', 'creds', 'bookings'].includes(saved)) {
      return saved as ViewState;
    }
    return 'dashboard';
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedView = safeLocalStorage.getItem('app_current_view');
    if (savedView === 'subject' || savedView === 'folder') {
      return safeLocalStorage.getItem('app_selected_subject_id');
    }
    return null;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const savedView = safeLocalStorage.getItem('app_current_view');
    if (savedView === 'folder') {
      return safeLocalStorage.getItem('app_selected_folder_id');
    }
    return null;
  });

  // Sync state parameters to localStorage for reload integrity
  useEffect(() => {
    safeLocalStorage.setItem('app_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (selectedSubjectId) {
      safeLocalStorage.setItem('app_selected_subject_id', selectedSubjectId);
    } else {
      safeLocalStorage.removeItem('app_selected_subject_id');
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    if (selectedFolderId) {
      safeLocalStorage.setItem('app_selected_folder_id', selectedFolderId);
    } else {
      safeLocalStorage.removeItem('app_selected_folder_id');
    }
  }, [selectedFolderId]);

  // Loaded database state lists
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementType[]>([]);
  const [bannerConfig, setBannerConfig] = useState<any>(null);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDemoteId, setConfirmDemoteId] = useState<string | null>(null);

  // Refs to hold the latest values used inside the heartbeat interval —
  // keeps the effect from re-running on every state update and flooding
  // the track-time endpoint with concurrent requests.
  const foldersRef = useRef<FolderType[]>(folders);
  const currentViewRef = useRef<ViewState>(currentView);
  const selectedSubjectIdRef = useRef<string | null>(selectedSubjectId);
  const selectedFolderIdRef = useRef<string | null>(selectedFolderId);
  const userIdRef = useRef<string | undefined>(user?.id);

  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);
  useEffect(() => {
    selectedSubjectIdRef.current = selectedSubjectId;
  }, [selectedSubjectId]);
  useEffect(() => {
    selectedFolderIdRef.current = selectedFolderId;
  }, [selectedFolderId]);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Recently Viewed Folders timestamps state
  const [recentlyViewed, setRecentlyViewed] = useState<Record<string, number>>({});

  // Real-time live notifications list
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warning' }[]>([]);

  const addLiveNotification = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = 'notif-' + Date.now() + '-' + Math.random();
    setLiveNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setLiveNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  };

  // Administrators Panel Interactive State
  const [promoteEmail, setPromoteEmail] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceDeadline, setAnnounceDeadline] = useState('');
  const [adminPageSuccess, setAdminPageSuccess] = useState<string | null>(null);
  const [adminPageError, setAdminPageError] = useState<string | null>(null);

  // Student administration controls
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Overlay indicators
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Folder AI Analysis state
  const [isFolderAiModalOpen, setIsFolderAiModalOpen] = useState(false);
  const [folderAiMode, setFolderAiMode] = useState<'explain' | 'qa'>('explain');
  const [folderAiQuestion, setFolderAiQuestion] = useState('');
  const [folderAiResult, setFolderAiResult] = useState<string | null>(null);
  const [folderAiLoading, setFolderAiLoading] = useState(false);
  const [folderAiError, setFolderAiError] = useState<string | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'list'>('grid');
  const [editFolderData, setEditFolderData] = useState<any>(null);

  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteImageIndex, setConfirmDeleteImageIndex] = useState<number | null>(null);
  const [confirmDeleteAnnouncementId, setConfirmDeleteAnnouncementId] = useState<string | null>(null);

  // Session hours tracking locally and through cloud endpoints
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Track study logs by subject and folder
  const [studyLogs, setStudyLogs] = useState<{
    subjects: Record<string, number>;
    folders: Record<string, number>;
  }>({ subjects: {}, folders: {} });

  useEffect(() => {
    // BD time clock removed — no longer needed
  }, []);

  // Load study logs on mount/user change
  useEffect(() => {
    if (!user) {
      const storedRecent = safeLocalStorage.getItem('png_recent_views_guest');
      if (storedRecent) {
        try {
          setRecentlyViewed(JSON.parse(storedRecent));
        } catch (err) {
          console.error("Invalid guest recent views in safeLocalStorage", err);
        }
      } else {
        setRecentlyViewed({});
      }
      return;
    }
    const storedLogs = safeLocalStorage.getItem(`png_study_logs_${user.id}`);
    if (storedLogs) {
      try {
        setStudyLogs(JSON.parse(storedLogs));
      } catch (err) {
        console.error("Invalid study logs in safeLocalStorage", err);
      }
    } else {
      setStudyLogs({ subjects: {}, folders: {} });
    }

    const storedRecent = safeLocalStorage.getItem(`png_recent_views_${user.id}`);
    if (storedRecent) {
      try {
        setRecentlyViewed(JSON.parse(storedRecent));
      } catch (err) {
        console.error("Invalid user recent views in safeLocalStorage", err);
      }
    } else {
      setRecentlyViewed({});
    }
  }, [user?.id]);

  // Trigger GSAP stagger reveals whenever the view or loading state changes
  useEffect(() => {
    if (isLoading) return;

    const ctx = gsap.context(() => {
      // 1. Reveal page headings (only if any exist on this view)
      if (document.querySelectorAll(".reveal-header").length > 0) {
        gsap.fromTo(".reveal-header",
          { opacity: 0, y: -20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "power2.out" }
        );
      }

      // 2. Beautiful slide-up staggered intro for all cards
      if (document.querySelectorAll(".stagger-card").length > 0) {
        gsap.fromTo(".stagger-card",
          { opacity: 0, y: 35, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.75,
            stagger: 0.06,
            ease: "back.out(1.15)",
            clearProps: "transform,opacity"
          }
        );
      }
    });

    return () => ctx.revert();
  }, [currentView, selectedSubjectId, selectedFolderId, isLoading]);

  useEffect(() => {
    if (!user) return;
    const ticker = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);

      // Track subject time (read latest values from refs to avoid stale closures)
      const cv = currentViewRef.current;
      const sid = selectedSubjectIdRef.current;
      const fid = selectedFolderIdRef.current;
      const uid = userIdRef.current;
      const flds = foldersRef.current;

      if (cv === 'subject' && sid) {
        setStudyLogs((prev) => {
          const updated = {
            ...prev,
            subjects: {
              ...prev.subjects,
              [sid]: (prev.subjects[sid] || 0) + 1
            }
          };
          if (uid) safeLocalStorage.setItem(`png_study_logs_${uid}`, JSON.stringify(updated));
          return updated;
        });
      }

      // Track folder time
      if (cv === 'folder' && fid) {
        setStudyLogs((prev) => {
          const updated = {
            ...prev,
            folders: {
              ...prev.folders,
              [fid]: (prev.folders[fid] || 0) + 1
            }
          };
          // Also set the parent subject's time if we can resolve it
          const folderObj = flds.find(f => f.id === fid);
          if (folderObj && folderObj.subjectId) {
            updated.subjects = {
              ...updated.subjects,
              [folderObj.subjectId]: (updated.subjects[folderObj.subjectId] || 0) + 1
            };
          }
          if (uid) safeLocalStorage.setItem(`png_study_logs_${uid}`, JSON.stringify(updated));
          return updated;
        });
      }
    }, 1000);

    const syncSeconds = setInterval(async () => {
      try {
        const res = await apiFetch('/api/auth/track-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds: 15 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.studyTime === 'number') {
            updateUserStudyTime(data.studyTime);
          }
        }
      } catch (err) {
        // Silent — heartbeat failures are normal (network blips, dev HMR
        // restarts). The bug monitor already catches persistent 5xx via
        // apiFetch, so we don't need to log every transient failure here.
        void err;
      }
    }, 15050);

    return () => {
      clearInterval(ticker);
      clearInterval(syncSeconds);
    };
  }, [user?.id]);

  // Fetch full system context
  // NOTE: Does NOT set isLoading=true on refresh — only the initial load
  // sets isLoading. Setting it on every refresh causes the loading screen
  // to flash + triggers the forceLoaded/SSR auto-reload timeouts, which
  // reload the page and wipe all user state (AI answers, chat, etc.).
  //
  // Each fetch is given a 5s AbortController so a hung network call can't
  // keep the SYNCHRONIZING loader stuck — the finally block always runs.
  const refreshWorkspaceData = async () => {

    // start



// by gemini
//     const fetchWithTimeout = async (url: string, opts: RequestInit = {}) => {
//   const ctrl = new AbortController();
  
//   // 1. Pass a DOMException reason to abort() so Next.js/browsers understand it
//   const t = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'AbortError')), 6000);
  
//   try {
//     return await apiFetch(url, { ...opts, signal: ctrl.signal });
//   } finally {
//     // 2. Clear the timeout to prevent it from firing if the fetch succeeds early
//     clearTimeout(t);
//   }
// };
// by gemini




// by glm
const fetchWithTimeout = async (url: string, opts: RequestInit = {}): Promise<Response> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    return await apiFetch(url, { ...opts, signal: ctrl.signal });
  } catch (err: any) {
    // AbortError is expected when the 5s timeout fires — silently swallow it
    // and return a synthetic 504 response so callers can just check res.ok.
    // This prevents "AbortError: signal is aborted without reason" from
    // cluttering the browser console.
    if (err?.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'timeout' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Other network errors (DNS, connection refused) — also return a synthetic
    // response so the outer try/catch isn't triggered. apiFetch already
    // reported the error to client-error-capture, so we don't log again.
    return new Response(JSON.stringify({ error: 'network' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(t);
  }
};
// by glm





// end


    try {
      // Fetch subjects
      const subRes = await fetchWithTimeout('/api/subjects');
      const subData = await subRes.json().catch(() => []);
      setSubjects(Array.isArray(subData) ? subData.map((s: any) => ({ ...s, id: s.id || s._id })) : []);

      // Fetch folder registries
      const fRes = await fetchWithTimeout('/api/folders');
      const fData = await fRes.json().catch(() => []);
      setFolders(Array.isArray(fData) ? fData.map((f: any) => ({ ...f, id: f.id || f._id })) : []);

      // Fetch announcements
      try {
        const annRes = await fetchWithTimeout('/api/announcements');
        if (annRes.ok) {
          const annData = await annRes.json().catch(() => []);
          setAnnouncements(Array.isArray(annData) ? annData.map((a: any) => ({ ...a, id: a.id || a._id })) : []);
        }
      } catch (annErr) {
        console.error("Could not load announcements: ", annErr);
      }

      // Fetch banner config
      try {
        const bannerRes = await fetchWithTimeout('/api/settings/banner');
        if (bannerRes.ok) {
          setBannerConfig(await bannerRes.json().catch(() => ({})));
        }
      } catch {
        // defaults will be used
      }

      // Fetch admin directory list
      try {
        const admRes = await fetchWithTimeout('/api/users/admins');
        if (admRes.ok) {
          const admData = await admRes.json().catch(() => []);
          setAdminsList(Array.isArray(admData) ? admData.map((u: any) => ({ ...u, id: u.id || u._id })) : []);
        }
      } catch (admErr) {
        console.error("Could not load admin directory: ", admErr);
      }

      // Fetch statistics telemetry
      const statRes = await fetchWithTimeout('/api/stats');
      const statData = await statRes.json().catch(() => ({}));
      setStats(statData && typeof statData === 'object' ? statData : {});

      // Fetch students list if user is an Administrator
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        try {
          const studRes = await fetchWithTimeout('/api/users/students');
          if (studRes.ok) {
            const studData = await studRes.json().catch(() => []);
            setStudentsList(Array.isArray(studData) ? studData.map((s: any) => ({ ...s, id: s.id || s._id })) : []);
          }
        } catch (studErr) {
          console.error("Could not fetch students roster: ", studErr);
        }
      }
    } catch (err) {
      console.error("Workspace datalink could not be completed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshWorkspaceData();
    }
    // Safety timeout — if the initial data load takes more than 6s
    // (e.g., Neon cold start, slow network), force-hide the SYNCHRONIZING
    // loader so the user is never stuck. The dashboard can keep loading
    // data in the background; UI shell renders immediately after 6s.
    const timeout = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(timeout);
  }, [user?.id]);

  // Live workspace refresh — replaces a broken WebSocket client that was
  // trying to connect to a non-existent /ws endpoint (no WebSocket server
  // exists in Next.js dev/prod). The old code logged 4 messages every 4
  // seconds per reconnect attempt, flooding the browser console.
  //
  // We now use a lightweight 30s polling interval for workspace refresh.
  // Real-time chat already uses long-polling in ClassroomDiscussion.tsx,
  // so no feature is lost.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;
      try {
        await refreshWorkspaceData();
      } catch (err) {
        // Silent — refresh failures already log to the bug monitor via apiFetch
        void err;
      }
    };

    // Initial refresh on mount, then every 30s
    refresh();
    const interval = setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Relative view distance helper for 'Recently Viewed' label
  const getRecentlyViewedMsg = (folderId: string) => {
    const timestamp = recentlyViewed[folderId];
    if (!timestamp) return null;
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Styling maps assigning specific neon highlights to different academic sectors
  const getSubjectMeta = (title: string) => {
    const norm = title.toLowerCase();
    if (norm.includes('physic')) {
      return {
        grad: "from-[#6366f1] to-[#4f46e5]",
        border: "hover:border-[#6366f1]/50 shadow-[#6366f1]/5",
        text: "text-[#818cf8]",
        bg: "bg-[#6366f1]/10",
        desc: "Waves, mechanics, and thermodynamic formulas."
      };
    } else if (norm.includes('chemist')) {
      return {
        grad: "from-[#10b981] to-[#059669]",
        border: "hover:border-[#10b981]/50 shadow-[#10b981]/5",
        text: "text-[#34d399]",
        bg: "bg-[#10b981]/10",
        desc: "Titrations, chemical reactions, and physical salt analyses."
      };
    } else if (norm.includes('biolog')) {
      return {
        grad: "from-[#84cc16] to-[#65a30d]",
        border: "hover:border-[#84cc16]/50 shadow-[#84cc16]/5",
        text: "text-[#a3e635]",
        bg: "bg-[#84cc16]/10",
        desc: "Cell slides, dissection sketches, and taxonomy structures."
      };
    } else if (norm.includes('math')) {
      return {
        grad: "from-[#d946ef] to-[#c084fc]",
        border: "hover:border-[#d946ef]/50 shadow-[#d946ef]/5",
        text: "text-[#f472b6]",
        bg: "bg-[#d946ef]/10",
        desc: "Vectors, geometry functions, and coordinate calculus plots."
      };
    } else if (norm.includes('ict')) {
      return {
        grad: "from-[#06b6d4] to-[#0891b2]",
        border: "hover:border-[#06b6d4]/50 shadow-[#06b6d4]/5",
        text: "text-[#22d3ee]",
        bg: "bg-[#06b6d4]/10",
        desc: "HTML tables, truth tables, and server layout diagrams."
      };
    } else {
      return {
        grad: "from-slate-600 to-indigo-750",
        border: "hover:border-slate-500 shadow-slate-500/5",
        text: "text-slate-400",
        bg: "bg-slate-500/10",
        desc: "Advanced lecture collections and experimental notes."
      };
    }
  };

  // State Navigation Helper
  const setView = (view: string, subjectId?: string, folderId?: string) => {
    setSearchQuery('');
    // Admin CMS — allow both admin and super_admin
    if (view === 'admins' && user?.role !== 'admin' && user?.role !== 'super_admin') {
      return;
    }
    if (view === 'subject' && subjectId) {
      setSelectedSubjectId(subjectId);
      setSelectedFolderId(null);
    } else if (view === 'folder' && folderId) {
      setSelectedFolderId(folderId);
      const targetFolder = folders.find(f => f.id === folderId);
      if (targetFolder) {
        setSelectedSubjectId(targetFolder.subjectId);
      } else if (subjectId) {
        setSelectedSubjectId(subjectId);
      }
      // Save timestamp of opened folder in safeLocalStorage & update state
      const key = user ? `png_recent_views_${user.id}` : 'png_recent_views_guest';
      const now = Date.now();
      setRecentlyViewed((prev) => {
        const updated = { ...prev, [folderId]: now };
        safeLocalStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
    } else {
      setSelectedSubjectId(null);
      setSelectedFolderId(null);
    }
    setCurrentView(view as ViewState);
  };

  // API Mutators
  const handleSaveFolder = async (title: string, description: string, subjectId: string) => {
    try {
      if (editFolderData) {
        // Edit Folder details
        const res = await apiFetch(`/api/folders/${editFolderData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Could not apply edits to folder settings.");
        }
      } else {
        // Create new Folder metadata
        const res = await apiFetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, subjectId })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Could not initialize folder document.");
        }
      }
      setEditFolderData(null);
      await refreshWorkspaceData();
    } catch (err: any) {
      addLiveNotification(err.message || "Operation failed.", "warning");
      throw err;
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const res = await apiFetch(`/api/folders/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Folder document unlinking failed.");
      }

      setSelectedFolderId(null);
      setView('dashboard');
      await refreshWorkspaceData();
    } catch (err: any) {
      addLiveNotification(err.message || "Delete failed.", "warning");
      throw err;
    }
  };

  // Admin & Announcements Mutators
  const handlePromoteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPageSuccess(null);
    setAdminPageError(null);
    if (!promoteEmail.trim()) return;

    try {
      const res = await apiFetch('/api/users/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: promoteEmail })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        const errorMessage = textResponse.includes('Access forbidden')
          ? "Access forbidden. Only the main authorized administrator can promote users."
          : `Elevating rights failed with status ${res.status}.`;
        throw new Error(errorMessage);
      }

      if (!res.ok) {
        throw new Error(data.error || "Elevation could not be completed.");
      }
      setAdminPageSuccess(data.message || `Successfully elevated ${promoteEmail} to administrator.`);
      setPromoteEmail('');
      await refreshWorkspaceData();
    } catch (err: any) {
      setAdminPageError(err.message || "An unexpected error occurred during user elevation.");
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPageSuccess(null);
    setAdminPageError(null);
    if (!announceTitle.trim() || !announceContent.trim()) {
      setAdminPageError("Title and description content are required to issue an alert.");
      return;
    }

    try {
      const res = await apiFetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announceTitle,
          content: announceContent,
          deadline: announceDeadline
        })
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Could not publish internal notification alert.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Announcement registration could not be completed.");
      }
      setAdminPageSuccess("Successfully published practical submission deadline alert.");
      setAnnounceTitle('');
      setAnnounceContent('');
      setAnnounceDeadline('');
      await refreshWorkspaceData();
    } catch (err: any) {
      setAdminPageError(err.message || "Could not publish internal notification alert.");
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    setConfirmDeleteAnnouncementId(id);
  };

  const handleConfirmDeleteAnnouncement = async (id: string) => {
    setAdminPageSuccess(null);
    setAdminPageError(null);
    try {
      const res = await apiFetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Retraction could not be completed.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Retraction could not be completed.");
      }
      setAdminPageSuccess("Announcement successfully retracted and removed.");
      await refreshWorkspaceData();
    } catch (err: any) {
      setAdminPageError(err.message || "Retraction failed.");
    }
  };

  const handleAppendImage = async (url: string, titleStr: string) => {
    if (!selectedFolderId) return;
    try {
      const res = await apiFetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedFolderId,
          imageUrl: url,
          title: titleStr
        })
      });
      if (!res.ok) throw new Error("Uploading script page rejected.");
      await refreshWorkspaceData();
    } catch (err: any) {
      addLiveNotification(err.message || "Failed to add image.", "warning");
    }
  };

  const handleDeleteImage = (imgIndex: number) => {
    setConfirmDeleteImageIndex(imgIndex);
  };

  const handleConfirmDeleteImage = async (imgIndex: number) => {
    if (!selectedFolderId) return;
    try {
      const res = await apiFetch(`/api/images/${selectedFolderId}/${imgIndex}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Deletion rejected by api.");
      }
      await refreshWorkspaceData();
    } catch (err: any) {
      addLiveNotification(err.message || "Failed to delete image.", "warning");
    }
  };

  // Find active subject & active folder for display
  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const activeFolder = folders.find(f => f.id === selectedFolderId);

  // Filtered lists for the active viewing context
  const filteredFolders = folders.filter(f => f.subjectId === selectedSubjectId);

  // Search query filters for folders
  const searchedDashboardFolders = folders.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchedSubjectFolders = filteredFolders.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Preserve access to internal state mutators referenced by Sidebar / Admin CMS
  void setUser;
  void studentsList;
  void confirmDemoteId;
  void setConfirmDemoteId;
  void promoteEmail;
  void setPromoteEmail;
  void announceTitle;
  void setAnnounceTitle;
  void announceContent;
  void setAnnounceContent;
  void announceDeadline;
  void setAnnounceDeadline;
  void adminPageSuccess;
  void setAdminPageSuccess;
  void adminPageError;
  void setAdminPageError;
  void handlePromoteEmail;
  void handleCreateAnnouncement;

  return (
    <div className={`min-h-screen lg:min-h-0 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden text-slate-100 relative transition-all duration-300 ${
      activeTheme === 'peaceful-purple' ? 'theme-peaceful-purple' :
      activeTheme === 'deep-blue' ? 'theme-deep-blue' :
      activeTheme === 'cosmic-black' ? 'theme-cosmic-black' :
      activeTheme === 'mesh-aurora' ? 'theme-mesh-aurora' :
      activeTheme === 'emerald-green' ? 'theme-emerald-green' :
      activeTheme === 'botanic-green' ? 'theme-botanic-green' :
      activeTheme === 'saffron-gold' ? 'theme-saffron-gold' :
      activeTheme === 'royal-purple' ? 'theme-royal-purple' :
      activeTheme === 'crimson-red' ? 'theme-crimson-red' :
      activeTheme === 'ocean-teal' ? 'theme-ocean-teal' :
      activeTheme === 'sunset-orange' ? 'theme-sunset-orange' :
      activeTheme === 'midnight-blue' ? 'theme-midnight-blue' :
      activeTheme === 'rose-pink' ? 'theme-rose-pink' :
      activeTheme === 'abyss-violet' ? 'theme-abyss-violet' :
      activeTheme === 'obsidian-gold' ? 'theme-obsidian-gold' :
      activeTheme === 'plasma-storm' ? 'theme-plasma-storm' :
      'glass-main-bg'
    }`}>

      {/* 🔔 LIVE REAL-TIME RADIAL TOAST SYSTEM */}
      <div className="fixed top-6 right-6 z-1000 flex flex-col gap-3 w-80 max-w-[90vw] pointer-events-none">
        <AnimatePresence>
          {liveNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`pointer-events-auto p-4 rounded-xl border border-slate-700/60 shadow-2xl flex items-start gap-3 backdrop-blur-md relative overflow-hidden group ${
                notif.type === 'success' ? 'bg-emerald-950/90 text-emerald-100 border-l-4 border-l-emerald-500' :
                notif.type === 'warning' ? 'bg-amber-950/90 text-amber-100 border-l-4 border-l-amber-500' :
                'bg-slate-900/95 text-slate-100 border-l-4 border-l-sky-500'
              }`}
            >
              <Bell className={`w-5 h-5 mt-0.5 shrink-0 ${
                notif.type === 'success' ? 'text-emerald-400' :
                notif.type === 'warning' ? 'text-amber-400' :
                'text-sky-400 animate-pulse'
              }`} />

              <div className="flex-1 text-sm font-medium tracking-wide wrap-break-word">
                {notif.message}
              </div>

              <button
                onClick={() => setLiveNotifications((prev) => prev.filter(n => n.id !== notif.id))}
                className="text-slate-400 hover:text-white transition-colors duration-150 p-0.5 rounded-md hover:bg-white/10 min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile-first sticky header — hamburger triggers the Sidebar drawer (Sheet pattern handled inside Sidebar.tsx). Visible on mobile. */}
      <header className="lg:hidden sticky top-0 z-30 glass-header px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 min-h-16">
        <button
          onClick={() => setIsMobileSidebarOpen(prev => !prev)}
          className="p-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg shrink-0 min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          <Logo size="sm" />
          {currentView !== 'dashboard' && currentView !== 'subject' && currentView !== 'folder' && (
            <span className="text-slate-400 text-[10px] sm:text-xs capitalize truncate">
              · {currentView === 'artists' ? 'Marketplace' :
                 currentView === 'artist_dashboard' ? 'Artist Dashboard' :
                 currentView === 'creds' ? 'System Credentials' :
                 currentView === 'bookings' ? 'Bookings' :
                 currentView === 'academy' ? 'AI Academy' :
                 currentView === 'profile' ? 'Profile' :
                 currentView === 'chat' ? 'Discussion Chat' :
                 currentView === 'admins' ? (user?.role === 'super_admin' ? 'Super Admin CMS' : 'Admin Portal') : currentView}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-white/4 rounded-xl p-1 shrink-0 max-w-35">
            <select
              value={activeTheme}
              onChange={(e) => setActiveTheme(e.target.value)}
              className="bg-slate-900 border-none text-[10px] font-mono font-bold text-slate-300 rounded-lg py-1 px-1.5 focus:ring-1 focus:ring-indigo-500/50 cursor-pointer uppercase select-none outline-none max-w-32.5"
            >
              <option value="default">🌌 Navy</option>
              <option value="peaceful-purple">🔮 Purple</option>
              <option value="deep-blue">🌊 Deep Blue</option>
              <option value="cosmic-black">🖤 Black</option>
              <option value="mesh-aurora">🌌 Aurora</option>
              <option value="emerald-green">🌲 Emerald</option>
              <option value="botanic-green">🌿 Botanic Green</option>
              <option value="saffron-gold">🌟 Saffron Gold</option>
              <option value="royal-purple">👑 Royal Purple</option>
              <option value="crimson-red">🔴 Crimson Red</option>
              <option value="ocean-teal">🌊 Ocean Teal</option>
              <option value="sunset-orange">🌅 Sunset Orange</option>
              <option value="midnight-blue">🌙 Midnight Blue</option>
              <option value="rose-pink">🌸 Rose Pink</option>
              <option value="abyss-violet">🌌 Abyss Violet</option>
              <option value="obsidian-gold">⚫ Obsidian Gold</option>
              <option value="plasma-storm">⚡ Plasma Storm</option>
            </select>
          </div>
        </div>
      </header>

      {/* Interactive sidebar element — Sidebar handles its own mobile drawer (Sheet pattern). */}
      <Sidebar
        currentView={currentView}
        setView={setView}
        stats={stats}
        onOpenFolderCreate={() => {
          setEditFolderData(null);
          setIsFolderModalOpen(true);
        }}
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
        sessionSeconds={sessionSeconds}
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        selectedFolderId={selectedFolderId}
        folders={folders}
        studyLogs={studyLogs}
      />

      {/* Main dashboard view container — independently scrollable on desktop */}
      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-full lg:overflow-y-auto min-h-0">

        {/* Desktop Navigation Admin Header */}
        <header className="hidden lg:flex shrink-0 sticky top-0 glass-header py-3 px-3 sm:px-6 md:px-8 justify-between items-center z-30 min-h-16 gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
            {/* Breadcrumb Navigation Trail */}
            <div className="flex items-center gap-1 sm:gap-2 text-xs text-slate-400 font-sans tracking-wide min-w-0 flex-1 truncate">
              <button
                onClick={() => setView('dashboard')}
                className="hover:text-white font-semibold transition-colors truncate max-w-30 sm:max-w-none hover:scale-102 duration-150 inline-flex items-center gap-1.5 shrink-0"
              >
                <Logo size="sm" />
              </button>

              {currentView === 'dashboard' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 self-center" />
                  <span className="text-slate-200 font-bold truncate">Dashboard</span>
                </>
              )}

              {(currentView === 'subject' || currentView === 'folder') && selectedSubjectId && activeSubject && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 self-center" />
                  <button
                    onClick={() => setView('subject', selectedSubjectId)}
                    className="hover:text-white font-semibold transition-colors text-indigo-400 truncate max-w-25 sm:max-w-none hover:scale-102 duration-150 inline-flex items-center"
                  >
                    {activeSubject.title}
                  </button>
                </>
              )}

              {currentView === 'folder' && selectedFolderId && activeFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 self-center" />
                  <span className="text-slate-200 font-bold truncate max-w-30 sm:max-w-xs inline-flex items-center">
                    {activeFolder.title}
                  </span>
                </>
              )}

              {currentView !== 'dashboard' && currentView !== 'subject' && currentView !== 'folder' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 self-center" />
                  <span className="text-slate-200 font-bold capitalize truncate">
                    {currentView === 'artists' ? 'Marketplace' :
                     currentView === 'artist_dashboard' ? 'Artist Dashboard' :
                     currentView === 'creds' ? 'System Credentials' :
                     currentView === 'academy' ? 'AI Academy' :
                     currentView === 'profile' ? 'Profile' :
                     currentView === 'chat' ? 'Discussion Chat' :
                     currentView === 'admins' ? (user?.role === 'super_admin' ? 'Super Admin CMS' : 'Admin Portal') : currentView}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Balanced Console Stats & Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Selection Panel */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-white/4 rounded-xl p-1 shrink-0 max-w-32.5 sm:max-w-none">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase px-1 hidden sm:inline">Theme:</span>
              <select
                value={activeTheme}
                onChange={(e) => setActiveTheme(e.target.value)}
                className="bg-slate-900 border-none text-[10px] font-mono font-bold text-slate-300 rounded-lg py-1 px-1.5 focus:ring-1 focus:ring-indigo-500/50 cursor-pointer uppercase select-none outline-none max-w-27.5 sm:max-w-none text-ellipsis overflow-hidden"
              >
                <option value="default">🌌 Navy</option>
                <option value="peaceful-purple">🔮 Purple</option>
                <option value="deep-blue">🌊 Blue</option>
                <option value="cosmic-black">🖤 Black</option>
                <option value="mesh-aurora">🌌 Aurora</option>
                <option value="emerald-green">🌲 Emerald</option>
                <option value="botanic-green">🌿 Botanic Green</option>
                <option value="saffron-gold">🌟 Saffron Gold</option>
                <option value="royal-purple">👑 Royal Purple</option>
                <option value="crimson-red">🔴 Crimson Red</option>
                <option value="ocean-teal">🌊 Ocean Teal</option>
                <option value="sunset-orange">🌅 Sunset Orange</option>
                <option value="midnight-blue">🌙 Midnight Blue</option>
                <option value="rose-pink">🌸 Rose Pink</option>
                <option value="abyss-violet">🌌 Abyss Violet</option>
                <option value="obsidian-gold">⚫ Obsidian Gold</option>
                <option value="plasma-storm">⚡ Plasma Storm</option>
              </select>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/60 border border-white/4 rounded-xl text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
            </div>
          </div>
        </header>

        {/* Dashboard Pages wrapper */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 space-y-6 w-full min-w-0">

          {isLoading && (
            <DataLoader />
          )}

          {!isLoading && (
            <>
              {/* ==============================================
                  📊 VIEW: MAIN DASHBOARD GALLERY VIEW
                  ============================================== */}
              {currentView === 'dashboard' && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">

                  {/* Dynamic Announcement Alerts */}
                  {announcements.length > 0 && (
                    <div className="space-y-3 animate-in slide-in-from-top-3 duration-300">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-[#fbbf24] font-bold flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          Active Deadlines & Announcements
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {announcements.slice(0, 2).map((ann) => (
                          <div
                            key={ann.id}
                            className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-slate-900/60 to-slate-950/20 border border-amber-500/15 relative overflow-hidden group hover:border-amber-400/30 transition-all flex flex-col justify-between shadow-lg"
                          >
                            <div className="absolute top-0 right-0 p-3 text-[10px] font-mono text-slate-600 bg-white/1 border-l border-b border-white/3 rounded-bl-xl">
                              {new Date(ann.createdAt).toLocaleDateString()}
                            </div>

                            <div className="space-y-1.5 max-w-[85%]">
                              <h4 className="text-sm font-extrabold text-white tracking-tight group-hover:text-[#fbbf24] transition-colors wrap-break-word">
                                {ann.title}
                              </h4>
                              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 wrap-break-word">
                                {ann.content}
                              </p>
                            </div>

                            {/* Downloadable attachment — visible to all users */}
                            {ann.fileUrl && (
                              <button
                                onClick={() => {
                                  const url = ann.fileUrl!;
                                  const name = ann.fileName || 'download';
                                  if (url.startsWith('data:')) {
                                    try {
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
                                    } catch (err) {
                                      console.error('Download failed:', err);
                                      window.open(url, '_blank');
                                    }
                                  } else {
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = name;
                                    a.target = '_blank';
                                    a.rel = 'noopener noreferrer';
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Download {ann.fileName || 'file'}
                              </button>
                            )}

                            <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/[0.03] text-[10.5px] font-mono gap-2 flex-wrap">
                              <span className="text-slate-400 font-sans truncate min-w-0">Posted by: {ann.createdByName}</span>
                              {ann.deadline && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-extrabold border border-amber-500/20 shrink-0">
                                  Deadline: {ann.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">University Archive Panel</h2>
                      <p className="text-xs text-slate-400 mt-1">Select from five premium subject areas to access specific experiment galleries.</p>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-72">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search all practical modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 rounded-xl outline-none focus:border-indigo-500/50 text-xs transition-transform focus:scale-[1.01] min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Standard Counter Statistics Blocks */}
                  <StatsGrid stats={stats} />

                  {/* Subject folders list */}
                  {!searchQuery ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                            <Compass className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black uppercase tracking-wider font-mono text-white truncate">
                              Primary Course Subjects
                            </h3>
                            <p className="text-[11px] text-slate-400 font-sans truncate">Core academic disciplines & certified practical laboratories</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-white/5 shrink-0">
                          {subjects.length} Faculties
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {subjects.map((sub) => {
                          const meta = getSubjectMeta(sub.title);
                          const subjectFolders = folders.filter(f => f.subjectId === sub.id);
                          const totalPhotos = subjectFolders.reduce((sum, f) => sum + (f.images ? f.images.length : 0), 0);

                          return (
                            <div
                              key={sub.id}
                              onClick={() => setView('subject', sub.id)}
                              className={`
                                cursor-pointer rounded-2xl p-4 sm:p-6 border transition-all duration-300 relative group overflow-hidden shadow-xl backdrop-blur-md flex flex-col justify-between
                                bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl
                              `}
                            >
                              {/* Top laser line with subject specific glow */}
                              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                              {/* Ambient radial blur */}
                              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 group-hover:bg-indigo-500/10 blur-2xl pointer-events-none rounded-full transition-all duration-300" />

                              <div className="space-y-3 sm:space-y-4 relative z-10">
                                {/* Subject header ribbon */}
                                <div className="flex justify-between items-center gap-2">
                                  <span className={`text-[8px] sm:text-[9px] uppercase font-mono font-bold tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${meta.text} ${meta.bg} border-current/20 flex items-center gap-1 sm:gap-1.5 truncate min-w-0`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                                    <span className="truncate">Faculty</span>
                                  </span>

                                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                    {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          addLiveNotification(`Deleting subject "${sub.title}"...`, "warning");
                                          try {
                                              const res = await apiFetch(`/api/subjects/${sub.id}`, { method: 'DELETE' });
                                              if (res.ok) {
                                                await refreshWorkspaceData();
                                              } else {
                                                const err = await res.json();
                                                addLiveNotification(err.error || "Failed to delete subject.", "warning");
                                              }
                                            } catch (err) {
                                              addLiveNotification("Network error deleting subject.", "warning");
                                            }
                                        }}
                                        className="p-1 sm:p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                        title="Delete Subject"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                    )}
                                    <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 border border-white/5 text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                                      <FolderClosed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <h4 className="text-sm sm:text-lg font-black text-white group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-1 break-words">
                                    {sub.title}
                                  </h4>
                                  <p className="text-[11px] sm:text-xs text-slate-400 min-h-[28px] sm:min-h-[36px] line-clamp-2 leading-relaxed mt-1 sm:mt-1.5 font-sans break-words">
                                    {sub.description || meta.desc}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/5 mt-3 sm:mt-5 text-[9px] sm:text-[11px] font-mono text-slate-400 relative z-10 gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">
                                    <strong className="text-slate-200">{subjectFolders.length}</strong> Folders
                                  </span>
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                                    {totalPhotos} Scans
                                  </span>
                                </div>
                                <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 sm:gap-1 text-indigo-400 font-bold font-sans text-[11px] sm:text-xs shrink-0 ml-1">
                                  <span>Explore</span>
                                  <span>→</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Search layout Results
                    <div className="space-y-5 font-sans">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                            <Compass className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-wider font-mono text-white truncate">
                            Search Results ({searchedDashboardFolders.length})
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400 font-mono truncate max-w-full">Query: "{searchQuery}"</span>
                      </div>

                      {searchedDashboardFolders.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center text-slate-400 bg-slate-950/60 rounded-3xl border border-white/5 space-y-2">
                          <FolderClosed className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs font-semibold break-words">No practical folders match "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                          {searchedDashboardFolders.map((fold) => {
                            const sub = subjects.find(s => s.id === fold.subjectId);
                            const meta = getSubjectMeta(sub?.title || '');
                            return (
                              <div
                                key={fold.id}
                                onClick={() => setView('folder', undefined, fold.id)}
                                className="stagger-card cursor-pointer p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between shadow-xl backdrop-blur-md overflow-hidden"
                              >
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                                <div className="min-w-0">
                                  <div className="flex justify-between items-start mb-2 gap-1.5">
                                    <div className="flex flex-col gap-1 items-start min-w-0">
                                      <span className={`text-[8px] sm:text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border ${meta.text} ${meta.bg} border-current/20 truncate max-w-full`}>
                                        {sub?.title || 'General'}
                                      </span>
                                      {getRecentlyViewedMsg(fold.id) && (
                                        <span className="text-[8px] sm:text-[8.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold flex items-center gap-1 border border-cyan-500/20 truncate max-w-full">
                                          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                                          <span className="truncate">Recent</span>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] text-cyan-400 font-mono px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 shrink-0 font-bold">
                                      {fold.images ? fold.images.length : 0} sheets
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-black text-white mt-1.5 sm:mt-2 line-clamp-1 group-hover:text-cyan-300 transition-colors break-words">
                                    {fold.title}
                                  </h4>
                                  <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-1 sm:mt-1.5 leading-relaxed break-words">
                                    {fold.description}
                                  </p>
                                </div>
                                <div className="pt-2.5 sm:pt-3.5 border-t border-white/5 mt-3 sm:mt-4 text-[9px] sm:text-[10px] text-slate-400 flex justify-between items-center font-mono gap-2">
                                  <span className="truncate min-w-0">{new Date(fold.createdAt).toLocaleDateString()}</span>
                                  <span className="text-cyan-400 font-sans font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
                                    <span>Vault</span>
                                    <span>→</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


              {/* ==============================================
                  📚 VIEW: SUBJECT CORE PAGE VIEW
                  ============================================== */}
              {currentView === 'subject' && activeSubject && (
                <div className="space-y-6 animate-in fade-in duration-300">

                  {/* Top Subject title block */}
                  <div className="p-4 sm:p-6 md:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-slate-900">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl" />

                    <button
                      onClick={() => setView('dashboard')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-semibold mb-6 flex items-center gap-1.5 border border-slate-800 transition-colors min-h-[40px] w-fit"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Subjects
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="reveal-header space-y-2 min-w-0">
                        <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest font-bold">
                          ACADEMIC DISCIPLINE
                        </span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight break-words">
                          {activeSubject.title} Lab Book
                        </h2>
                        <p className="text-xs text-slate-400 max-w-2xl break-words">
                          {activeSubject.description || getSubjectMeta(activeSubject.title).desc}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                        {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                          <button
                            onClick={() => {
                              setEditFolderData(null);
                              setIsFolderModalOpen(true);
                            }}
                            className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs tracking-wide flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950 animate-pulse active:scale-95 min-h-[44px] w-full sm:w-auto justify-center"
                          >
                            <Plus className="w-4 h-4" />
                            Add Practical Folder
                          </button>
                        )}

                        <div className="relative w-full sm:w-60">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="Filter practicals..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl outline-none focus:border-indigo-500 text-xs transition-all min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Practical Folders list in this subject */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <h3 className="text-xs uppercase font-mono tracking-widest text-slate-500 font-bold truncate">
                        Indexed Practical Folders
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono shrink-0">
                        TOTAL INDEXES: {filteredFolders.length}
                      </span>
                    </div>

                    {searchedSubjectFolders.length === 0 ? (
                      <div className="p-8 sm:p-16 text-center text-slate-500 rounded-3xl bg-slate-900/30 border border-slate-900 break-words">
                        {filteredFolders.length === 0
                          ? "No practical folders have been indexed under this discipline yet."
                          : `No practicals match current query "${searchQuery}"`}
                        {(user?.role === 'admin' || user?.role === 'super_admin') && filteredFolders.length === 0 && (
                          <button
                            onClick={() => {
                              setEditFolderData(null);
                              setIsFolderModalOpen(true);
                            }}
                            className="mt-4 px-4 py-2 mx-auto bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold block hover:bg-indigo-600 hover:text-white transition-all min-h-[44px]"
                          >
                            Create First Notebook Location
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {searchedSubjectFolders.map((fold) => (
                          <div
                            key={fold.id}
                            onClick={() => setView('folder', undefined, fold.id)}
                            className="stagger-card p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative group shadow-xl backdrop-blur-md overflow-hidden cursor-pointer"
                          >
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

                            <div className="space-y-2.5 sm:space-y-3 min-w-0">
                              <div className="flex justify-between items-start gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="p-1.5 sm:p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                                    <FolderClosed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </div>
                                  {getRecentlyViewedMsg(fold.id) && (
                                    <span className="text-[8px] sm:text-[8.5px] px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold flex items-center gap-1 border border-cyan-500/20 truncate max-w-full">
                                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                                      <span className="truncate">Recent</span>
                                    </span>
                                  )}
                                </div>

                                <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                                  {fold.images ? fold.images.length : 0} Sheets
                                </span>
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-1 break-words">
                                  {fold.title}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2 mt-1 font-sans break-words">
                                  {fold.description || "Experimental worksheets, reading records, chemical assay methods."}
                                </p>
                              </div>
                            </div>

                            <div className="pt-2.5 sm:pt-3.5 border-t border-white/5 mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] sm:text-[10px] font-mono text-slate-400">
                              <span className="flex items-center gap-1 truncate min-w-0">
                                <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{new Date(fold.createdAt).toLocaleDateString()}</span>
                              </span>

                              <div className="flex gap-1 sm:gap-1.5 items-center justify-end flex-wrap">
                                {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditFolderData(fold);
                                        setIsFolderModalOpen(true);
                                      }}
                                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 rounded-lg font-bold font-sans text-[9px] sm:text-[10px] cursor-pointer transition-colors min-h-[32px] flex items-center"
                                      title="Edit settings"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addLiveNotification(`Deleting folder "${fold.title}"...`, "warning");
                                        handleDeleteFolder(fold.id);
                                      }}
                                      className="p-0.5 sm:p-1 px-1.5 sm:px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg font-bold font-sans text-[9px] sm:text-[10px] flex items-center gap-1 cursor-pointer transition-colors min-h-[32px]"
                                      title="Delete practical folder"
                                    >
                                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      <span className="hidden sm:inline">Del</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setView('folder', undefined, fold.id);
                                  }}
                                  className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all text-[9px] sm:text-[10px] font-bold font-sans cursor-pointer shadow-sm min-h-[32px] flex items-center"
                                >
                                  Open →
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* ==============================================
                  📁 VIEW: PRACTICAL FOLDER CONTENTS GALLERY
                  ============================================== */}
              {currentView === 'folder' && activeFolder && (
                <div className="space-y-6 animate-in fade-in duration-300">

                  {/* Modern Header Section */}
                  <div className="p-4 sm:p-6 md:p-8 rounded-3xl bg-slate-900/40 border border-slate-900 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Top Row: Navigation and Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                      <button
                        onClick={() => setView('subject', activeFolder.subjectId)}
                        className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-800 transition-all duration-200 self-start cursor-pointer shadow-sm min-h-[44px]"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                        Back to subject folders
                      </button>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Workspace register count indicator */}
                        <div className="px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-left flex items-center gap-2.5 shadow-inner">
                          <FileImage className="w-4 h-4 text-indigo-400 shrink-0 opacity-80" />
                          <div>
                            <p className="text-[8px] text-slate-500 font-mono tracking-wider leading-none uppercase">PAGES REGISTERED</p>
                            <p className="text-xs text-slate-300 font-bold mt-0.5">{activeFolder.images ? activeFolder.images.length : 0} sheets</p>
                          </div>
                        </div>

                        {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                          <>
                            <button
                              onClick={() => {
                                setEditFolderData(activeFolder);
                                setIsFolderModalOpen(true);
                              }}
                              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:border-indigo-500/30 active:scale-95 min-h-[44px]"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                              Edit settings
                            </button>

                            <button
                              onClick={() => {
                                addLiveNotification(`Deleting folder "${activeFolder.title}"...`, "warning");
                                handleDeleteFolder(activeFolder.id);
                              }}
                              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 min-h-[44px]"
                              title="Delete practical folder"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              Delete Folder
                            </button>
                          </>
                        )}

                        {user && (
                          <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs tracking-wide flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 border border-cyan-500/30 transition-all duration-200 active:scale-95 animate-pulse cursor-pointer min-h-[44px]"
                          >
                            <Plus className="w-4 h-4" />
                            Scan & Attach Sheet
                          </button>
                        )}

                        {/* AI Analyze Entire Practical button — available to all logged-in users */}
                        {user && activeFolder.images && activeFolder.images.length > 0 && (
                          <button
                            onClick={() => {
                              setFolderAiMode('explain');
                              setFolderAiQuestion('');
                              setFolderAiResult(null);
                              setFolderAiLoading(false);
                              setIsFolderAiModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl text-xs tracking-wide flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 border border-indigo-500/30 transition-all duration-200 active:scale-95 cursor-pointer min-h-[44px]"
                          >
                            <Sparkles className="w-4 h-4" />
                            AI Analyze Practical
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Section: Wide Title and Elegant Full-width Description Card */}
                    <div className="space-y-4 relative z-10 text-left min-w-0">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black bg-cyan-500/10 border border-cyan-500/15 px-2.5 py-1 rounded-full inline-block">
                          {activeSubject?.title} course
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-3 break-words">
                          {activeFolder.title}
                        </h2>
                      </div>

                      {/* Wide modern description block */}
                      <div className="p-4 sm:p-5 bg-slate-950/60 rounded-2xl border border-slate-850 flex flex-col sm:flex-row items-start gap-4 shadow-inner hover:border-slate-800 transition-colors">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0 mt-0.5 hidden sm:block">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="text-left">
                            <h4 className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-extrabold">Syllabus Overview & Guidelines</h4>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium mt-1 break-words">
                              {activeFolder.description || "Review laboratory research, notebook files, student notes, equations and observations related to this syllabus unit."}
                            </p>
                          </div>

                          {activeFolder.images && activeFolder.images.length > 0 && (
                            <div className="pt-3 border-t border-white/5 flex items-center gap-2.5 text-left flex-wrap">
                              <span className="flex h-2 w-2 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                              </span>
                              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block break-words">
                                ✨ HSC AI Copilot Active: Click any sheet below and toggle "HSC AI Assistant" to let Gemini explain the whole topic, formulas & run interactive Q&As!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Sheets Gallery masonry style display */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/10 p-2 rounded-2xl border border-white/5">
                      <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400 font-bold flex items-center gap-1.5 px-2 truncate">
                        <Plus className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                        {galleryViewMode === 'grid' ? "Dynamic Sheet Grid" : "Dynamic Sheet List"}
                      </h3>

                      {activeFolder.images && activeFolder.images.length > 0 && (
                        <div className="flex items-center bg-slate-950/80 border border-white/5 rounded-xl p-0.5" id="gallery-view-switcher">
                          <button
                            type="button"
                            onClick={() => setGalleryViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all min-h-[36px] ${
                              galleryViewMode === 'grid'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm font-extrabold'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                            title="Grid layout view"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid View
                          </button>
                          <button
                            type="button"
                            onClick={() => setGalleryViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all min-h-[36px] ${
                              galleryViewMode === 'list'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm font-extrabold'
                                : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                            title="List layout view"
                          >
                            <List className="w-3.5 h-3.5" />
                            List View
                          </button>
                        </div>
                      )}
                    </div>

                    {!activeFolder.images || activeFolder.images.length === 0 ? (
                      <div className="p-8 sm:p-16 border-2 border-dashed border-slate-950 rounded-3xl text-center space-y-4 bg-slate-900/10">
                        <FileImage className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                        <div>
                          <p className="text-sm font-semibold text-slate-300">No Pages Registered Yet</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">This practical folder is currently empty. Notebook pages can be added by uploading image scans or web attachments.</p>
                        </div>
                        {user && (
                          <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-4 py-2 mx-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs tracking-wide flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                          >
                            <Plus className="w-4 h-4" />
                            Scan & Attach First Sheet
                          </button>
                        )}
                      </div>
                    ) : galleryViewMode === 'grid' ? (
                      // Grid list (existing masonry block)
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {activeFolder.images.map((img, index) => (
                          <div
                            key={img.url || `img-${index}`}
                            onClick={() => setActiveLightboxIndex(index)}
                            className="group cursor-pointer aspect-[3/4] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden relative shadow-lg hover:shadow-indigo-950/10 transition-all flex flex-col hover:-translate-y-1.5 duration-300 hover:border-slate-800"
                          >
                            {/* Overlay image display */}
                            <img
                              src={img.url}
                              alt={img.title}
                              className="w-full flex-1 min-h-0 object-cover opacity-80 group-hover:opacity-95 transition-all"
                              loading="lazy"
                            />

                            {/* Caption segment details */}
                            <div className="p-3 bg-slate-950/90 border-t border-slate-900/60 flex justify-between items-start gap-2">
                              <div className="min-w-0 pr-2">
                                <span className="text-[8px] font-mono text-cyan-400 tracking-wider">SHEET PAGE {index + 1}</span>
                                <h4 className="text-[11.5px] font-bold text-slate-200 truncate pr-2 mt-0.5" title={img.title}>
                                  {img.title || "Experiment Page Index"}
                                </h4>
                              </div>

                              <div className="flex gap-1.5 shrink-0">
                                <span className="p-1 rounded bg-slate-900 text-slate-400 group-hover:text-white transition-colors" title="Zoom">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>

                                {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(index);
                                    }}
                                    className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all scale-90 min-h-[28px] min-w-[28px] flex items-center justify-center"
                                    title="Unlink image page"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    ) : (
                      // List layout for direct overview
                      <div className="space-y-3" id="gallery-list-view">
                        {activeFolder.images.map((img, index) => (
                          <div
                            key={img.url || `list-img-${index}`}
                            onClick={() => setActiveLightboxIndex(index)}
                            className="group cursor-pointer bg-slate-950/80 border border-slate-900/80 hover:border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-slate-900/50 relative overflow-hidden"
                          >
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                              {/* Small thumb preview with rounded border */}
                              <div className="w-12 h-16 rounded-xl overflow-hidden border border-white/10 bg-slate-900 shrink-0 relative">
                                <img
                                  src={img.url}
                                  alt={img.title}
                                  className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
                                <span className="absolute bottom-1 right-1 text-[8px] font-mono font-bold px-1 py-0.2 bg-slate-950 text-cyan-450 rounded-sm leading-none opacity-90 border border-white/5">
                                  #{index + 1}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-mono font-extrabold tracking-widest text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/15 px-2 py-0.5 rounded">
                                    PAGE {index + 1}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Format: High-Res Sheet Image
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-200 mt-1.5 truncate group-hover:text-white transition-colors break-words">
                                  {img.title || `Experiment Sheet Record #${index + 1}`}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-1 hidden md:block max-w-[600px] truncate">
                                  Unlock expert summaries, equations, formulas, and deep curriculum Q&A under the active viewer mode.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t border-white/[0.02] sm:border-0 pt-3 sm:pt-0 shrink-0">
                              <span className="text-[10px] font-mono text-slate-600 hidden lg:inline-block">
                                SHA-256 Cloud Verified
                              </span>

                              <div className="flex gap-2">
                                <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[36px]">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View & Inspect</span>
                                </span>

                                {(user?.role === 'admin' || user?.role === 'super_admin') &&(
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(index);
                                    }}
                                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                                    title="Unlink image page"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==============================================
                  🛡️ VIEW: ADMINISTRATORS & ENTERPRISE CMS MANIFEST
                  ============================================== */}
              {currentView === 'admins' && (
                <AdminCmsPage
                  user={user}
                  subjects={subjects}
                  folders={folders}
                  adminsList={adminsList}
                  announcements={announcements}
                  refreshWorkspaceData={refreshWorkspaceData}
                  setView={setView}
                  onNavigateToCreds={() => setCurrentView('creds')}
                />
              )}

              {/* ==============================================
                  🔐 VIEW: SYSTEM CREDENTIALS (SUPER ADMIN ONLY)
                  ============================================== */}
              {currentView === 'creds' && user?.role === 'super_admin' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <CredentialsView onBack={() => setCurrentView('admins')} activeTheme={activeTheme} />
                </div>
              )}


              {/* ==============================================
                  💬 VIEW: STUDENT CLASSROOM HUB CHAT MESSAGES
                  — kept mounted (display:none when inactive) for state persistency
                  ============================================== */}
              <div className={currentView === 'chat' ? "space-y-6" : "hidden"}>
                <ClassroomDiscussion subjects={subjects} />
              </div>

              {/* ==============================================
                  🧬 VIEW: AI ACADEMY STUDY CHAMBER
                  — kept mounted (display:none when inactive) for state persistency
                  ============================================== */}
              <div className={currentView === 'academy' ? "space-y-6" : "hidden"}>
                <AiAcademyRoom />
              </div>

              {/* ==============================================
                  👤 VIEW: PROFILE SETTINGS CONTROLS
                  ============================================== */}
              {currentView === 'profile' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <ProfilePage
                    onSwitchView={(view: string) => {
                      // Map ProfilePage's view name to our ViewState
                      if (view === 'artistDashboard' || view === 'artist_dashboard') {
                        setCurrentView('artist_dashboard');
                      } else if (view === 'artists' || view === 'marketplace') {
                        setCurrentView('artists');
                      } else {
                        setCurrentView(view as ViewState);
                      }
                    }}
                  />
                </div>
              )}

              {/* ==============================================
                  🎨 VIEW: SCIENCE DRAW PRACTICAL ARTISTS MARKETPLACE
                  ============================================== */}
              {currentView === 'artists' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <ArtistsPage activeTheme={activeTheme} />
                </div>
              )}

              {/* ==============================================
                  📊 VIEW: ARTIST DASHBOARD (ORDERS & PORTFOLIO)
                  ============================================== */}
              {currentView === 'artist_dashboard' && user?.role === 'artist' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <ArtistDashboard activeTheme={activeTheme} />
                </div>
              )}

              {/* ==============================================
                  📅 VIEW: BOOKINGS & HIRE REQUESTS
                  ============================================== */}
              {currentView === 'bookings' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <BookingsPage activeTheme={activeTheme} />
                </div>
              )}



            </>
          )}

        </main>

        {/* Sticky footer per project rules — mt-auto keeps it pinned to the bottom on short viewports. */}
        <footer className="mt-auto shrink-0 border-t border-white/5 bg-slate-950/60 backdrop-blur-md py-3 px-4 sm:px-6 md:px-8 text-[10px] sm:text-[11px] font-mono text-slate-500">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0 truncate">
              <Logo size="sm" />
              <span className="text-slate-500 truncate">
                — Practical Notebook Gallery
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
            </div>
          </div>
        </footer>
      </div>

      {/* ==============================================
          🗳️ PORTAL LIGHTBOX & MODALS OVERLAYS
          ============================================== */}

      {/* Fullscreen Lightbox image viewer */}
      {activeLightboxIndex !== null && activeFolder && activeFolder.images && (
        <Lightbox
          images={activeFolder.images}
          initialIndex={activeLightboxIndex}
          onClose={() => setActiveLightboxIndex(null)}
        />
      )}

      {/* Practical folder creation configuration modal */}
      {isFolderModalOpen && (
        <FolderModal
          isOpen={isFolderModalOpen}
          onClose={() => {
            setIsFolderModalOpen(false);
            setEditFolderData(null);
          }}
          subjects={subjects}
          initialSubjectId={selectedSubjectId || undefined}
          editFolder={editFolderData}
          onSave={handleSaveFolder}
          onDelete={handleDeleteFolder}
        />
      )}

      {/* Page image draft and uploading submission overlay */}
      {isUploadModalOpen && selectedFolderId && activeFolder && user && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          folderId={selectedFolderId}
          folderTitle={activeFolder.title}
          onUploadSuccess={handleAppendImage}
        />
      )}

      {/* AI Folder Analysis Modal */}
      {isFolderAiModalOpen && activeFolder && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-950 border border-indigo-500/20 rounded-3xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate">AI Practical Analysis</h3>
                  <p className="text-[10px] text-slate-400 truncate">{activeFolder.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsFolderAiModalOpen(false)}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-600 hover:border-transparent hover:text-white transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setFolderAiMode('explain'); setFolderAiResult(null); setFolderAiError(null); }}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                    folderAiMode === 'explain'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Explain Entire Practical
                </button>
                <button
                  onClick={() => { setFolderAiMode('qa'); setFolderAiResult(null); setFolderAiError(null); }}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                    folderAiMode === 'qa'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Ask Question
                </button>
              </div>

              {/* Q&A input */}
              {folderAiMode === 'qa' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderAiQuestion}
                    onChange={(e) => setFolderAiQuestion(e.target.value)}
                    placeholder="Ask about this practical..."
                    className="flex-1 px-3 py-2.5 bg-slate-900 border border-white/10 text-slate-100 placeholder:text-slate-500 rounded-xl text-xs outline-none focus:border-indigo-500/50 min-h-[44px]"
                  />
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={async () => {
                  setFolderAiLoading(true);
                  setFolderAiError(null);
                  setFolderAiResult(null);
                  try {
                    const res = await apiFetch('/api/academy/analyze-folder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        folderId: activeFolder.id,
                        mode: folderAiMode,
                        question: folderAiMode === 'qa' ? folderAiQuestion : undefined,
                        language: 'en',
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data.error || 'Analysis failed');
                    }
                    setFolderAiResult(data.content || 'No response from AI.');
                  } catch (err: any) {
                    setFolderAiError(err.message || 'Could not analyze practical.');
                  } finally {
                    setFolderAiLoading(false);
                  }
                }}
                disabled={folderAiLoading || (folderAiMode === 'qa' && !folderAiQuestion.trim())}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {folderAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing {activeFolder.images?.length || 0} pages...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {folderAiMode === 'explain' ? 'Analyze Entire Practical' : 'Ask AI'}
                  </>
                )}
              </button>

              {/* Error */}
              {folderAiError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {folderAiError}
                </div>
              )}

              {/* Result */}
              {folderAiResult && (
                <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.06] text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                  {folderAiResult}
                </div>
              )}

              {/* Info */}
              {!folderAiResult && !folderAiError && !folderAiLoading && (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-white/5 text-center">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {folderAiMode === 'explain'
                      ? 'AI will analyze all pages of this practical together and provide a complete explanation including objective, apparatus, procedure, observations, calculations, and results.'
                      : 'Ask any question about this practical — AI will examine all pages and answer.'}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Requires Gemini API key. Click "Connect AI Key" in the sidebar if you haven't already.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteImageIndex !== null && (
        <ConfirmModal
          isOpen={confirmDeleteImageIndex !== null}
          onClose={() => setConfirmDeleteImageIndex(null)}
          onConfirm={() => {
            if (confirmDeleteImageIndex !== null) {
              handleConfirmDeleteImage(confirmDeleteImageIndex);
            }
          }}
          title="Delete Notebook Page Scan?"
          message="Are you sure you want to delete this notebook page from this practical? This change is irreversible."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          isDestructive={true}
        />
      )}

      {confirmDeleteAnnouncementId !== null && (
        <ConfirmModal
          isOpen={confirmDeleteAnnouncementId !== null}
          onClose={() => setConfirmDeleteAnnouncementId(null)}
          onConfirm={() => {
            if (confirmDeleteAnnouncementId !== null) {
              handleConfirmDeleteAnnouncement(confirmDeleteAnnouncementId);
            }
          }}
          title="Retract Announcement?"
          message="Are you sure you want to retract and delete this announcement publication? This change is irreversible."
          confirmText="Yes, Retract"
          cancelText="Cancel"
          isDestructive={true}
        />
      )}

      <GeminiKeyModal />
    </div>
  );
}

/**
 * Home — the single Next.js App-Router page that owns the auth-aware shell.
 *
 * Layout (already wrapped in AuthProvider + LanguageProvider by src/app/layout.tsx):
 * 1. While `isLoading` is true, render a centered decryption loader.
 * 2. Once loaded, if the user is authenticated, render <PortalConsole />.
 * 3. If the visitor tapped "Sign In" (viewAuth) but is not yet authenticated,
 *    render <AuthPage onSuccess=... onGoBack=... />.
 * 4. Otherwise, render <LandingPage onEnter=... isAuthenticated=... onGoToDashboard=...
 *    subjects={[]} folders={[]} announcements={[]} />.
 */
export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [viewAuth, setViewAuth] = useState(false);
  // Initial mode for the AuthPage when it's shown — 'login' (default) or
  // 'register' (when triggered from a "Sign up to do X" prompt on the landing).
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [landingBanner, setLandingBanner] = useState<any>(null);
  // When true AND the user is NOT authenticated, render the public marketplace
  // browse view (<PublicMarketplace />) instead of the landing page. Lets
  // unauthenticated visitors browse the STEM illustrator marketplace without
  // being forced through AuthPage first.
  const [viewPublicMarketplace, setViewPublicMarketplace] = useState(false);
  // Local fallback so the loading screen NEVER gets stuck even if AuthContext
  // hangs (e.g., dev server HMR restart mid-fetch, or an unreadable stale
  // localStorage entry).
  const [forceLoaded, setForceLoaded] = useState(false);

  // Fetch banner config for landing page (public, no auth needed)
  useEffect(() => {
    fetch('/api/settings/banner')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setLandingBanner(d))
      .catch(() => {});
  }, []);

  // Safety timeout — force-load after 5s no matter what.
  // This is the ULTIMATE fallback. If AuthContext's fetch is hanging
  // (Neon cold start, slow compilation, network issue), the user
  // sees the landing page after 5 seconds instead of an infinite spinner.
  useEffect(() => {
    const t = setTimeout(() => setForceLoaded(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // SSR-level safety net — ONLY fires if the loading screen is still
  // visible after 60s (genuine ChunkLoadError / server crash). Uses
  // useEffect (NOT a <script> tag) because React doesn't execute
  // <script> tags during client-side rendering.
  useEffect(() => {
    if (!isLoading || forceLoaded) return;
    const t = setTimeout(() => {
      if ((window as any).__pracpedia_chunk_retry__) return;
      (window as any).__pracpedia_chunk_retry__ = true;
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('__chunk_retry', String(Date.now()));
        window.location.replace(u.toString());
      } catch {
        window.location.reload();
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [isLoading, forceLoaded]);

  // Suppress unused-warning for `user` — referenced to keep the hook contract explicit.
  void user;

  if (isLoading && !forceLoaded) {
    return (
      <div
        id="pracpedia-initial-loader"
        className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans p-4 z-50"
      >
        <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center">Loading PracPedia…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <PortalConsole />;
  }

  if (viewAuth && !isAuthenticated) {
    return (
      <AuthPage
        initialMode={authMode}
        onSuccess={() => {
          setViewAuth(false);
        }}
        onGoBack={() => setViewAuth(false)}
      />
    );
  }

  // Public marketplace browse mode — renders a no-auth marketplace view
  // when an unauthenticated visitor taps "Browse Marketplace" on the landing
  // page. Authenticated users never reach this branch (they go to
  // PortalConsole above, which reads safeLocalStorage.app_current_view='artists'
  // and opens to the marketplace directly).
  if (viewPublicMarketplace && !isAuthenticated) {
    return (
      <PublicMarketplace
        onRegister={() => {
          // Opens AuthPage in register mode; preserves viewPublicMarketplace
          // so if the visitor closes AuthPage they fall back to the public
          // marketplace browse view instead of the landing page.
          setAuthMode('register');
          setViewAuth(true);
        }}
        onBack={() => setViewPublicMarketplace(false)}
      />
    );
  }

  return (
    <LandingPage
      onEnter={() => {
        if (isAuthenticated) {
          // Already authenticated (e.g. silent refresh) — no-op, the outer branch will render PortalConsole.
          return;
        }
        setAuthMode('login');
        setViewAuth(true);
      }}
      onRegister={() => {
        // Triggered by the marketplace "Hire" registration prompt — starts in
        // register mode instead of login mode.
        if (isAuthenticated) return;
        setAuthMode('register');
        setViewAuth(true);
      }}
      onSignIn={() => {
        // Same as onEnter — opens AuthPage in login mode.
        if (isAuthenticated) return;
        setAuthMode('login');
        setViewAuth(true);
      }}
      onBrowseMarketplace={() => {
        // Browse the marketplace WITHOUT forcing auth. We pre-set the
        // localStorage value so when an authenticated user does land in
        // PortalConsole, it opens directly to 'artists' (the marketplace).
        // For unauthenticated visitors, we set viewPublicMarketplace=true
        // which renders the no-auth <PublicMarketplace /> view above.
        if (typeof window !== 'undefined') {
          try {
            safeLocalStorage.setItem('app_current_view', 'artists');
          } catch { /* ignore */ }
        }
        if (isAuthenticated) return;
        setViewPublicMarketplace(true);
      }}
      isAuthenticated={isAuthenticated}
      onGoToDashboard={() => {
        // The dashboard requires auth; if the visitor isn't signed in, route them through AuthPage.
        if (isAuthenticated) {
          return;
        }
        setAuthMode('login');
        setViewAuth(true);
      }}
      subjects={[]}
      folders={[]}
      announcements={[]}
      bannerConfig={landingBanner}
    />
  );
}
