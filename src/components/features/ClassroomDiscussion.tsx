// 'use client';

// import React, { useState, useEffect, useRef } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { useLanguage } from '@/contexts/LanguageContext';
// import {
//   Send,
//   Trash2,
//   MessageSquare,
//   User,
//   ShieldCheck,
//   Hash,
//   Sparkles,
//   Clock,
//   AlertCircle,
//   Loader2,
//   BookOpen,
//   ChevronLeft,
//   Users,
//   GraduationCap,
//   Beaker,
//   Compass,
//   Code,
//   Sparkle,
//   BookmarkCheck,
//   Phone,
//   Video,
//   Info,
//   Paperclip,
//   X,
//   Image as ImageIcon,
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// interface SubjectType {
//   id: string;
//   title: string;
//   description: string;
// }

// interface MessageType {
//   id?: string;
//   _id?: string;
//   userId: string;
//   userName: string;
//   userRole: 'user' | 'admin';
//   content: string;
//   subjectId: string;
//   createdAt: string;
//   userProfilePic?: string;
//   imageUrl?: string;
// }

// interface ClassroomDiscussionProps {
//   subjects: SubjectType[];
// }

// export const ClassroomDiscussion: React.FC<ClassroomDiscussionProps> = ({ subjects }) => {
//   const { user, apiFetch } = useAuth();
//   const { language, t } = useLanguage();
//   const [messages, setMessages] = useState<MessageType[]>([]);
//   const messagesRef = useRef<MessageType[]>([]);
//   const [activeChannelId, setActiveChannelId] = useState<string>('general');
//   const [typedMessage, setTypedMessage] = useState<string>('');
//   const [pendingImage, setPendingImage] = useState<string | null>(null);
//   const [zoomedImage, setZoomedImage] = useState<string | null>(null);
//   const [revealedTimeId, setRevealedTimeId] = useState<string | null>(null);
//   const imageInputRef = useRef<HTMLInputElement>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [submitting, setSubmitting] = useState<boolean>(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   // Close zoom popup on Escape
//   useEffect(() => {
//     if (!zoomedImage) return;
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') setZoomedImage(null);
//     };
//     window.addEventListener('keydown', handler);
//     return () => window.removeEventListener('keydown', handler);
//   }, [zoomedImage]);

//   // Custom mobile screen flow: 'channels' list vs the 'chat' window itself
//   const [mobileView, setMobileView] = useState<'channels' | 'chat'>('chat');

//   const scrollContainerRef = useRef<HTMLDivElement>(null);

//   // Keep messagesRef in sync with messages state so the long-poll loop can
//   // read the latest message timestamp without being a dependency of the effect.
//   useEffect(() => {
//     messagesRef.current = messages;
//   }, [messages]);

//   // Real-time active users — fetched from /api/presence/online every 30s.
//   // Also includes the current user (you) so the lobby always shows at least
//   // one avatar when the user is signed in.
//   const [activeUsers, setActiveUsers] = useState<any[]>([]);

//   // ── Presence: heartbeat every 30s + fetch online users every 30s ──────────
//   // This is the "who's online right now" indicator for the Classroom Lobby.
//   // Heartbeat updates the user's lastSeenAt column; /api/presence/online
//   // returns everyone whose lastSeenAt is within the last 2 minutes.
//   useEffect(() => {
//     if (!user?.id) return; // only heartbeat when authenticated

//     let cancelled = false;

//     // 1. Send a heartbeat immediately (so this user appears online fast)
//     const sendHeartbeat = async () => {
//       try {
//         await apiFetch('/api/presence/heartbeat', { method: 'POST' });
//       } catch {
//         // silent — presence is best-effort
//       }
//     };

//     // 2. Fetch the list of online users
//     const fetchOnline = async () => {
//       try {
//         const res = await apiFetch('/api/presence/online');
//         if (!res.ok) return;
//         const data = await res.json().catch(() => ({ online: [] }));
//         if (cancelled) return;
//         if (Array.isArray(data.online)) {
//           setActiveUsers(data.online);
//         }
//       } catch {
//         // silent — best-effort
//       }
//     };

//     // Kick both off immediately
//     sendHeartbeat();
//     fetchOnline();

//     // Then schedule them on 30s intervals
//     const heartbeatInterval = setInterval(sendHeartbeat, 30_000);
//     const pollInterval = setInterval(fetchOnline, 30_000);

//     // When the user switches back to this tab, refresh immediately
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible') {
//         sendHeartbeat();
//         fetchOnline();
//       }
//     };
//     document.addEventListener('visibilitychange', handleVisibilityChange);

//     return () => {
//       cancelled = true;
//       clearInterval(heartbeatInterval);
//       clearInterval(pollInterval);
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//     };
//   }, [user?.id, apiFetch]);

//   // Quick Action triggers removed per user request — chat input is now clean.

//   // Fetch messages of specified subject channel.
//   // If `since` is provided, uses long-polling (server holds up to 20s waiting
//   // for new messages). Otherwise, fetches the latest 200 messages immediately.
//   const fetchChannelMessages = async (subjId: string, silent: boolean = false, since?: string) => {
//     if (!silent) {
//       setLoading(true);
//       setErrorMessage(null);
//     }
//     try {
//       // Always use /api/chat/[subjectId] — 'general' maps to global (null subjectId)
//       const endpoint = `/api/chat/${subjId}` + (since ? `?since=${encodeURIComponent(since)}` : '');
//       const res = await apiFetch(endpoint);
//       if (res.ok) {
//         const raw = await res.json();
//         // Response shape: { messages: [...], polledAt: '...' }
//         // Handle both old (array) and new ({messages}) shapes for resilience
//         const rawMessages = Array.isArray(raw) ? raw : (raw.messages || []);
//         // Normalize API fields (text -> content, userAvatar -> userProfilePic) to match local MessageType shape
//         const data: MessageType[] = rawMessages.map((m: any) => ({
//           id: m.id,
//           _id: m._id,
//           userId: m.userId,
//           userName: m.userName,
//           userRole: m.userRole === 'admin' ? 'admin' : 'user',
//           content: m.text ?? m.content ?? '',
//           subjectId: m.subjectId ?? subjId,
//           createdAt: m.createdAt,
//           userProfilePic: m.userProfilePic ?? m.userAvatar,
//           imageUrl: m.imageUrl,
//         }));
//         setMessages((prev) => {
//           if (since) {
//             // Long-poll mode — merge new messages into existing
//             if (data.length === 0) return prev;
//             const existingIds = new Set(prev.map(m => m.id || m._id));
//             const newOnes = data.filter(m => !existingIds.has(m.id || m._id));
//             return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
//           }
//           // Initial fetch — replace all
//           return data;
//         });
//       } else if (!silent) {
//         const errData = await res.json();
//         setErrorMessage(errData.error || t('networkLoss'));
//       }
//     } catch (e: any) {
//       if (!silent) {
//         setErrorMessage(t('networkLoss'));
//       }
//     } finally {
//       if (!silent) {
//         setLoading(false);
//       }
//     }
//   };

//   // Image picker — converts to base64 data URL for inline upload
//   const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (imageInputRef.current) imageInputRef.current.value = '';
//     if (!file) return;
//     if (!file.type.startsWith('image/')) {
//       setErrorMessage('Please choose an image file.');
//       return;
//     }
//     if (file.size > 2 * 1024 * 1024) {
//       setErrorMessage('Max 2 MB for chat images.');
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = () => setPendingImage(String(reader.result || ''));
//     reader.onerror = () => setErrorMessage('Could not read image file.');
//     reader.readAsDataURL(file);
//   };

//   // Perform post of typed message content + optional image
//   const handleSendMessage = async (incomingContent?: string) => {
//     const targetContent = incomingContent || typedMessage;
//     // Need either text or an image to send
//     if ((!targetContent.trim() && !pendingImage) || submitting) return;

//     setSubmitting(true);
//     setErrorMessage(null);

//     const messageContent = targetContent;
//     const imageToSend = pendingImage;
//     if (!incomingContent) {
//       setTypedMessage('');
//     }
//     setPendingImage(null);

//     try {
//       // Next.js /api/chat expects { text, subjectId, imageUrl } — pass null for general lounge
//       const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
//       const res = await apiFetch('/api/chat', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           text: messageContent || '(image)',
//           subjectId: subjectPayload,
//           imageUrl: imageToSend || undefined,
//         })
//       });

//       if (res.ok) {
//         const newMsg = await res.json();
//         // Normalize the new message to match local MessageType shape
//         const normalized: MessageType = {
//           id: newMsg.id,
//           _id: newMsg._id,
//           userId: newMsg.userId,
//           userName: newMsg.userName,
//           userRole: newMsg.userRole === 'admin' ? 'admin' : 'user',
//           content: newMsg.text ?? newMsg.content ?? messageContent,
//           subjectId: newMsg.subjectId ?? activeChannelId,
//           createdAt: newMsg.createdAt,
//           userProfilePic: newMsg.userProfilePic ?? newMsg.userAvatar,
//           imageUrl: newMsg.imageUrl,
//         };
//         setMessages((prev) => [...prev, normalized]);
//         // Force scroll-to-bottom on newly typed posts from our side
//         setTimeout(() => {
//           if (scrollContainerRef.current) {
//             scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
//           }
//         }, 80);
//       } else {
//         const errData = await res.json();
//         setErrorMessage(errData.error || "Failed to broadcast message.");
//         if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
//       }
//     } catch (err) {
//       setErrorMessage("Broadcast failed due to structural network discrepancy.");
//       if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleFormSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     await handleSendMessage();
//   };

//   // Perform message eradication (admin or owner only)
//   const handleDeleteMessage = async (msgId: string) => {
//     if (!msgId) return;

//     try {
//       // Next.js /api/chat delete via ?id= query param
//       const res = await apiFetch(`/api/chat?id=${msgId}`, {
//         method: 'DELETE',
//       });

//       if (res.ok) {
//         // Remove locally from UI state
//         setMessages((prev) => prev.filter(m => (m.id || m._id) !== msgId));
//       } else {
//         const errData = await res.json();
//         setErrorMessage(errData.error || "Could not delete message."); setTimeout(() => setErrorMessage(null), 4000);
//       }
//     } catch (err) {
//       setErrorMessage("Network error deleting message."); setTimeout(() => setErrorMessage(null), 4000);
//     }
//   };

//   // ── Client-side polling (Vercel serverless-safe) ──────────────────────
//   // Instead of long-polling (server holds request open 20s — burns Vercel
//   // quota + times out on Hobby plan), the client polls every 3 seconds.
//   // The server returns immediately with any new messages since the last
//   // poll. This is cheaper, simpler, and works on all serverless platforms.
//   useEffect(() => {
//     let cancelled = false;

//     const startPollLoop = async (subjId: string) => {
//       // Initial fetch (no `since` param — get latest 200 messages)
//       await fetchChannelMessages(subjId, false);

//       if (cancelled) return;

//       // Poll loop — fetch new messages every 3 seconds
//       while (!cancelled) {
//         await new Promise((r) => setTimeout(r, 3000));
//         if (cancelled) break;

//         // Get the latest message timestamp to use as the `since` cursor
//         const latestMsg = messagesRef.current[messagesRef.current.length - 1];
//         const since = latestMsg?.createdAt || new Date(0).toISOString();

//         // Fetch only new messages since the last poll
//         await fetchChannelMessages(subjId, true, since);
//       }
//     };

//     startPollLoop(activeChannelId);

//     return () => {
//       cancelled = true;
//     };
//   }, [activeChannelId]);

//   // Listen to WebSocket-triggered immediate reload event for instantaneous responsiveness
//   useEffect(() => {
//     const handleRemoteChatUpdate = (e: Event) => {
//       const customEvent = e as CustomEvent;
//       if (customEvent.detail && customEvent.detail.subjectId === activeChannelId) {
//         fetchChannelMessages(activeChannelId, true);
//       }
//     };

//     window.addEventListener('chat-updated', handleRemoteChatUpdate);
//     return () => {
//       window.removeEventListener('chat-updated', handleRemoteChatUpdate);
//     };
//   }, [activeChannelId]);
//   // (Old placeholder presence code removed — real presence is now handled
//   // by the heartbeat/online useEffect above.)

//   // Handle user-friendly quiet auto-scrolling on load or when sending message
//   const lastMessageCountRef = useRef<number>(0);
//   useEffect(() => {
//     const scrollContainer = scrollContainerRef.current;
//     if (!scrollContainer) return;

//     if (messages.length > lastMessageCountRef.current) {
//       const lastMsg = messages[messages.length - 1];
//       const isMyMessage = lastMsg && lastMsg.userId === user?.id;
//       const isInitialScroll = !loading && lastMessageCountRef.current === 0;

//       // Scroll to bottom immediately if it's the initial load or if the user sent a new message
//       if (isInitialScroll || isMyMessage) {
//         scrollContainer.scrollTop = scrollContainer.scrollHeight;
//       } else {
//         // If someone else posted, scroll down only if the user is already near the bottom
//         // (to prevent interrupting their reading of history)
//         const threshold = 180; // pixels from bottom threshold zone
//         const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
//         if (isNearBottom) {
//           scrollContainer.scrollTop = scrollContainer.scrollHeight;
//         }
//       }
//     }
//     lastMessageCountRef.current = messages.length;
//   }, [messages, loading, user?.id]);

//   const activeChannelObj = subjects.find(s => s.id === activeChannelId);
//   const activeChannelTitle = activeChannelId === 'general' ? 'General Academic Lounge' : `${activeChannelObj?.title} Support Channel`;
//   const activeChannelDesc = activeChannelId === 'general'
//     ? 'Universal classroom bulletin board and loose peer conversation space.'
//     : activeChannelObj?.description;

//   // Format time only (HH:MM AM/PM)
//   const formatDateLabel = (isoStr: string) => {
//     try {
//       const date = new Date(isoStr);
//       return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     } catch (e) {
//       return '';
//     }
//   };

//   // Format a date as a separator label: "Today", "Yesterday", or "September 19, 2026"
//   const formatDateSeparator = (isoStr: string) => {
//     try {
//       const date = new Date(isoStr);
//       const now = new Date();
//       const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//       const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
//       const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

//       if (msgDate.getTime() === today.getTime()) return 'Today';
//       if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
//       return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
//     } catch (e) {
//       return '';
//     }
//   };

//   // Returns a date key (YYYY-M-D) for comparing days
//   const getDateKey = (isoStr: string) => {
//     try {
//       const d = new Date(isoStr);
//       return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
//     } catch (e) {
//       return '';
//     }
//   };

//   // Full date+time for tooltip (e.g., "Sep 19, 2026, 02:30 PM")
//   const formatFullDateTime = (isoStr: string) => {
//     try {
//       return new Date(isoStr).toLocaleString([], {
//         month: 'short', day: 'numeric', year: 'numeric',
//         hour: '2-digit', minute: '2-digit',
//       });
//     } catch (e) {
//       return '';
//     }
//   };

//   // Assign specific visual descriptors, emojis, and icons of subjects for professional feel
//   const getSubjectIcon = (title: string, sizeClass = "w-4 h-4") => {
//     const l = title.toLowerCase();
//     if (l.includes('physic')) return <Compass className={`${sizeClass} text-indigo-400`} />;
//     if (l.includes('chemist')) return <Beaker className={`${sizeClass} text-emerald-400`} />;
//     if (l.includes('biolog')) return <Sparkle className={`${sizeClass} text-amber-400`} />;
//     if (l.includes('math')) return <GraduationCap className={`${sizeClass} text-pink-400`} />;
//     if (l.includes('ict')) return <Code className={`${sizeClass} text-cyan-400`} />;
//     return <Hash className={`${sizeClass} text-slate-450`} />;
//   };

//   const getSubjectGradient = (title: string) => {
//     const l = title.toLowerCase();
//     if (l.includes('physic')) return 'from-indigo-505/20 to-indigo-950/25 border-indigo-500/20 text-indigo-350';
//     if (l.includes('chemist')) return 'from-emerald-505/20 to-emerald-950/25 border-emerald-500/20 text-emerald-350';
//     if (l.includes('biolog')) return 'from-amber-505/20 to-amber-950/25 border-amber-500/20 text-amber-350';
//     if (l.includes('math')) return 'from-pink-505/20 to-pink-950/25 border-pink-500/20 text-pink-350';
//     if (l.includes('ict')) return 'from-cyan-505/20 to-cyan-950/25 border-cyan-500/20 text-cyan-350';
//     return 'from-slate-800/10 to-slate-950/20 border-white/5 text-slate-350';
//   };

//   return (
//     <div
//       id="classroom-chat-root"
//       className="
//                 w-full h-[calc(100dvh-140px)] lg:h-[calc(100vh-180px)]
//         flex flex-col lg:flex-row
//         rounded-3xl border border-white/6
//         bg-slate-950/40 overflow-hidden
//         backdrop-blur-2xl relative shadow-2xl
//       "
//     >
//       {/* ───────────────────────────────────────────────────────────────────
//           CHANNELS SIDEBAR (left on desktop, full-screen on mobile when mobileView='channels')
//           ─────────────────────────────────────────────────────────────────── */}
//       <aside
//         className={`
//           w-full lg:w-80 xl:w-96 shrink-0
//           flex flex-col gap-3
//           bg-slate-950/70 border-r border-white/4
//           overflow-hidden
//           ${mobileView === 'channels' ? 'flex' : 'hidden lg:flex'}
//         `}
//       >
//         {/* Sidebar header */}
//         <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
//           <div className="flex items-center gap-2 min-w-0">
//             <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 shrink-0">
//               <Users className="w-3.5 h-3.5 text-pink-400" />
//             </div>
//             <span className="font-mono text-[10px] uppercase font-black tracking-widest text-slate-300 truncate">
//               {t('lobby')}
//             </span>
//           </div>
//           <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
//             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
//             {t('synced')}
//           </span>
//         </div>

//         {/* Active users strip */}
//         <div className="px-3 shrink-0">
//           <div className="bg-slate-900/40 border border-white/3 p-2.5 rounded-2xl">
//             <div className="flex items-center justify-between mb-2">
//               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('activeScholars')}</span>
//               <span className="text-[9px] font-mono text-cyan-400">{activeUsers.length} {t('onlineSuffix')}</span>
//             </div>
//                         <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
//               {activeUsers.length === 0 ? (
//                 <span className="text-[10px] text-slate-500 italic px-1">No scholars online right now</span>
//               ) : (
//                 activeUsers.slice(0, 8).map((item, idx) => (
//                   <div key={item.id || idx} className="relative group shrink-0 flex flex-col items-center gap-1" title={`${item.name} (${item.role})${item.isYou ? ' — you' : ''}`}>
//                     <div className="relative">
//                       {item.profilePic ? (
//                         <img
//                           src={item.profilePic}
//                           alt={item.name}
//                           referrerPolicy="no-referrer"
//                           className={`w-8 h-8 rounded-full object-cover bg-slate-950 ${item.isYou ? 'border-2 border-cyan-400' : 'border border-emerald-500/60'}`}
//                         />
//                       ) : (
//                         <div className={`w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-200 text-[10px] font-bold ${item.isYou ? 'border-2 border-cyan-400' : 'border border-emerald-500/60'}`}>
//                           {item.name ? item.name.charAt(0).toUpperCase() : '?'}
//                         </div>
//                       )}
//                       <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
//                     </div>
//                     <span className={`text-[8px] font-bold max-w-[44px] truncate leading-none text-center ${item.isYou ? 'text-cyan-400' : 'text-slate-400'}`}>
//                       {item.isYou ? 'You' : (item.name ? item.name.split(' ')[0] : 'Scholar')}
//                     </span>
//                   </div>
//                 ))
//               )}
//             </div>

//           </div>
//         </div>

//         {/* Channel list */}
//         <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 scrollbar-thin">
//           <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1 font-mono">
//             {t('chatRooms')}
//           </span>

//           {/* General channel */}
//           <button
//             onClick={() => {
//               setActiveChannelId('general');
//               setMobileView('chat');
//             }}
//             className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-2xl text-xs font-semibold cursor-pointer transition-all border text-left ${
//               activeChannelId === 'general'
//                 ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-500/30 text-cyan-200'
//                 : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'
//             }`}
//           >
//             <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 shrink-0">
//               <Hash className="w-3.5 h-3.5" />
//             </div>
//             <div className="min-w-0 flex-1">
//               <div className="font-bold truncate">General Lounge</div>
//               <div className="text-[9px] text-slate-500 truncate">Open discussion for everyone</div>
//             </div>
//           </button>

//           {/* Subject channels */}
//           {subjects.map((subj) => {
//             const isActive = activeChannelId === subj.id;
//             return (
//               <button
//                 key={subj.id}
//                 onClick={() => {
//                   setActiveChannelId(subj.id);
//                   setMobileView('chat');
//                 }}
//                 className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-2xl text-xs font-semibold cursor-pointer transition-all border text-left ${
//                   isActive
//                     ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-500/30 text-cyan-200'
//                     : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'
//                 }`}
//               >
//                 <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 shrink-0">
//                   {getSubjectIcon(subj.title, "w-3.5 h-3.5")}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <div className="font-bold truncate">{subj.title}</div>
//                   <div className="text-[9px] text-slate-500 truncate">{subj.description}</div>
//                 </div>
//               </button>
//             );
//           })}

//           {subjects.length === 0 && (
//             <div className="text-center text-[10px] text-slate-600 py-4">
//               No subject channels yet.
//             </div>
//           )}
//         </div>
//       </aside>

//       {/* ───────────────────────────────────────────────────────────────────
//           CHAT PANEL (right on desktop, full-screen on mobile when mobileView='chat')
//           ─────────────────────────────────────────────────────────────────── */}
//       <section
//         className={`
//           flex-1 flex flex-col min-w-0 overflow-hidden
//           ${mobileView === 'chat' ? 'flex' : 'hidden lg:flex'}
//         `}
//       >
//         {/* Chat header */}
//         <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-white/[0.04] bg-slate-950/60 shrink-0">
//           <div className="flex items-center gap-2 min-w-0 flex-1">
//             {/* Mobile back button */}
//             <button
//               onClick={() => setMobileView('channels')}
//               className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
//               title="Back to channels"
//             >
//               <ChevronLeft className="w-5 h-5" />
//             </button>

//             <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/5 shrink-0 hidden sm:block">
//               {getSubjectIcon(activeChannelObj?.title || 'General', "w-5 h-5")}
//             </div>

//             <div className="min-w-0 flex-1">
//               <h2 className="text-sm font-bold text-white truncate">{activeChannelTitle}</h2>
//               <p className="text-[10px] text-slate-400 truncate hidden sm:block">{activeChannelDesc}</p>
//             </div>
//           </div>

//           <div className="flex items-center gap-2 shrink-0">
//             <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/5 px-2 py-1 rounded-lg">
//               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
//               <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-wider hidden sm:inline">{t('activeStream')}</span>
//             </div>
//           </div>
//         </div>

//         {/* Error banner */}
//         {errorMessage && (
//           <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200 shrink-0">
//             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
//             <div className="min-w-0 flex-1">
//               <span className="font-bold block">{t('networkAlert')}</span>
//               <span className="text-rose-300/80 text-[11px] mt-0.5 block break-words">{errorMessage}</span>
//             </div>
//             <button
//               onClick={() => setErrorMessage(null)}
//               className="p-1 hover:bg-rose-500/20 rounded text-rose-300 shrink-0"
//             >
//               <X className="w-3 h-3" />
//             </button>
//           </div>
//         )}

//         {/* Messages feed */}
//         <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 scrollbar-thin">

//           {loading ? (
//             <div className="h-full flex flex-col items-center justify-center gap-3">
//               <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
//               <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Synchronizing…</span>
//             </div>
//           ) : messages.length === 0 ? (
//             <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-3">
//               <div className="p-4 bg-cyan-500/5 rounded-full border border-cyan-500/10 text-cyan-400">
//                 <MessageSquare className="w-6 h-6" />
//               </div>
//               <div>
//                 <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">{t('academicRoom')}</h4>
//                 <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">{t('noPostsYet')}</p>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {messages.map((msg, index) => {
//                 const isMine = msg.userId === user?.id;
//                 const dbId = msg.id || msg._id;
//                 const isTeacher = msg.userRole === 'admin';
//                 const hasImage = !!msg.imageUrl;
//                 const hasText = !!(msg.content && msg.content.trim() && msg.content !== '(image)');

//                 // Date separator — show when day changes from previous message
//                 const currentDateKey = getDateKey(msg.createdAt);
//                 const prevMsg = messages[index - 1];
//                 const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
//                 const showDateSeparator = currentDateKey !== prevDateKey;

//                 return (
//                   <div key={`${dbId || `msg-${index}`}-${index}`} className="w-full">
//                     {/* Date separator — Today / Yesterday / full date */}
//                     {showDateSeparator && (
//                       <div className="flex items-center justify-center my-4 first:mt-0">
//                         <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-white/[0.06]">
//                           <span className="w-1 h-1 rounded-full bg-cyan-400" />
//                           <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
//                             {formatDateSeparator(msg.createdAt)}
//                           </span>
//                           <span className="w-1 h-1 rounded-full bg-cyan-400" />
//                         </div>
//                       </div>
//                     )}
//                     <motion.div
//                       initial={{ opacity: 0, y: 8 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ duration: 0.2 }}
//                       className={`flex gap-2 sm:gap-3 w-full ${isMine ? 'justify-end' : 'justify-start'}`}
//                     >
//                     {/* Avatar — for others: left side; for me: right side (rendered first, flex-row handles order) */}
//                     {!isMine && (
//                       msg.userProfilePic ? (
//                         <img
//                           src={msg.userProfilePic}
//                           alt={msg.userName}
//                           referrerPolicy="no-referrer"
//                           className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border self-end ${
//                             isTeacher ? 'border-amber-400/40' : 'border-white/10'
//                           }`}
//                         />
//                       ) : (
//                         <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border mt-4 ${
//                           isTeacher
//                             ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
//                             : 'bg-slate-800 border border-white/5 text-slate-400'
//                         }`}>
//                           {msg.userName?.charAt(0).toUpperCase() || '?'}
//                         </div>
//                       )
//                     )}

//                     {/* Bubble column — sizes to content, max 80% width */}
//                     <div className="min-w-0 flex flex-col" style={{ maxWidth: '80%' }}>
//                       {/* Name + role badge */}
//                       <div className={`flex items-center gap-1.5 text-[10px] mb-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
//                         <span className={`font-bold ${isTeacher ? 'text-amber-300' : 'text-slate-300'}`}>
//                           {isMine ? 'You' : msg.userName}
//                         </span>
//                         {isTeacher && (
//                           <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono font-bold uppercase">
//                             {t('teacher')}
//                           </span>
//                         )}
//                       </div>

//                       {/* Image (if present) */}
//                       {hasImage && (
//                         <div className={`mb-1 ${isMine ? 'flex justify-end' : 'flex justify-start'}`}>
//                           <img
//                             src={msg.imageUrl}
//                             alt="Shared"
//                             referrerPolicy="no-referrer"
//                             className="max-w-full max-h-64 rounded-2xl border border-white/10 object-cover cursor-pointer hover:opacity-90 transition-opacity"
//                             onClick={() => setZoomedImage(msg.imageUrl!)}
//                           />
//                         </div>
//                       )}

//                       {/* Text (if present) */}
//                       {hasText && (
//                         <div className={isMine ? 'flex justify-end' : 'flex justify-start'}>
//                           <div
//                             className={`
//                               inline-block px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed break-words
//                               ${isMine
//                                 ? 'bg-cyan-500 text-white rounded-2xl rounded-br-md'
//                                 : isTeacher
//                                   ? 'bg-slate-900 border border-amber-500/20 text-amber-50 rounded-2xl rounded-bl-md'
//                                   : 'bg-slate-900 border border-white/[0.06] text-slate-200 rounded-2xl rounded-bl-md'
//                               }
//                             `}
//                           >
//                             <p className="whitespace-pre-line">{msg.content}</p>
//                           </div>
//                         </div>
//                       )}

//                       {/* Always-visible time below bubble */}
//                       <div className={`flex items-center gap-1 mt-1 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
//                         <span
//                           title={formatFullDateTime(msg.createdAt)}
//                           className="text-[9px] sm:text-[10px] font-mono text-slate-500 cursor-help"
//                         >
//                           {formatDateLabel(msg.createdAt)}
//                         </span>
//                       </div>
//                     </div>

//                     {/* Own avatar — right side for my messages */}
//                     {isMine && (
//                       msg.userProfilePic ? (
//                         <img
//                           src={msg.userProfilePic}
//                           alt="You"
//                           referrerPolicy="no-referrer"
//                           className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border border-cyan-500/30 self-end"
//                         />
//                       ) : (
//                         <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300 text-xs font-bold self-end">
//                           {user?.name?.charAt(0).toUpperCase() || 'M'}
//                         </div>
//                       )
//                     )}
//                     </motion.div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//         {/* Pending image preview (above input) */}
//         {pendingImage && (
//           <div className="px-3 sm:px-4 pb-2 shrink-0">
//             <div className="inline-flex items-end gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/10">
//               <div className="relative">
//                 <img
//                   src={pendingImage}
//                   alt="Pending upload"
//                   className="w-16 h-16 object-cover rounded-lg border border-white/10"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setPendingImage(null)}
//                   className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-400 transition-colors"
//                   title="Remove image"
//                 >
//                   <X className="w-3 h-3" />
//                 </button>
//               </div>
//               <span className="text-[10px] text-slate-400 pb-1">Press send to share</span>
//             </div>
//           </div>
//         )}

//         {/* Input bar */}
//         <div className="border-t border-white/[0.04] bg-slate-950/60 p-3 sm:p-4 shrink-0">
//           <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
//             <input
//               ref={imageInputRef}
//               type="file"
//               accept="image/*"
//               onChange={handleImagePick}
//               className="hidden"
//             />

//             {/* Paperclip */}
//             <button
//               type="button"
//               onClick={() => imageInputRef.current?.click()}
//               disabled={submitting}
//               className="shrink-0 w-10 h-10 rounded-full bg-slate-900 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all disabled:opacity-40"
//               title="Attach image"
//             >
//               <Paperclip className="w-4 h-4" />
//             </button>

//             {/* Textarea */}
//             <textarea
//               value={typedMessage}
//               onChange={(e) => setTypedMessage(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                   e.preventDefault();
//                   handleSendMessage();
//                 }
//               }}
//               rows={1}
//               maxLength={4000}
//               placeholder={pendingImage ? 'Add a caption…' : 'Type a message…'}
//               className="flex-1 min-w-0 min-h-[40px] max-h-32 resize-none bg-slate-900 border border-white/5 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 px-3 py-2 rounded-2xl text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all overflow-y-auto"
//             />

//             {/* Send */}
//             <button
//               type="submit"
//               disabled={(!typedMessage.trim() && !pendingImage) || submitting}
//               className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-indigo-600/20"
//               title="Send message"
//             >
//               {submitting ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <Send className="w-4 h-4" />
//               )}
//             </button>
//           </form>
//         </div>
//       </section>

//       {/* Image zoom popup — fullscreen overlay when a chat image is clicked */}
//       {zoomedImage && (
//         <div
//           className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-pointer"
//           onClick={() => setZoomedImage(null)}
//         >
//           {/* Close button */}
//           <button
//             className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-colors z-10"
//             onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
//             aria-label="Close image"
//           >
//             <X className="w-5 h-5" />
//           </button>

//           {/* Zoomable image — click to toggle zoom, drag to pan when zoomed */}
//           <img
//             src={zoomedImage}
//             alt="Zoomed image"
//             referrerPolicy="no-referrer"
//             className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl select-none"
//             onClick={(e) => e.stopPropagation()}
//             style={{ cursor: 'zoom-in' }}
//           />

//           {/* Hint text */}
//           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono uppercase tracking-wider pointer-events-none">
//             Click anywhere outside to close
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };










'use client';

/**
 * ClassroomDiscussion — Premium real-time classroom chat.
 *
 * Features:
 *   - Real-time polling (5s) for new messages
 *   - Subject channels (Physics, Chemistry, etc.) + General chat
 *   - Image attachments (upload + URL paste + click-to-zoom)
 *   - Teacher badges and color coding
 *   - Date separators (Today, Yesterday, etc.)
 *   - Always-visible timestamps with hover tooltips
 *   - Messenger-style message alignment (avatar at top corner)
 *   - Mobile-optimized layout (fixed height, scrolling messages)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Loader2, AlertCircle, Image as ImageIcon,
  Hash, Sparkles, Star, TrendingUp, X, ZoomIn,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

interface MessageType {
  id: string;
  _id?: string;
  subjectId: string | null;
  userId: string;
  userName: string;
  userProfilePic?: string | null;
  userRole: string;
  text: string;
  content?: string; // Fallback for older API format
  imageUrl?: string | null;
  createdAt: string;
}

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Higher Math', 'ICT'];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ClassroomDiscussion: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const { t } = useLanguage();
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('channels');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPollDateRef = useRef<string | null>(null);

  // ── Fetch subjects ──
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiFetch('/api/subjects');
        if (res.ok) {
          const data = await res.json();
          setSubjects(Array.isArray(data) ? data : data.subjects || []);
        }
      } catch (e) {
        // Silent fail — subjects are optional
      }
    };
    void fetchSubjects();
  }, [apiFetch]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(async (isInitial: boolean = false) => {
    if (!activeChannelId) return;
    
    try {
      const url = activeChannelId === 'general'
        ? '/api/chat/general'
        : `/api/chat/${activeChannelId}`;
        
      const fullUrl = lastPollDateRef.current && !isInitial
        ? `${url}${url.includes('?') ? '&' : '?'}since=${encodeURIComponent(lastPollDateRef.current)}`
        : url;
        
      const res = await apiFetch(fullUrl);
      if (!res.ok) throw new Error('Failed to load messages');
      
      const data = await res.json();
      lastPollDateRef.current = data.polledAt || new Date().toISOString();
      
      if (data.messages && data.messages.length > 0) {
        const newMessages = data.messages.map((m: any) => ({
          ...m,
          id: m.id || m._id,
          text: m.text || m.content || '',
        }));
        
        setMessages(prev => isInitial ? newMessages : [...prev, ...newMessages]);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    } catch (e: any) {
      if (isInitial) setError(e?.message || 'Failed to load messages');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [apiFetch, activeChannelId]);

  // ── Initial load + polling ──
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setInput('');
    lastPollDateRef.current = null;
    
    void fetchMessages(true);
    
    pollTimerRef.current = setInterval(() => {
      void fetchMessages(false);
    }, 5000);
    
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchMessages]);

  // ── Send message ──
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingImage) || loading) return;

    const messageText = input.trim();
    const imageData = pendingImage;
    setInput('');
    setPendingImage(null);

    try {
      const body: any = {
        subjectId: activeChannelId === 'general' ? null : activeChannelId,
        text: messageText,
      };
      if (imageData) body.imageUrl = imageData;

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send message');
      setInput(messageText);
      if (imageData) setPendingImage(imageData);
    }
  };

  // ── Image upload ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Max 4 MB per image.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(String(reader.result || ''));
    };
    reader.onerror = () => setError('Could not read image file.');
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Helpers ──
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatDateSeparator = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (msgDate.getTime() === today.getTime()) return 'Today';
      if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return ''; }
  };

  const getDateKey = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    } catch { return ''; }
  };

  const formatFullDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  const activeChannelObj = subjects.find(s => s.id === activeChannelId);
  const activeChannelName = activeChannelId === 'general'
    ? 'General Discussion'
    : activeChannelObj?.title || 'Discussion';

  const activeChannelDesc = activeChannelId === 'general'
    ? 'Universal classroom bulletin board and loose peer conversation space.'
    : activeChannelObj?.description;

  // ── Subject icon helper ──
  const getSubjectIcon = (title: string, sizeClass = 'w-4 h-4') => {
    const l = title.toLowerCase();
    if (l.includes('physic')) return <Sparkles className={`${sizeClass} text-indigo-400`} />;
    if (l.includes('chemist')) return <Star className={`${sizeClass} text-emerald-400`} />;
    if (l.includes('biolog')) return <TrendingUp className={`${sizeClass} text-amber-400`} />;
    if (l.includes('math')) return <Hash className={`${sizeClass} text-pink-400`} />;
    if (l.includes('ict')) return <MessageSquare className={`${sizeClass} text-cyan-400`} />;
    return <Hash className={`${sizeClass} text-slate-400`} />;
  };

  if (!user) return null;

  return (
    <div
      className="
        w-full h-[calc(100dvh-140px)] lg:h-[calc(100vh-180px)]
        flex flex-col lg:flex-row
        rounded-3xl border border-white/6
        bg-slate-950/40 overflow-hidden
        backdrop-blur-2xl relative shadow-2xl
      "
    >
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* ───────────────────────────────────────────────────────────────────
          CHANNELS SIDEBAR (left on desktop, full-screen on mobile when mobileView='channels')
          ─────────────────────────────────────────────────────────────────── */}
      <aside
        className={`
          w-full lg:w-80 xl:w-96 shrink-0
          flex flex-col gap-3
          p-4 sm:p-5
          border-b lg:border-b-0 lg:border-r border-white/[0.06]
          bg-slate-950/60
          ${mobileView === 'channels' ? 'flex' : 'hidden'} lg:flex
        `}
      >
        {/* Header */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Classroom</h2>
              <p className="text-[10px] text-slate-500">{t('discussion')}</p>
            </div>
          </div>
        </div>

        {/* Channels list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
          {/* General channel */}
          <button
            onClick={() => {
              setActiveChannelId('general');
              setMobileView('chat');
            }}
            className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
              activeChannelId === 'general'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-slate-900/40 border-white/[0.04] text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <div className={`p-1.5 rounded-lg border shrink-0 ${
              activeChannelId === 'general'
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-slate-800 border-white/5 text-slate-500'
            }`}>
              <Hash className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">General</p>
              <p className="text-[9px] text-slate-500 truncate">Everyone · Open chat</p>
            </div>
          </button>

          {/* Subject channels */}
          {subjects.map((subj) => (
            <button
              key={subj.id}
              onClick={() => {
                setActiveChannelId(subj.id);
                setMobileView('chat');
              }}
              className={`w-full flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                activeChannelId === subj.id
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-900/40 border-white/[0.04] text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg border shrink-0 ${
                activeChannelId === subj.id
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                  : 'bg-slate-800 border-white/5 text-slate-500'
              }`}>
                {getSubjectIcon(subj.title)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{subj.title}</p>
                <p className="text-[9px] text-slate-500 truncate">{subj.description || 'Subject chat'}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────────────
          CHAT AREA (right on desktop, full-screen on mobile when mobileView='chat')
          ─────────────────────────────────────────────────────────────────── */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 overflow-hidden
          ${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex
        `}
      >
        {/* Chat Header */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-white/[0.06] shrink-0 bg-slate-950/60">
          {/* Back button (mobile only) */}
          <button
            onClick={() => setMobileView('channels')}
            className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Back to channels"
          >
            <X className="w-4 h-4 rotate-180" />
          </button>
          
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
            {activeChannelId === 'general' ? <Hash className="w-4 h-4" /> : getSubjectIcon(activeChannelName)}
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-white truncate">{activeChannelName}</h3>
            <p className="text-[10px] text-slate-500 truncate">{activeChannelDesc}</p>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 scrollbar-thin"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 text-center px-4">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-rose-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  void fetchMessages(true);
                }}
                className="text-xs text-cyan-400 underline"
              >
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 text-center px-4">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-500">No messages yet.</p>
              <p className="text-[10px] text-slate-600">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.userId === user?.id;
              const isTeacher = msg.userRole === 'admin';
              const hasImage = !!msg.imageUrl;
              const hasText = !!(msg.text && msg.text.trim() && msg.text !== '(image)');

              const currentDateKey = getDateKey(msg.createdAt);
              const prevMsg = messages[index - 1];
              const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
              const showDateSeparator = currentDateKey !== prevDateKey;

              return (
                <div key={`${msg.id || msg._id}-${index}`} className="space-y-2">
                  {/* Date separator */}
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4 first:mt-0">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-white/[0.06]">
                        <span className="w-1 h-1 rounded-full bg-cyan-400" />
                        <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      </div>
                    </div>
                  )}

                  {/* Message row — aligned to top like Messenger */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-2 sm:gap-3 w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar — for others: left side */}
                    {!isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt={msg.userName}
                          referrerPolicy="no-referrer"
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border mt-4 ${
                            isTeacher ? 'border-amber-400/40' : 'border-white/10'
                          }`}
                        />
                      ) : (
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-4 ${
                          isTeacher
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-slate-800 border border-white/5 text-slate-400'
                        }`}>
                          {msg.userName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )
                    )}

                    {/* Bubble column */}
                    <div className="min-w-0 flex flex-col" style={{ maxWidth: '80%' }}>
                      {/* Name + role badge */}
                      <div className={`flex items-center gap-1.5 text-[10px] mb-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`font-bold ${isTeacher ? 'text-amber-300' : 'text-slate-300'}`}>
                          {isMine ? 'You' : msg.userName}
                        </span>
                        {isTeacher && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono font-bold uppercase">
                            {t('teacher')}
                          </span>
                        )}
                      </div>

                      {/* Image (if present) */}
                      {hasImage && (
                        <div className={`mb-1 ${isMine ? 'flex justify-end' : 'flex justify-start'}`}>
                          <img
                            src={msg.imageUrl!}
                            alt="Shared"
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-64 rounded-2xl border border-white/10 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setZoomedImage(msg.imageUrl!)}
                          />
                        </div>
                      )}

                      {/* Text (if present) */}
                      {hasText && (
                        <div className={isMine ? 'flex justify-right' : 'flex justify-left'}>
                          <div
                            className={`
                              inline-block px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed break-words
                              ${isMine
                                ? 'bg-cyan-500 text-white rounded-2xl rounded-br-md'
                                : isTeacher
                                  ? 'bg-slate-900 border border-amber-500/20 text-amber-50 rounded-2xl rounded-bl-md'
                                  : 'bg-slate-900 border border-white/[0.06] text-slate-200 rounded-2xl rounded-bl-md'
                              }
                            `}
                          >
                            <p className="whitespace-pre-line">{msg.text}</p>
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p
                        title={formatFullDateTime(msg.createdAt)}
                        className={`text-[9px] text-slate-500 mt-0.5 cursor-help ${
                          isMine ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>

                    {/* Avatar — for me: right side */}
                    {isMine && (
                      user.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt="You"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border border-cyan-500/30 mt-4"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 mt-4">
                          {user.name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                      )
                    )}
                  </motion.div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending image preview (above input) */}
        {pendingImage && (
          <div className="px-3 sm:px-4 pb-2 shrink-0">
            <div className="inline-flex items-end gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/10">
              <img
                src={pendingImage}
                alt="Pending upload"
                className="w-16 h-16 object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="p-1.5 text-slate-400 hover:text-rose-300 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div
          className="p-3 sm:p-4 border-t border-white/[0.06] shrink-0 bg-slate-950/60"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        >
          <form onSubmit={handleSend} className="flex items-end gap-2">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.06] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all shrink-0"
              aria-label="Upload image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-900/60 border border-white/[0.06] focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 rounded-xl px-4 py-2.5 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all min-h-[44px]"
              maxLength={1000}
              disabled={loading}
              autoComplete="off"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={(!input.trim() && !pendingImage) || loading}
              className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Image zoom modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-full max-h-full"
            >
              <img
                src={zoomedImage}
                alt="Zoomed"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl border border-white/10"
              />
              <button
                onClick={() => setZoomedImage(null)}
                className="absolute -top-3 -right-3 p-2 bg-slate-900 border border-white/10 rounded-full text-white hover:bg-slate-800 transition-colors"
                aria-label="Close zoom"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};