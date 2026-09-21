'use client';

/**
 * NotificationBell — premium notification bell with WAV-based sound.
 *
 * FIXES:
 *   - Sound uses <audio> element with generated WAV (NOT AudioContext)
 *     → reliable playback on every notification, not just first time
 *   - Pleasant two-note chime (E6 → G6, perfect fifth = harmonious)
 *   - Custom bell icon (modern, clean)
 *   - Bell at the MOST RIGHT corner of header
 *   - Toast popup slides in on new notification
 *   - 5-second polling (near real-time)
 *   - Red badge shows total count (like cart superscript)
 *   - Refetch on window focus (instant check when returning to tab)
 *
 * WHY NOT WEBSOCKET:
 *   Vercel serverless doesn't support persistent WebSocket connections.
 *   True real-time requires a dedicated WS server (Pusher, Ably, or
 *   a separate Node.js process on Railway/Render). 5-second polling
 *   is the best alternative on Vercel — near-instant for chat.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageSquare, Users, Palette, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// SOUND — Generate a pleasant WAV chime at runtime
// ═══════════════════════════════════════════════════════════════════════════

function createChimeWavDataUri(): string {
  if (typeof window === 'undefined') return '';
  try {
    const sampleRate = 22050;
    const duration = 0.45;
    const numSamples = Math.floor(sampleRate * duration);
    const bufferSize = 44 + numSamples * 2;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    // WAV header
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate samples — pleasant two-note chime (E6 → G6, perfect fifth)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 3.5);

      let sample = 0;

      // Note 1: E6 (1318.51 Hz) — main note, plays throughout
      sample += Math.sin(2 * Math.PI * 1318.51 * t) * 0.45;

      // Note 2: G6 (1567.98 Hz) — perfect fifth, starts at 0.12s
      if (t > 0.12) {
        const t2 = t - 0.12;
        const env2 = Math.exp(-t2 * 4.5);
        sample += Math.sin(2 * Math.PI * 1567.98 * t2) * 0.35 * env2;
      }

      // Subtle warmth: low harmonic at 2x
      sample += Math.sin(2 * Math.PI * 2637 * t) * 0.04 * env;

      // Apply envelope + volume
      sample = sample * env * 0.5;

      // Convert to 16-bit PCM
      const int16 = Math.max(-32768, Math.min(32767, sample * 32767));
      view.setInt16(44 + i * 2, int16, true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch (e) {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type NotificationType = 'classroom' | 'order_chat' | 'assistant_chat';

interface NotificationItem {
  id: string;
  type: NotificationType;
  senderName: string;
  preview: string;
  createdAt: string;
  sourceLabel: string;
}

const TYPE_META: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  classroom:      { icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     label: 'Class' },
  order_chat:     { icon: Palette,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Order' },
  assistant_chat: { icon: Users,          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', label: 'Task' },
};

const formatTimeAgo = (iso: string): string => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  } catch { return ''; }
};

// ═══════════════════════════════════════════════════════════════════════════
// Custom Bell Icon (modern, clean — different from standard lucide bell)
// ═══════════════════════════════════════════════════════════════════════════

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Rounded bell body — different shape from standard bell */}
    <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 3.5-1.2 5.5-2.3 6.8-.5.6-.1 1.5.7 1.5h16.2c.8 0 1.2-.9.7-1.5-1.1-1.3-2.3-3.3-2.3-6.8A6.5 6.5 0 0 0 12 2.5z" />
    {/* Clapper */}
    <path d="M10.2 18.8c.3 1 1 1.7 1.8 1.7s1.5-.7 1.8-1.7" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export const NotificationBell: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [toast, setToast] = useState<NotificationItem | null>(null);

  // Track previous state for detecting NEW notifications
  const prevCountRef = useRef<number>(-1);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio element — MORE RELIABLE than AudioContext
  const chimeUri = useMemo(() => createChimeWavDataUri(), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Create audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && chimeUri) {
      audioRef.current = new Audio(chimeUri);
      audioRef.current.volume = 0.4;
      audioRef.current.preload = 'auto';
    }
  }, [chimeUri]);

  // Play sound — works reliably after first user interaction
  const playSound = useCallback(() => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      const promise = audioRef.current.play();
      if (promise) {
        promise.then(() => {
          audioUnlockedRef.current = true;
        }).catch(() => {
          audioUnlockedRef.current = false;
        });
      }
    } catch (e) { /* silent */ }
  }, []);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current && !audioUnlockedRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          audioRef.current!.volume = 0.4;
          audioUnlockedRef.current = true;
        }).catch(() => {});
      }
    };
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  }, []);

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const newCount: number = data.unreadCount || 0;
      const newNotifs: NotificationItem[] = data.notifications || [];

      // Detect NEW notifications by checking for IDs we haven't seen
      if (prevCountRef.current !== -1 && newCount > 0) {
        const newOnes = newNotifs.filter(n => !prevIdsRef.current.has(n.id));

        if (newOnes.length > 0) {
          // ── TRIGGER: animation + sound + toast ──
          setIsShaking(true);
          setShowRipple(true);
          playSound();
          setTimeout(() => setIsShaking(false), 1000);
          setTimeout(() => setShowRipple(false), 1200);

          // Show toast for the newest notification
          const newest = newOnes[0];
          setToast(newest);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setToast(null), 5000);
        }
      }

      // Update refs
      prevCountRef.current = newCount;
      prevIdsRef.current = new Set(newNotifs.map(n => n.id));
      setNotifications(newNotifs);
      setUnreadCount(newCount);
    } catch (e) { /* silent */ }
  }, [apiFetch, user, playSound]);

  // ── Polling every 5 seconds (near real-time) ──
  useEffect(() => {
    if (!user) return;
    void fetchNotifications();
    pollTimerRef.current = setInterval(() => {
      void fetchNotifications();
    }, 5000); // 5 seconds — near real-time
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [user, fetchNotifications]);

  // ── Refetch on window focus (instant check when returning to tab) ──
  useEffect(() => {
    const handleFocus = () => { void fetchNotifications(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void fetchNotifications();
    });
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchNotifications]);

  // ── Bell click handler ──
  const handleBellClick = () => {
    // Play test chime (also unlocks audio if not already)
    playSound();
    setToast(null);
    if (unreadCount > 0) {
      void handleMarkAllRead();
    }
    setOpen(!open);
  };

  const handleMarkAllRead = async () => {
    setUnreadCount(0);
    setIsShaking(false);
    prevCountRef.current = 0;
    try {
      await apiFetch('/api/notifications/read', { method: 'POST' });
    } catch (e) { /* silent */ }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-bell]')) {
        setOpen(false);
      }
    };
    if (open) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClick);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [open]);

  if (!user) return null;

  const toastMeta = toast ? TYPE_META[toast.type] : null;
  const ToastIcon = toastMeta?.icon;

  return (
    <>
      {/* ══ Popup Toast — slides in from right ══ */}
      <AnimatePresence>
        {toast && ToastIcon && (
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-16 right-3 sm:top-20 sm:right-6 z-[200] w-[260px] sm:w-[300px] bg-[#0d121f] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
          >
            <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
            <div className="p-2.5 flex items-start gap-2">
              <div className={`p-1.5 rounded-lg border shrink-0 ${toastMeta!.color}`}>
                <ToastIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    New · {toastMeta!.label}
                  </span>
                  <button type="button" onClick={() => setToast(null)} className="p-0.5 text-slate-500 hover:text-white rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs font-bold text-white truncate mt-0.5">{toast.senderName}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{toast.preview}</p>
                <p className="text-[8px] text-slate-600 font-mono mt-1">{toast.sourceLabel} · {formatTimeAgo(toast.createdAt)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Bell button ══ */}
      <div data-notification-bell className="relative">
        <button
          type="button"
          onClick={handleBellClick}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
        >
          {/* Ripple ring */}
          <AnimatePresence>
            {showRipple && (
              <motion.span
                className="absolute inset-0 rounded-lg border-2 border-cyan-400 pointer-events-none"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Custom bell icon */}
          <motion.div
            animate={isShaking ? { rotate: [0, -15, 15, -12, 12, -8, 8, 0] } : { rotate: 0 }}
            transition={isShaking ? { duration: 1, times: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1], ease: 'easeInOut' } : { duration: 0.2 }}
          >
            <BellIcon className={unreadCount > 0 ? 'text-cyan-400' : 'text-slate-400'} />
          </motion.div>

          {/* Red badge — like cart count superscript */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#020617] z-20"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* ══ Dropdown ══ */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[240px] sm:w-[300px] max-w-[calc(100vw-1.5rem)] bg-[#0d121f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-50"
              style={{ maxHeight: 'calc(100vh - 5rem)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.06] shrink-0">
                <span className="text-[11px] font-bold text-white">
                  {unreadCount > 0 ? `${unreadCount} New` : 'Notifications'}
                </span>
                <div className="flex items-center gap-0.5">
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAllRead}
                      className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-cyan-500/10 transition-colors">
                      Read all
                    </button>
                  )}
                  <button type="button" onClick={() => setOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5" aria-label="Close">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 mb-1" />
                    <p className="text-[10px] text-slate-500">All caught up</p>
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const meta = TYPE_META[n.type];
                    const Icon = meta.icon;
                    return (
                      <div key={`${n.id}-${i}`}
                        className="flex items-start gap-1.5 px-2.5 py-1.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                        <div className={`p-1 rounded border shrink-0 ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 font-bold truncate">
                              {meta.label} · {n.sourceLabel}
                            </span>
                            <span className="text-[8px] text-slate-600 font-mono shrink-0">
                              {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">{n.senderName}</p>
                          <p className="text-[9px] text-slate-400 line-clamp-1 leading-tight mt-0.5">{n.preview}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
