'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Send,
  Trash2,
  MessageSquare,
  User,
  ShieldCheck,
  Hash,
  Sparkles,
  Clock,
  AlertCircle,
  Loader2,
  BookOpen,
  ChevronLeft,
  Users,
  GraduationCap,
  Beaker,
  Compass,
  Code,
  Sparkle,
  BookmarkCheck,
  Phone,
  Video,
  Info,
  Paperclip,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubjectType {
  id: string;
  title: string;
  description: string;
}

interface MessageType {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  content: string;
  subjectId: string;
  createdAt: string;
  userProfilePic?: string;
  imageUrl?: string;
}

interface ClassroomDiscussionProps {
  subjects: SubjectType[];
}

export const ClassroomDiscussion: React.FC<ClassroomDiscussionProps> = ({ subjects }) => {
  const { user, apiFetch } = useAuth();
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const messagesRef = useRef<MessageType[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [typedMessage, setTypedMessage] = useState<string>('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom mobile screen flow: 'channels' list vs the 'chat' window itself
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('chat');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep messagesRef in sync with messages state so the long-poll loop can
  // read the latest message timestamp without being a dependency of the effect.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Real-time active users
  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);

  // Quick Action triggers removed per user request — chat input is now clean.

  // Fetch messages of specified subject channel.
  // If `since` is provided, uses long-polling (server holds up to 20s waiting
  // for new messages). Otherwise, fetches the latest 200 messages immediately.
  const fetchChannelMessages = async (subjId: string, silent: boolean = false, since?: string) => {
    if (!silent) {
      setLoading(true);
      setErrorMessage(null);
    }
    try {
      // Always use /api/chat/[subjectId] — 'general' maps to global (null subjectId)
      const endpoint = `/api/chat/${subjId}` + (since ? `?since=${encodeURIComponent(since)}` : '');
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const raw = await res.json();
        // Response shape: { messages: [...], polledAt: '...' }
        // Handle both old (array) and new ({messages}) shapes for resilience
        const rawMessages = Array.isArray(raw) ? raw : (raw.messages || []);
        // Normalize API fields (text -> content, userAvatar -> userProfilePic) to match local MessageType shape
        const data: MessageType[] = rawMessages.map((m: any) => ({
          id: m.id,
          _id: m._id,
          userId: m.userId,
          userName: m.userName,
          userRole: m.userRole === 'admin' ? 'admin' : 'user',
          content: m.text ?? m.content ?? '',
          subjectId: m.subjectId ?? subjId,
          createdAt: m.createdAt,
          userProfilePic: m.userProfilePic ?? m.userAvatar,
          imageUrl: m.imageUrl,
        }));
        setMessages((prev) => {
          if (since) {
            // Long-poll mode — merge new messages into existing
            if (data.length === 0) return prev;
            const existingIds = new Set(prev.map(m => m.id || m._id));
            const newOnes = data.filter(m => !existingIds.has(m.id || m._id));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          }
          // Initial fetch — replace all
          return data;
        });
      } else if (!silent) {
        const errData = await res.json();
        setErrorMessage(errData.error || t('networkLoss'));
      }
    } catch (e: any) {
      if (!silent) {
        setErrorMessage(t('networkLoss'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Image picker — converts to base64 data URL for inline upload
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Max 2 MB for chat images.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(String(reader.result || ''));
    reader.onerror = () => setErrorMessage('Could not read image file.');
    reader.readAsDataURL(file);
  };

  // Perform post of typed message content + optional image
  const handleSendMessage = async (incomingContent?: string) => {
    const targetContent = incomingContent || typedMessage;
    // Need either text or an image to send
    if ((!targetContent.trim() && !pendingImage) || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const messageContent = targetContent;
    const imageToSend = pendingImage;
    if (!incomingContent) {
      setTypedMessage('');
    }
    setPendingImage(null);

    try {
      // Next.js /api/chat expects { text, subjectId, imageUrl } — pass null for general lounge
      const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent || '(image)',
          subjectId: subjectPayload,
          imageUrl: imageToSend || undefined,
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        // Normalize the new message to match local MessageType shape
        const normalized: MessageType = {
          id: newMsg.id,
          _id: newMsg._id,
          userId: newMsg.userId,
          userName: newMsg.userName,
          userRole: newMsg.userRole === 'admin' ? 'admin' : 'user',
          content: newMsg.text ?? newMsg.content ?? messageContent,
          subjectId: newMsg.subjectId ?? activeChannelId,
          createdAt: newMsg.createdAt,
          userProfilePic: newMsg.userProfilePic ?? newMsg.userAvatar,
          imageUrl: newMsg.imageUrl,
        };
        setMessages((prev) => [...prev, normalized]);
        // Force scroll-to-bottom on newly typed posts from our side
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 80);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to broadcast message.");
        if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
      }
    } catch (err) {
      setErrorMessage("Broadcast failed due to structural network discrepancy.");
      if (!incomingContent) setTypedMessage(messageContent); // Restore text on failure
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendMessage();
  };

  // Perform message eradication (admin or owner only)
  const handleDeleteMessage = async (msgId: string) => {
    if (!msgId) return;

    try {
      // Next.js /api/chat delete via ?id= query param
      const res = await apiFetch(`/api/chat?id=${msgId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove locally from UI state
        setMessages((prev) => prev.filter(m => (m.id || m._id) !== msgId));
      } else {
        const errData = await res.json();
        alert(errData.error || "De-registration of message parameters refused.");
      }
    } catch (err) {
      alert("Error deleting message. Check student permission rules.");
    }
  };

  // Initial fetch + long-polling loop for near-real-time chat.
  //
  // How it works:
  //   1. On mount/channel change, fetch the latest 200 messages (initial load)
  //   2. Then start a long-poll loop: send a request with ?since=<last message time>
  //   3. Server holds the request open up to 20s, returns when new messages arrive
  //   4. Client merges new messages, then immediately sends the next long-poll
  //
  // This gives ~1s latency (same as the old 1s polling) but with 20× fewer
  // requests — dramatically lower server load and battery usage.
  useEffect(() => {
    let cancelled = false;

    const startLongPollLoop = async (subjId: string) => {
      // Initial fetch (no `since` param)
      await fetchChannelMessages(subjId, false);

      if (cancelled) return;

      // Long-poll loop
      while (!cancelled) {
        // Get the latest message timestamp to use as the `since` cursor
        const latestMsg = messagesRef.current[messagesRef.current.length - 1];
        const since = latestMsg?.createdAt || new Date(0).toISOString();

        // Wait for new messages (server holds up to 20s)
        await fetchChannelMessages(subjId, true, since);

        // Small delay between long-poll cycles to prevent tight loops on errors
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    };

    startLongPollLoop(activeChannelId);

    return () => {
      cancelled = true;
    };
  }, [activeChannelId]);

  // Listen to WebSocket-triggered immediate reload event for instantaneous responsiveness
  useEffect(() => {
    const handleRemoteChatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.subjectId === activeChannelId) {
        fetchChannelMessages(activeChannelId, true);
      }
    };

    window.addEventListener('chat-updated', handleRemoteChatUpdate);
    return () => {
      window.removeEventListener('chat-updated', handleRemoteChatUpdate);
    };
  }, [activeChannelId]);

  // Sync initial components presence data and update when event triggers
  useEffect(() => {
    if ((window as any).__activeUsers) {
      setActiveUsers((window as any).__activeUsers);
    }
    const handlePresenceUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.activeUsers) {
        setActiveUsers(customEvent.detail.activeUsers);
      }
    };
    window.addEventListener('presence-updated', handlePresenceUpdated);
    return () => {
      window.removeEventListener('presence-updated', handlePresenceUpdated);
    };
  }, []);

  // Handle user-friendly quiet auto-scrolling on load or when sending message
  const lastMessageCountRef = useRef<number>(0);
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    if (messages.length > lastMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isMyMessage = lastMsg && lastMsg.userId === user?.id;
      const isInitialScroll = !loading && lastMessageCountRef.current === 0;

      // Scroll to bottom immediately if it's the initial load or if the user sent a new message
      if (isInitialScroll || isMyMessage) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      } else {
        // If someone else posted, scroll down only if the user is already near the bottom
        // (to prevent interrupting their reading of history)
        const threshold = 180; // pixels from bottom threshold zone
        const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
        if (isNearBottom) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, loading, user?.id]);

  const activeChannelObj = subjects.find(s => s.id === activeChannelId);
  const activeChannelTitle = activeChannelId === 'general' ? 'General Academic Lounge' : `${activeChannelObj?.title} Support Channel`;
  const activeChannelDesc = activeChannelId === 'general'
    ? 'Universal classroom bulletin board and loose peer conversation space.'
    : activeChannelObj?.description;

  const formatDateLabel = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Assign specific visual descriptors, emojis, and icons of subjects for professional feel
  const getSubjectIcon = (title: string, sizeClass = "w-4 h-4") => {
    const l = title.toLowerCase();
    if (l.includes('physic')) return <Compass className={`${sizeClass} text-indigo-400`} />;
    if (l.includes('chemist')) return <Beaker className={`${sizeClass} text-emerald-400`} />;
    if (l.includes('biolog')) return <Sparkle className={`${sizeClass} text-amber-400`} />;
    if (l.includes('math')) return <GraduationCap className={`${sizeClass} text-pink-400`} />;
    if (l.includes('ict')) return <Code className={`${sizeClass} text-cyan-400`} />;
    return <Hash className={`${sizeClass} text-slate-450`} />;
  };

  const getSubjectGradient = (title: string) => {
    const l = title.toLowerCase();
    if (l.includes('physic')) return 'from-indigo-505/20 to-indigo-950/25 border-indigo-500/20 text-indigo-350';
    if (l.includes('chemist')) return 'from-emerald-505/20 to-emerald-950/25 border-emerald-500/20 text-emerald-350';
    if (l.includes('biolog')) return 'from-amber-505/20 to-amber-950/25 border-amber-500/20 text-amber-350';
    if (l.includes('math')) return 'from-pink-505/20 to-pink-950/25 border-pink-500/20 text-pink-350';
    if (l.includes('ict')) return 'from-cyan-505/20 to-cyan-950/25 border-cyan-500/20 text-cyan-350';
    return 'from-slate-800/10 to-slate-950/20 border-white/5 text-slate-350';
  };

  return (
    <div
      id="classroom-chat-root"
      className="
        w-full min-h-[600px] lg:h-[calc(100vh-180px)]
        flex flex-col lg:flex-row
        rounded-3xl border border-white/[0.06]
        bg-slate-950/40 overflow-hidden
        backdrop-blur-2xl relative shadow-2xl
      "
    >
      {/* ───────────────────────────────────────────────────────────────────
          CHANNELS SIDEBAR (left on desktop, full-screen on mobile when mobileView='channels')
          ─────────────────────────────────────────────────────────────────── */}
      <aside
        className={`
          w-full lg:w-80 xl:w-96 shrink-0
          flex flex-col gap-3
          bg-slate-950/70 border-r border-white/[0.04]
          overflow-hidden
          ${mobileView === 'channels' ? 'flex' : 'hidden lg:flex'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 shrink-0">
              <Users className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <span className="font-mono text-[10px] uppercase font-black tracking-widest text-slate-300 truncate">
              {t('lobby')}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('synced')}
          </span>
        </div>

        {/* Active users strip */}
        <div className="px-3 shrink-0">
          <div className="bg-slate-900/40 border border-white/[0.03] p-2.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('activeScholars')}</span>
              <span className="text-[9px] font-mono text-cyan-400">{activeUsers.length} {t('onlineSuffix')}</span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {activeUsers.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic px-1">Connecting…</span>
              ) : (
                activeUsers.slice(0, 8).map((item, idx) => (
                  <div key={item.id || idx} className="relative group shrink-0 flex flex-col items-center gap-1" title={`${item.name} (${item.role})`}>
                    <div className="relative">
                      {item.profilePic ? (
                        <img
                          src={item.profilePic}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-emerald-500/60 bg-slate-950"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-emerald-500/60 bg-slate-900 flex items-center justify-center text-slate-200 text-[10px] font-bold">
                          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    </div>
                    <span className="text-[8px] text-slate-400 font-bold max-w-[44px] truncate leading-none text-center">
                      {item.name ? item.name.split(' ')[0] : 'Scholar'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 scrollbar-thin">
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1 font-mono">
            {t('chatRooms')}
          </span>

          {/* General channel */}
          <button
            onClick={() => {
              setActiveChannelId('general');
              setMobileView('chat');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-2xl text-xs font-semibold cursor-pointer transition-all border text-left ${
              activeChannelId === 'general'
                ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-500/30 text-cyan-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'
            }`}
          >
            <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 shrink-0">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">General Lounge</div>
              <div className="text-[9px] text-slate-500 truncate">Open discussion for everyone</div>
            </div>
          </button>

          {/* Subject channels */}
          {subjects.map((subj) => {
            const isActive = activeChannelId === subj.id;
            return (
              <button
                key={subj.id}
                onClick={() => {
                  setActiveChannelId(subj.id);
                  setMobileView('chat');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-2xl text-xs font-semibold cursor-pointer transition-all border text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-500/30 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-800/60 border border-white/5 shrink-0">
                  {getSubjectIcon(subj.title, "w-3.5 h-3.5")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{subj.title}</div>
                  <div className="text-[9px] text-slate-500 truncate">{subj.description}</div>
                </div>
              </button>
            );
          })}

          {subjects.length === 0 && (
            <div className="text-center text-[10px] text-slate-600 py-4">
              No subject channels yet.
            </div>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────────────────────────────
          CHAT PANEL (right on desktop, full-screen on mobile when mobileView='chat')
          ─────────────────────────────────────────────────────────────────── */}
      <section
        className={`
          flex-1 flex flex-col min-w-0 overflow-hidden
          ${mobileView === 'chat' ? 'flex' : 'hidden lg:flex'}
        `}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-white/[0.04] bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Mobile back button */}
            <button
              onClick={() => setMobileView('channels')}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
              title="Back to channels"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/5 shrink-0 hidden sm:block">
              {getSubjectIcon(activeChannelObj?.title || 'General', "w-5 h-5")}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white truncate">{activeChannelTitle}</h2>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">{activeChannelDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-white/5 px-2 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-wider hidden sm:inline">{t('activeStream')}</span>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-bold block">{t('networkAlert')}</span>
              <span className="text-rose-300/80 text-[11px] mt-0.5 block break-words">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-rose-500/20 rounded text-rose-300 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Messages feed */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 scrollbar-thin">

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Synchronizing…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-3">
              <div className="p-4 bg-cyan-500/5 rounded-full border border-cyan-500/10 text-cyan-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">{t('academicRoom')}</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">{t('noPostsYet')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const isMine = msg.userId === user?.id;
                const dbId = msg.id || msg._id;
                const isTeacher = msg.userRole === 'admin';
                const hasImage = !!msg.imageUrl;
                const hasText = !!(msg.content && msg.content.trim() && msg.content !== '(image)');

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 sm:gap-3 w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar — for others: left side; for me: right side (rendered first, flex-row handles order) */}
                    {!isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt={msg.userName}
                          referrerPolicy="no-referrer"
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border self-end ${
                            isTeacher ? 'border-amber-400/40' : 'border-white/10'
                          }`}
                        />
                      ) : (
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold self-end ${
                          isTeacher
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-slate-800 border border-white/5 text-slate-400'
                        }`}>
                          {msg.userName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )
                    )}

                    {/* Bubble column — sizes to content, max 80% width */}
                    <div className="min-w-0 flex flex-col" style={{ maxWidth: '80%' }}>
                      {/* Name + meta */}
                      <div className={`flex items-center gap-1.5 text-[10px] mb-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`font-bold ${isTeacher ? 'text-amber-300' : 'text-slate-300'}`}>
                          {isMine ? 'You' : msg.userName}
                        </span>
                        {isTeacher && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono font-bold uppercase">
                            {t('teacher')}
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[9px]">{formatDateLabel(msg.createdAt)}</span>
                      </div>

                      {/* Image (if present) */}
                      {hasImage && (
                        <div className={`mb-1 ${isMine ? 'flex justify-end' : 'flex justify-start'}`}>
                          <img
                            src={msg.imageUrl}
                            alt="Shared"
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-64 rounded-2xl border border-white/10 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}

                      {/* Text (if present) */}
                      {hasText && (
                        <div className={isMine ? 'flex justify-end' : 'flex justify-start'}>
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
                            <p className="whitespace-pre-line">{msg.content}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Own avatar — right side for my messages */}
                    {isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt="You"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border border-cyan-500/30 self-end"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300 text-xs font-bold self-end">
                          {user?.name?.charAt(0).toUpperCase() || 'M'}
                        </div>
                      )
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending image preview (above input) */}
        {pendingImage && (
          <div className="px-3 sm:px-4 pb-2 shrink-0">
            <div className="inline-flex items-end gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/10">
              <div className="relative">
                <img
                  src={pendingImage}
                  alt="Pending upload"
                  className="w-16 h-16 object-cover rounded-lg border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-400 transition-colors"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] text-slate-400 pb-1">Press send to share</span>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-white/[0.04] bg-slate-950/60 p-3 sm:p-4 shrink-0">
          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />

            {/* Paperclip */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={submitting}
              className="shrink-0 w-10 h-10 rounded-full bg-slate-900 border border-white/5 hover:border-cyan-500/40 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all disabled:opacity-40"
              title="Attach image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={pendingImage ? 'Add a caption…' : 'Type a message…'}
              className="flex-1 min-w-0 min-h-[40px] max-h-32 resize-none bg-slate-900 border border-white/5 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 px-3 py-2 rounded-2xl text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all overflow-y-auto"
            />

            {/* Send */}
            <button
              type="submit"
              disabled={(!typedMessage.trim() && !pendingImage) || submitting}
              className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-indigo-600/20"
              title="Send message"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
