// 'use client';

// /**
//  * NotificationBell — premium notification bell with custom sound.
//  *
//  * SOUND:
//  *   - Uses your custom notification sound from /public/notification.mp3
//  *   - Audio element is preloaded on mount
//  *   - Unlocked on first user interaction (browser requirement)
//  *   - Plays reliably on every notification
//  *   - Debounced to prevent double-play (mobile + desktop bell instances)
//  *
//  * REAL-TIME:
//  *   - 5-second polling + refetch on window focus
//  *   - Detects new notifications by ID comparison
//  *   - Triggers: shake animation + ripple + toast + chime
//  */

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   X, MessageSquare, Users, Palette, CheckCircle2,
// } from 'lucide-react';
// import { useAuth } from '@/contexts/AuthContext';

// // ═══════════════════════════════════════════════════════════════════════════
// // SOUND — Custom notification sound (served from /public/notification.mp3)
// // ═══════════════════════════════════════════════════════════════════════════

// const NOTIFICATION_SOUND_URL = '/notification.mp3';

// let sharedAudio: HTMLAudioElement | null = null;
// let audioUnlocked = false;
// let lastSoundTime = 0; // Module-level debounce — shared across all bell instances

// function getAudioElement(): HTMLAudioElement | null {
//   if (typeof window === 'undefined') return null;
//   if (!sharedAudio) {
//     try {
//       sharedAudio = new Audio(NOTIFICATION_SOUND_URL);
//       sharedAudio.volume = 1;
//       sharedAudio.preload = 'auto';
//     } catch { return null; }
//   }
//   return sharedAudio;
// }

// function playNotificationSound() {
//   // Debounce: only play once every 3 seconds (prevents double-play from
//   // multiple bell instances in mobile + desktop headers)
//   const now = Date.now();
//   if (now - lastSoundTime < 3000) return;
//   lastSoundTime = now;

//   const audio = getAudioElement();
//   if (!audio) return;
//   try {
//     audio.currentTime = 0;
//     const promise = audio.play();
//     if (promise) {
//       promise.catch(() => {
//         // Audio play rejected — likely needs user interaction first.
//         // The unlock handler will re-arm it on next click.
//       });
//     }
//   } catch (e) { /* silent */ }
// }

// // Unlock audio on first user interaction (required by all browsers)
// function unlockAudio() {
//   const audio = getAudioElement();
//   if (!audio || audioUnlocked) return;
//   audio.volume = 0;
//   audio.play().then(() => {
//     audio.volume = 1;
//     audioUnlocked = true;
//   }).catch(() => {});
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // Types
// // ═══════════════════════════════════════════════════════════════════════════

// type NotificationType = 'classroom' | 'order_chat' | 'assistant_chat';

// interface NotificationItem {
//   id: string;
//   type: NotificationType;
//   senderName: string;
//   preview: string;
//   createdAt: string;
//   sourceLabel: string;
// }

// const TYPE_META: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
//   classroom:      { icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     label: 'Class' },
//   order_chat:     { icon: Palette,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Order' },
//   assistant_chat: { icon: Users,          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', label: 'Task' },
// };

// const formatTimeAgo = (iso: string): string => {
//   try {
//     const diff = Date.now() - new Date(iso).getTime();
//     const sec = Math.floor(diff / 1000);
//     if (sec < 60) return 'now';
//     const min = Math.floor(sec / 60);
//     if (min < 60) return `${min}m`;
//     const hr = Math.floor(min / 60);
//     if (hr < 24) return `${hr}h`;
//     return `${Math.floor(hr / 24)}d`;
//   } catch { return ''; }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // Custom Bell Icon
// // ═══════════════════════════════════════════════════════════════════════════

// const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
//   <svg
//     width="18"
//     height="18"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="1.8"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={className}
//   >
//     <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 3.5-1.2 5.5-2.3 6.8-.5.6-.1 1.5.7 1.5h16.2c.8 0 1.2-.9.7-1.5-1.1-1.3-2.3-3.3-2.3-6.8A6.5 6.5 0 0 0 12 2.5z" />
//     <path d="M10.2 18.8c.3 1 1 1.7 1.8 1.7s1.5-.7 1.8-1.7" />
//   </svg>
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // Component
// // ═══════════════════════════════════════════════════════════════════════════

// export const NotificationBell: React.FC = () => {
//   const { user, apiFetch } = useAuth();
//   const [notifications, setNotifications] = useState<NotificationItem[]>([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [open, setOpen] = useState(false);
//   const [isShaking, setIsShaking] = useState(false);
//   const [showRipple, setShowRipple] = useState(false);
//   const [toast, setToast] = useState<NotificationItem | null>(null);

//   // Track previous state for detecting NEW notifications
//   const prevCountRef = useRef<number>(-1);
//   const prevIdsRef = useRef<Set<string>>(new Set());
//   const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   // ── Preload audio element on mount ──
//   useEffect(() => {
//     getAudioElement();
//   }, []);

//   // ── Unlock audio on first user interaction ──
//   useEffect(() => {
//     const handler = () => { unlockAudio(); };
//     document.addEventListener('click', handler, true);
//     document.addEventListener('touchstart', handler, true);
//     document.addEventListener('keydown', handler, true);
//     return () => {
//       document.removeEventListener('click', handler, true);
//       document.removeEventListener('touchstart', handler, true);
//       document.removeEventListener('keydown', handler, true);
//     };
//   }, []);

//   // ── Fetch notifications ──
//   const fetchNotifications = useCallback(async () => {
//     if (!user) return;
//     try {
//       const res = await apiFetch('/api/notifications');
//       if (!res.ok) return;
//       const data = await res.json();
//       const newCount: number = data.unreadCount || 0;
//       const newNotifs: NotificationItem[] = data.notifications || [];

//       // Detect NEW notifications by checking for IDs we haven't seen
//       if (prevCountRef.current !== -1 && newCount > 0) {
//         const newOnes = newNotifs.filter(n => !prevIdsRef.current.has(n.id));

//         if (newOnes.length > 0) {
//           // ── TRIGGER: animation + sound + toast ──
//           setIsShaking(true);
//           setShowRipple(true);
//           playNotificationSound();
//           setTimeout(() => setIsShaking(false), 1000);
//           setTimeout(() => setShowRipple(false), 1200);

//           // Show toast for the newest notification
//           const newest = newOnes[0];
//           setToast(newest);
//           if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
//           toastTimerRef.current = setTimeout(() => setToast(null), 5000);
//         }
//       }

//       // Update refs
//       prevCountRef.current = newCount;
//       prevIdsRef.current = new Set(newNotifs.map(n => n.id));
//       setNotifications(newNotifs);
//       setUnreadCount(newCount);
//     } catch (e) { /* silent */ }
//   }, [apiFetch, user]);

//   // ── Polling every 5 seconds (near real-time) ──
//   useEffect(() => {
//     if (!user) return;
//     void fetchNotifications();
//     pollTimerRef.current = setInterval(() => {
//       void fetchNotifications();
//     }, 5000); // 5 seconds
//     return () => {
//       if (pollTimerRef.current) clearInterval(pollTimerRef.current);
//       if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
//     };
//   }, [user, fetchNotifications]);

//   // ── Refetch on window focus ──
//   useEffect(() => {
//     const handleFocus = () => { void fetchNotifications(); };
//     window.addEventListener('focus', handleFocus);
//     document.addEventListener('visibilitychange', () => {
//       if (!document.hidden) void fetchNotifications();
//     });
//     return () => window.removeEventListener('focus', handleFocus);
//   }, [fetchNotifications]);

//   // ── Bell click handler ──
//   const handleBellClick = () => {
//     playNotificationSound(); // Test sound + unlocks audio
//     setToast(null);
//     if (unreadCount > 0) {
//       void handleMarkAllRead();
//     }
//     setOpen(!open);
//   };

//   const handleMarkAllRead = async () => {
//     setUnreadCount(0);
//     setIsShaking(false);
//     prevCountRef.current = 0;
//     try {
//       await apiFetch('/api/notifications/read', { method: 'POST' });
//     } catch (e) { /* silent */ }
//   };

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleClick = (e: MouseEvent) => {
//       const target = e.target as HTMLElement;
//       if (!target.closest('[data-notification-bell]')) {
//         setOpen(false);
//       }
//     };
//     if (open) {
//       const timer = setTimeout(() => {
//         document.addEventListener('mousedown', handleClick);
//       }, 100);
//       return () => {
//         clearTimeout(timer);
//         document.removeEventListener('mousedown', handleClick);
//       };
//     }
//   }, [open]);

//   if (!user) return null;

//   const toastMeta = toast ? TYPE_META[toast.type] : null;
//   const ToastIcon = toastMeta?.icon;

//   return (
//     <>
//       {/* ══ Popup Toast ══ */}
//       <AnimatePresence>
//         {toast && ToastIcon && (
//           <motion.div
//             initial={{ opacity: 0, x: 80, scale: 0.9 }}
//             animate={{ opacity: 1, x: 0, scale: 1 }}
//             exit={{ opacity: 0, x: 80, scale: 0.9 }}
//             transition={{ type: 'spring', damping: 20, stiffness: 300 }}
//             className="fixed top-16 right-3 sm:top-20 sm:right-6 z-[200] w-[260px] sm:w-[300px] bg-[#0d121f] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
//           >
//             <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
//             <div className="p-2.5 flex items-start gap-2">
//               <div className={`p-1.5 rounded-lg border shrink-0 ${toastMeta!.color}`}>
//                 <ToastIcon className="w-3.5 h-3.5" />
//               </div>
//               <div className="min-w-0 flex-1">
//                 <div className="flex items-center justify-between gap-1">
//                   <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
//                     New · {toastMeta!.label}
//                   </span>
//                   <button type="button" onClick={() => setToast(null)} className="p-0.5 text-slate-500 hover:text-white rounded">
//                     <X className="w-3 h-3" />
//                   </button>
//                 </div>
//                 <p className="text-xs font-bold text-white truncate mt-0.5">{toast.senderName}</p>
//                 <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{toast.preview}</p>
//                 <p className="text-[8px] text-slate-600 font-mono mt-1">{toast.sourceLabel} · {formatTimeAgo(toast.createdAt)}</p>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ══ Bell button ══ */}
//       <div data-notification-bell className="relative">
//         <button
//           type="button"
//           onClick={handleBellClick}
//           aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
//           className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
//         >
//           {/* Ripple ring */}
//           <AnimatePresence>
//             {showRipple && (
//               <motion.span
//                 className="absolute inset-0 rounded-lg border-2 border-cyan-400 pointer-events-none"
//                 initial={{ scale: 1, opacity: 0.8 }}
//                 animate={{ scale: 2, opacity: 0 }}
//                 exit={{ opacity: 0 }}
//                 transition={{ duration: 0.8, ease: 'easeOut' }}
//               />
//             )}
//           </AnimatePresence>

//           {/* Custom bell icon */}
//           <motion.div
//             animate={isShaking ? { rotate: [0, -15, 15, -12, 12, -8, 8, 0] } : { rotate: 0 }}
//             transition={isShaking ? { duration: 1, times: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1], ease: 'easeInOut' } : { duration: 0.2 }}
//           >
//             <BellIcon className={unreadCount > 0 ? 'text-cyan-400' : 'text-slate-400'} />
//           </motion.div>

//           {/* Red badge */}
//           <AnimatePresence>
//             {unreadCount > 0 && (
//               <motion.span
//                 key={unreadCount}
//                 initial={{ scale: 0, opacity: 0 }}
//                 animate={{ scale: [0, 1.2, 1], opacity: 1 }}
//                 exit={{ scale: 0, opacity: 0 }}
//                 transition={{ duration: 0.4, ease: 'easeOut' }}
//                 className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#020617] z-20"
//               >
//                 {unreadCount > 9 ? '9+' : unreadCount}
//               </motion.span>
//             )}
//           </AnimatePresence>
//         </button>

//         {/* ══ Dropdown ══ */}
//         <AnimatePresence>
//           {open && (
//             <motion.div
//               initial={{ opacity: 0, y: -8, scale: 0.96 }}
//               animate={{ opacity: 1, y: 0, scale: 1 }}
//               exit={{ opacity: 0, y: -8, scale: 0.96 }}
//               transition={{ duration: 0.15, ease: 'easeOut' }}
//               className="absolute right-0 top-full mt-2 w-[240px] sm:w-[300px] max-w-[calc(100vw-1.5rem)] bg-[#0d121f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-50"
//               style={{ maxHeight: 'calc(100vh - 5rem)' }}
//             >
//               {/* Header */}
//               <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.06] shrink-0">
//                 <span className="text-[11px] font-bold text-white">
//                   {unreadCount > 0 ? `${unreadCount} New` : 'Notifications'}
//                 </span>
//                 <div className="flex items-center gap-0.5">
//                   {unreadCount > 0 && (
//                     <button type="button" onClick={handleMarkAllRead}
//                       className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-cyan-500/10 transition-colors">
//                       Read all
//                     </button>
//                   )}
//                   <button type="button" onClick={() => setOpen(false)}
//                     className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5" aria-label="Close">
//                     <X className="w-3 h-3" />
//                   </button>
//                 </div>
//               </div>

//               {/* List */}
//               <div className="overflow-y-auto flex-1">
//                 {notifications.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
//                     <CheckCircle2 className="w-5 h-5 text-slate-600 mb-1" />
//                     <p className="text-[10px] text-slate-500">All caught up</p>
//                   </div>
//                 ) : (
//                   notifications.map((n, i) => {
//                     const meta = TYPE_META[n.type];
//                     const Icon = meta.icon;
//                     return (
//                       <div key={`${n.id}-${i}`}
//                         className="flex items-start gap-1.5 px-2.5 py-1.5 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors">
//                         <div className={`p-1 rounded border shrink-0 ${meta.color}`}>
//                           <Icon className="w-2.5 h-2.5" />
//                         </div>
//                         <div className="min-w-0 flex-1">
//                           <div className="flex items-center justify-between gap-1">
//                             <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 font-bold truncate">
//                               {meta.label} · {n.sourceLabel}
//                             </span>
//                             <span className="text-[8px] text-slate-600 font-mono shrink-0">
//                               {formatTimeAgo(n.createdAt)}
//                             </span>
//                           </div>
//                           <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">{n.senderName}</p>
//                           <p className="text-[9px] text-slate-400 line-clamp-1 leading-tight mt-0.5">{n.preview}</p>
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </>
//   );
// };
// -----------------------------------------------------------------------------------------------------------------------------------------
// 'use client';

// /**
//  * NotificationBell — premium notification bell with custom sound.
//  *
//  * FIXES:
//  *   - Sound ONLY plays on real new notifications (NOT on bell click)
//  *   - Notifications DON'T auto-clear on bell click (mark as read on dropdown close)
//  *   - Color-coded by type (cyan=class, amber=order, violet=task, emerald=booking)
//  *   - Ellipsis on long messages
//  *   - Debounced sound (no double-play)
//  *   - Mobile-friendly audio (React <audio> element in DOM)
//  */

// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   X, MessageSquare, Users, Palette, CheckCircle2, ShoppingBag, Briefcase,
// } from 'lucide-react';
// import { useAuth } from '@/contexts/AuthContext';

// // ═══════════════════════════════════════════════════════════════════════════
// // SOUND
// // ═══════════════════════════════════════════════════════════════════════════

// let lastSoundTime = 0;

// function playNotificationSound(audio: HTMLAudioElement | null) {
//   if (!audio) return;
  
//   const now = Date.now();
//   if (now - lastSoundTime < 3000) return;
//   lastSoundTime = now;

//   try {
//     audio.currentTime = 0;
//     const promise = audio.play();
//     if (promise) {
//       promise.catch(() => {
//         // If it failed, try unlocking again right now
//         audio.muted = true;
//         audio.play().then(() => {
//           audio.pause();
//           audio.currentTime = 0;
//           audio.muted = false;
//           // Try playing again
//           audio.play().catch(() => {});
//         }).catch(() => {});
//       });
//     }
//   } catch (e) { /* silent */ }
// }

// // ═══════════════════════════════════════════════════════════════════════════
// // Types & Color Coding
// // ═══════════════════════════════════════════════════════════════════════════

// type NotificationType =
//   | 'classroom' | 'order_chat' | 'assistant_chat'
//   | 'order_placed' | 'order_accepted' | 'order_in_progress'
//   | 'order_completed' | 'order_cancelled'
//   | 'task_assigned' | 'task_started' | 'task_completed' | 'task_declined';

// interface NotificationItem {
//   id: string;
//   type: NotificationType;
//   senderName: string;
//   preview: string;
//   createdAt: string;
//   sourceLabel: string;
// }

// const TYPE_META: Record<string, {
//   icon: React.ComponentType<{ className?: string }>;
//   color: string;
//   border: string;
//   bg: string;
//   label: string;
// }> = {
//   classroom:       { icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'Class' },
//   order_chat:      { icon: Palette,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  border: 'border-l-amber-500',  bg: 'bg-amber-500/[0.03]', label: 'Order' },
//   assistant_chat:  { icon: Users,          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', border: 'border-l-violet-500', bg: 'bg-violet-500/[0.03]', label: 'Task' },
//   order_placed:    { icon: ShoppingBag,    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  border: 'border-l-amber-500',  bg: 'bg-amber-500/[0.03]', label: 'New Order' },
//   order_accepted:  { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Accepted' },
//   order_in_progress: { icon: Briefcase,    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'In Progress' },
//   order_completed: { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Completed' },
//   order_cancelled: { icon: X,              color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     border: 'border-l-rose-500',   bg: 'bg-rose-500/[0.03]',  label: 'Cancelled' },
//   task_assigned:   { icon: Briefcase,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', border: 'border-l-violet-500', bg: 'bg-violet-500/[0.03]', label: 'Assigned' },
//   task_started:    { icon: Briefcase,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'Started' },
//   task_completed:  { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Done' },
//   task_declined:   { icon: X,              color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     border: 'border-l-rose-500',   bg: 'bg-rose-500/[0.03]',  label: 'Declined' },
// };

// const formatTimeAgo = (iso: string): string => {
//   try {
//     const diff = Date.now() - new Date(iso).getTime();
//     const sec = Math.floor(diff / 1000);
//     if (sec < 60) return 'now';
//     const min = Math.floor(sec / 60);
//     if (min < 60) return `${min}m`;
//     const hr = Math.floor(min / 60);
//     if (hr < 24) return `${hr}h`;
//     return `${Math.floor(hr / 24)}d`;
//   } catch { return ''; }
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // Custom Bell Icon
// // ═══════════════════════════════════════════════════════════════════════════

// const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
//   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 3.5-1.2 5.5-2.3 6.8-.5.6-.1 1.5.7 1.5h16.2c.8 0 1.2-.9.7-1.5-1.1-1.3-2.3-3.3-2.3-6.8A6.5 6.5 0 0 0 12 2.5z" />
//     <path d="M10.2 18.8c.3 1 1 1.7 1.8 1.7s1.5-.7 1.8-1.7" />
//   </svg>
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // Component
// // ═══════════════════════════════════════════════════════════════════════════

// export const NotificationBell: React.FC = () => {
//   const { user, apiFetch } = useAuth();
//   const [notifications, setNotifications] = useState<NotificationItem[]>([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [open, setOpen] = useState(false);
//   const [isShaking, setIsShaking] = useState(false);
//   const [showRipple, setShowRipple] = useState(false);
//   const [toast, setToast] = useState<NotificationItem | null>(null);

//   const prevCountRef = useRef<number>(-1);
//   const prevIdsRef = useRef<Set<string>>(new Set());
//   const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const audioRef = useRef<HTMLAudioElement>(null);

//   // Unlock audio on first interaction
//   useEffect(() => {
//     const unlock = () => {
//       const audio = audioRef.current;
//       if (!audio) return;
//       // Play muted to unlock, then unmute
//       audio.muted = true;
//       audio.play().then(() => {
//         audio.pause();
//         audio.currentTime = 0;
//         audio.muted = false;
//       }).catch(() => {});
//       // Remove listener after first unlock attempt
//       document.removeEventListener('click', unlock);
//       document.removeEventListener('touchstart', unlock);
//       document.removeEventListener('keydown', unlock);
//     };
//     document.addEventListener('click', unlock);
//     document.addEventListener('touchstart', unlock);
//     document.addEventListener('keydown', unlock);
//     return () => {
//       document.removeEventListener('click', unlock);
//       document.removeEventListener('touchstart', unlock);
//       document.removeEventListener('keydown', unlock);
//     };
//   }, []);

//   // Fetch notifications
//   const fetchNotifications = useCallback(async () => {
//     if (!user) return;
//     try {
//       const res = await apiFetch('/api/notifications');
//       if (!res.ok) return;
//       const data = await res.json();
//       const newCount: number = data.unreadCount || 0;
//       const newNotifs: NotificationItem[] = data.notifications || [];

//       if (prevCountRef.current !== -1 && newCount > 0) {
//         const newOnes = newNotifs.filter(n => !prevIdsRef.current.has(n.id));
//         if (newOnes.length > 0) {
//           setIsShaking(true);
//           setShowRipple(true);
//           playNotificationSound(audioRef.current);
//           setTimeout(() => setIsShaking(false), 1000);
//           setTimeout(() => setShowRipple(false), 1200);

//           const newest = newOnes[0];
//           setToast(newest);
//           if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
//           toastTimerRef.current = setTimeout(() => setToast(null), 5000);
//         }
//       }

//       prevCountRef.current = newCount;
//       prevIdsRef.current = new Set(newNotifs.map(n => n.id));
//       setNotifications(newNotifs);
//       setUnreadCount(newCount);
//     } catch (e) { /* silent */ }
//   }, [apiFetch, user]);

//   // Polling every 5 seconds
//   useEffect(() => {
//     if (!user) return;
//     void fetchNotifications();
//     pollTimerRef.current = setInterval(() => { void fetchNotifications(); }, 5000);
//     return () => {
//       if (pollTimerRef.current) clearInterval(pollTimerRef.current);
//       if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
//     };
//   }, [user, fetchNotifications]);

//   // Refetch on window focus
//   useEffect(() => {
//     const handleFocus = () => { void fetchNotifications(); };
//     window.addEventListener('focus', handleFocus);
//     document.addEventListener('visibilitychange', () => {
//       if (!document.hidden) void fetchNotifications();
//     });
//     return () => window.removeEventListener('focus', handleFocus);
//   }, [fetchNotifications]);

//   // Bell click — NO sound, NO auto-clear
//   const handleBellClick = () => {
//     setToast(null);
//     setOpen(!open);
//   };

//   // Mark as read when dropdown CLOSES
//   const handleDropdownClose = () => {
//     if (unreadCount > 0) {
//       void handleMarkAllRead();
//     }
//   };

//   const handleMarkAllRead = async () => {
//     setUnreadCount(0);
//     setIsShaking(false);
//     prevCountRef.current = 0;
//     try {
//       await apiFetch('/api/notifications/read', { method: 'POST' });
//     } catch (e) { /* silent */ }
//   };

//   // Close dropdown on outside click
//   useEffect(() => {
//     const handleClick = (e: MouseEvent) => {
//       const target = e.target as HTMLElement;
//       if (!target.closest('[data-notification-bell]')) {
//         if (open) {
//           setOpen(false);
//           handleDropdownClose();
//         }
//       }
//     };
//     if (open) {
//       const timer = setTimeout(() => {
//         document.addEventListener('mousedown', handleClick);
//       }, 100);
//       return () => {
//         clearTimeout(timer);
//         document.removeEventListener('mousedown', handleClick);
//       };
//     }
//   }, [open]);

//   if (!user) return null;

//   const toastMeta = toast ? TYPE_META[toast.type] || TYPE_META.classroom : null;
//   const ToastIcon = toastMeta?.icon;

//   return (
//     <>
//       {/* Hidden audio element in DOM — mobile Chrome requires this */}
//       <audio ref={audioRef} src="/notification.mp3" preload="auto" playsInline />

//       {/* ══ Popup Toast ══ */}
//       <AnimatePresence>
//         {toast && ToastIcon && toastMeta && (
//           <motion.div
//             initial={{ opacity: 0, x: 80, scale: 0.9 }}
//             animate={{ opacity: 1, x: 0, scale: 1 }}
//             exit={{ opacity: 0, x: 80, scale: 0.9 }}
//             transition={{ type: 'spring', damping: 20, stiffness: 300 }}
//             className={`fixed top-16 right-3 sm:top-20 sm:right-6 z-[200] w-[260px] sm:w-[300px] bg-[#0d121f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden border-l-2 ${toastMeta.border}`}
//           >
//             <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
//             <div className={`p-2.5 flex items-start gap-2 ${toastMeta.bg}`}>
//               <div className={`p-1.5 rounded-lg border shrink-0 ${toastMeta.color}`}>
//                 <ToastIcon className="w-3.5 h-3.5" />
//               </div>
//               <div className="min-w-0 flex-1">
//                 <div className="flex items-center justify-between gap-1">
//                   <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
//                     New · {toastMeta.label}
//                   </span>
//                   <button type="button" onClick={() => setToast(null)} className="p-0.5 text-slate-500 hover:text-white rounded">
//                     <X className="w-3 h-3" />
//                   </button>
//                 </div>
//                 <p className="text-xs font-bold text-white truncate mt-0.5">{toast.senderName}</p>
//                 <p className="text-[10px] text-slate-400 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>{toast.preview}</p>
//                 <p className="text-[8px] text-slate-600 font-mono mt-1">{toast.sourceLabel} · {formatTimeAgo(toast.createdAt)}</p>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ══ Bell button ══ */}
//       <div data-notification-bell className="relative">
//         <button
//           type="button"
//           onClick={handleBellClick}
//           aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
//           className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
//         >
//           <AnimatePresence>
//             {showRipple && (
//               <motion.span
//                 className="absolute inset-0 rounded-lg border-2 border-cyan-400 pointer-events-none"
//                 initial={{ scale: 1, opacity: 0.8 }}
//                 animate={{ scale: 2, opacity: 0 }}
//                 exit={{ opacity: 0 }}
//                 transition={{ duration: 0.8, ease: 'easeOut' }}
//               />
//             )}
//           </AnimatePresence>

//           <motion.div
//             animate={isShaking ? { rotate: [0, -15, 15, -12, 12, -8, 8, 0] } : { rotate: 0 }}
//             transition={isShaking ? { duration: 1, times: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1], ease: 'easeInOut' } : { duration: 0.2 }}
//           >
//             <BellIcon className={unreadCount > 0 ? 'text-cyan-400' : 'text-slate-400'} />
//           </motion.div>

//           <AnimatePresence>
//             {unreadCount > 0 && (
//               <motion.span
//                 key={unreadCount}
//                 initial={{ scale: 0, opacity: 0 }}
//                 animate={{ scale: [0, 1.2, 1], opacity: 1 }}
//                 exit={{ scale: 0, opacity: 0 }}
//                 transition={{ duration: 0.4, ease: 'easeOut' }}
//                 className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#020617] z-20"
//               >
//                 {unreadCount > 9 ? '9+' : unreadCount}
//               </motion.span>
//             )}
//           </AnimatePresence>
//         </button>

//         {/* ══ Dropdown ══ */}
//         <AnimatePresence>
//           {open && (
//             <motion.div
//               initial={{ opacity: 0, y: -8, scale: 0.96 }}
//               animate={{ opacity: 1, y: 0, scale: 1 }}
//               exit={{ opacity: 0, y: -8, scale: 0.96 }}
//               transition={{ duration: 0.15, ease: 'easeOut' }}
//               className="absolute right-0 top-full mt-2 w-[240px] sm:w-[300px] max-w-[calc(100vw-1.5rem)] bg-[#0d121f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-50"
//               style={{ maxHeight: 'calc(100vh - 5rem)' }}
//             >
//               {/* Header */}
//               <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.06] shrink-0">
//                 <span className="text-[11px] font-bold text-white">
//                   {unreadCount > 0 ? `${unreadCount} New` : 'Notifications'}
//                 </span>
//                 <div className="flex items-center gap-0.5">
//                   {unreadCount > 0 && (
//                     <button type="button" onClick={handleMarkAllRead}
//                       className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-cyan-500/10 transition-colors">
//                       Read all
//                     </button>
//                   )}
//                   <button type="button" onClick={() => { setOpen(false); handleDropdownClose(); }}
//                     className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5" aria-label="Close">
//                     <X className="w-3 h-3" />
//                   </button>
//                 </div>
//               </div>

//               {/* List */}
//               <div className="overflow-y-auto flex-1">
//                 {notifications.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center py-6 px-3 text-center">
//                     <CheckCircle2 className="w-5 h-5 text-slate-600 mb-1" />
//                     <p className="text-[10px] text-slate-500">All caught up</p>
//                   </div>
//                 ) : (
//                   notifications.map((n, i) => {
//                     const meta = TYPE_META[n.type] || TYPE_META.classroom;
//                     const Icon = meta.icon;
//                     return (
//                       <div key={`${n.id}-${i}`}
//                         className={`flex items-start gap-1.5 px-2.5 py-1.5 border-b border-white/[0.03] last:border-b-0 border-l-2 ${meta.border} ${meta.bg} hover:bg-white/[0.04] transition-colors`}>
//                         <div className={`p-1 rounded border shrink-0 ${meta.color}`}>
//                           <Icon className="w-2.5 h-2.5" />
//                         </div>
//                         <div className="min-w-0 flex-1">
//                           <div className="flex items-center justify-between gap-1">
//                             <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 font-bold truncate">
//                               {meta.label} · {n.sourceLabel}
//                             </span>
//                             <span className="text-[8px] text-slate-600 font-mono shrink-0">
//                               {formatTimeAgo(n.createdAt)}
//                             </span>
//                           </div>
//                           <p className="text-[10px] font-bold text-slate-200 truncate mt-0.5">{n.senderName}</p>
//                           <p className="text-[9px] text-slate-400 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>{n.preview}</p>
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </>
//   );
// };



// ----------------------st---------------------------------------------------------------------------------------------------------------------------------------------------
'use client';

/**
 * NotificationBell — premium notification bell with custom sound.
 *
 * FIXES:
 *   - Badge number perfectly centered (removed conflicting padding)
 *   - Mobile sound fixed (aggressive unlock + DOM audio element)
 *   - Sound ONLY plays on real new notifications (NOT on bell click)
 *   - Notifications DON'T auto-clear on bell click
 *   - Color-coded by type
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageSquare, Users, Palette, CheckCircle2, ShoppingBag, Briefcase,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// SOUND
// ═══════════════════════════════════════════════════════════════════════════

let lastSoundTime = 0;

function playNotificationSound(audio: HTMLAudioElement | null) {
  if (!audio) return;
  
  const now = Date.now();
  if (now - lastSoundTime < 3000) return;
  lastSoundTime = now;

  try {
    audio.currentTime = 0;
    audio.muted = false;
    const promise = audio.play();
    if (promise) {
      promise.catch(() => {
        // If play() fails, try unlocking by playing muted first
        audio.muted = true;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          // Try playing again now that it's unlocked
          audio.play().catch(() => {});
        }).catch(() => {});
      });
    }
  } catch (e) { /* silent */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// Types & Color Coding
// ═══════════════════════════════════════════════════════════════════════════

type NotificationType =
  | 'classroom' | 'order_chat' | 'assistant_chat'
  | 'order_placed' | 'order_accepted' | 'order_in_progress'
  | 'order_completed' | 'order_cancelled'
  | 'task_assigned' | 'task_started' | 'task_completed' | 'task_declined';

interface NotificationItem {
  id: string;
  type: NotificationType;
  senderName: string;
  preview: string;
  createdAt: string;
  sourceLabel: string;
}

const TYPE_META: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  bg: string;
  label: string;
}> = {
  classroom:       { icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'Class' },
  order_chat:      { icon: Palette,        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  border: 'border-l-amber-500',  bg: 'bg-amber-500/[0.03]', label: 'Order' },
  assistant_chat:  { icon: Users,          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', border: 'border-l-violet-500', bg: 'bg-violet-500/[0.03]', label: 'Task' },
  order_placed:    { icon: ShoppingBag,    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  border: 'border-l-amber-500',  bg: 'bg-amber-500/[0.03]', label: 'New Order' },
  order_accepted:  { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Accepted' },
  order_in_progress: { icon: Briefcase,    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'In Progress' },
  order_completed: { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Completed' },
  order_cancelled: { icon: X,              color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     border: 'border-l-rose-500',   bg: 'bg-rose-500/[0.03]',  label: 'Cancelled' },
  task_assigned:   { icon: Briefcase,      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', border: 'border-l-violet-500', bg: 'bg-violet-500/[0.03]', label: 'Assigned' },
  task_started:    { icon: Briefcase,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',     border: 'border-l-cyan-500',   bg: 'bg-cyan-500/[0.03]',  label: 'Started' },
  task_completed:  { icon: CheckCircle2,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-l-emerald-500', bg: 'bg-emerald-500/[0.03]', label: 'Done' },
  task_declined:   { icon: X,              color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',     border: 'border-l-rose-500',   bg: 'bg-rose-500/[0.03]',  label: 'Declined' },
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
// Custom Bell Icon
// ═══════════════════════════════════════════════════════════════════════════

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 3.5-1.2 5.5-2.3 6.8-.5.6-.1 1.5.7 1.5h16.2c.8 0 1.2-.9.7-1.5-1.1-1.3-2.3-3.3-2.3-6.8A6.5 6.5 0 0 0 12 2.5z" />
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

  const prevCountRef = useRef<number>(-1);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Unlock audio on EVERY user interaction (aggressive for mobile) ──
  useEffect(() => {
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio) return;
      // Always try to resume/play to keep audio context warm
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {});
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

      if (prevCountRef.current !== -1 && newCount > 0) {
        const newOnes = newNotifs.filter(n => !prevIdsRef.current.has(n.id));
        if (newOnes.length > 0) {
          setIsShaking(true);
          setShowRipple(true);
          playNotificationSound(audioRef.current);
          setTimeout(() => setIsShaking(false), 1000);
          setTimeout(() => setShowRipple(false), 1200);

          const newest = newOnes[0];
          setToast(newest);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setToast(null), 5000);
        }
      }

      prevCountRef.current = newCount;
      prevIdsRef.current = new Set(newNotifs.map(n => n.id));
      setNotifications(newNotifs);
      setUnreadCount(newCount);
    } catch (e) { /* silent */ }
  }, [apiFetch, user]);

  // ── Polling every 5 seconds ──
  useEffect(() => {
    if (!user) return;
    void fetchNotifications();
    pollTimerRef.current = setInterval(() => { void fetchNotifications(); }, 5000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [user, fetchNotifications]);

  // ── Refetch on window focus ──
  useEffect(() => {
    const handleFocus = () => { void fetchNotifications(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void fetchNotifications();
    });
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchNotifications]);

  // ── Bell click — NO sound, NO auto-clear ──
  const handleBellClick = () => {
    setToast(null);
    setOpen(!open);
  };

  const handleDropdownClose = () => {
    if (unreadCount > 0) {
      void handleMarkAllRead();
    }
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
        if (open) {
          setOpen(false);
          handleDropdownClose();
        }
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

  const toastMeta = toast ? TYPE_META[toast.type] || TYPE_META.classroom : null;
  const ToastIcon = toastMeta?.icon;

  return (
    <>
      {/* ══ Hidden audio element — must be in DOM for mobile browsers ══ */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" playsInline />

      {/* ══ Popup Toast ══ */}
      <AnimatePresence>
        {toast && ToastIcon && toastMeta && (
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`fixed top-16 right-3 sm:top-20 sm:right-6 z-[200] w-[260px] sm:w-[300px] bg-[#0d121f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden border-l-2 ${toastMeta.border}`}
          >
            <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
            <div className={`p-2.5 flex items-start gap-2 ${toastMeta.bg}`}>
              <div className={`p-1.5 rounded-lg border shrink-0 ${toastMeta.color}`}>
                <ToastIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    New · {toastMeta.label}
                  </span>
                  <button type="button" onClick={() => setToast(null)} className="p-0.5 text-slate-500 hover:text-white rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs font-bold text-white truncate mt-0.5">{toast.senderName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>{toast.preview}</p>
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

          {/* Red badge — FIXED CENTERING: removed px-1, using fixed width + flex centering */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#020617] z-20 leading-none"
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
                  <button type="button" onClick={() => { setOpen(false); handleDropdownClose(); }}
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
                    const meta = TYPE_META[n.type] || TYPE_META.classroom;
                    const Icon = meta.icon;
                    return (
                      <div key={`${n.id}-${i}`}
                        className={`flex items-start gap-1.5 px-2.5 py-1.5 border-b border-white/[0.03] last:border-b-0 border-l-2 ${meta.border} ${meta.bg} hover:bg-white/[0.04] transition-colors`}>
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
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-tight overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis' }}>{n.preview}</p>
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