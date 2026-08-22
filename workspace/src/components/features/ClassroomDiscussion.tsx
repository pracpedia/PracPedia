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
  Info
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
}

interface ClassroomDiscussionProps {
  subjects: SubjectType[];
}

export const ClassroomDiscussion: React.FC<ClassroomDiscussionProps> = ({ subjects }) => {
  const { user, apiFetch } = useAuth();
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [typedMessage, setTypedMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom mobile screen flow: 'channels' list vs the 'chat' window itself
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('chat');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Real-time active users
  const [activeUsers, setActiveUsers] = useState<any[]>((window as any).__activeUsers || []);

  // Quick Action triggers for easy classroom conversation starter
  const quickChips = [
    t('quickChip1'),
    t('quickChip2'),
    t('quickChip3'),
    t('quickChip4'),
  ];

  // Fetch messages of specified subject channel
  const fetchChannelMessages = async (subjId: string, silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setErrorMessage(null);
    }
    try {
      // Next.js backend exposes /api/chat (general) and /api/chat/[subjectId] (subject-specific)
      const endpoint = subjId === 'general' ? '/api/chat' : `/api/chat/${subjId}`;
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const raw = await res.json();
        // Normalize API fields (text -> content, userAvatar -> userProfilePic) to match local MessageType shape
        const data: MessageType[] = (Array.isArray(raw) ? raw : []).map((m: any) => ({
          id: m.id,
          _id: m._id,
          userId: m.userId,
          userName: m.userName,
          userRole: m.userRole === 'admin' ? 'admin' : 'user',
          content: m.text ?? m.content ?? '',
          subjectId: m.subjectId ?? subjId,
          createdAt: m.createdAt,
          userProfilePic: m.userProfilePic ?? m.userAvatar,
        }));
        setMessages((prev) => {
          // Compare previous message IDs to prevent redundant state re-renders which mess up the layout
          const prevIds = prev.map(m => m.id || m._id).join(',');
          const newIds = data.map((m) => m.id || m._id).join(',');
          if (prevIds !== newIds || prev.length !== data.length) {
            return data;
          }
          return prev;
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

  // Perform post of typed message content
  const handleSendMessage = async (incomingContent?: string) => {
    const targetContent = incomingContent || typedMessage;
    if (!targetContent.trim() || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const messageContent = targetContent;
    if (!incomingContent) {
      setTypedMessage('');
    }

    try {
      // Next.js /api/chat expects { text, subjectId } — pass null for general lounge
      const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent,
          subjectId: subjectPayload
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

  // Fetch initial posts and configure automatic polling every 1 second to make it act like a live Messenger
  useEffect(() => {
    fetchChannelMessages(activeChannelId, false);

    const intervalId = setInterval(() => {
      fetchChannelMessages(activeChannelId, true);
    }, 1000);

    return () => clearInterval(intervalId);
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
    <div id="classroom-chat-root" className="w-full h-[70vh] min-h-[520px] lg:h-[calc(100vh-175px)] flex flex-col lg:flex-row rounded-3xl border border-white/[0.05] bg-slate-950/40 overflow-hidden backdrop-blur-2xl relative shadow-2xl">

      {/* Channels Sidebar Selection Block */}
      {/* responsive class:hidden toggles visibility on mobile based on mobileView */}
      <div className={`w-full lg:w-80 border-r border-white/[0.04] bg-slate-950/65 p-3 sm:p-4 shrink-0 flex flex-col gap-4 overflow-hidden h-full ${
        mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Sidebar Title */}
        <div className="flex items-center justify-between px-2 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" />
            <span className="font-mono text-[10px] uppercase font-black tracking-widest text-slate-400">{t('lobby')}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] bg-emerald-555/10 text-emerald-450 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-black animate-pulse">
            ● {t('synced')}
          </span>
        </div>        {/* MESSENGER ACTIVE PRESENCE ROW - HORIZONTAL AVATARS STRIP */}
        <div className="bg-slate-900/15 border border-white/[0.03] p-3 rounded-2xl space-y-2 select-none shrink-0">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">{t('activeScholars')}</span>
            <span className="text-[8px] font-mono text-cyan-400">{activeUsers.length} {t('onlineSuffix')}</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {activeUsers.length === 0 ? (
              <span className="text-[10px] text-slate-500 italic mt-1 px-1">Connecting...</span>
            ) : (
              activeUsers.map((item, idx) => (
                <div key={item.id || idx} className="relative group shrink-0 flex flex-col items-center gap-1.5" title={`${item.name} (${item.role})`}>
                  <div className="relative">
                    {item.profilePic ? (
                      <img
                        src={item.profilePic}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover p-0.5 border border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.2)] bg-slate-950"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full border border-emerald-500/80 bg-slate-900 flex items-center justify-center text-slate-200 text-xs font-black shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950" />
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono tracking-tight font-extrabold max-w-[50px] truncate leading-none text-center">
                    {item.name ? item.name.split(' ')[0] : 'Scholar'}
                  </span>

                  <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    <span className="font-extrabold block text-slate-100">{item.name}</span>
                    <span className="text-[8px] text-emerald-405 font-bold block uppercase mt-0.5 tracking-wider">● {item.role === 'admin' ? t('teacher') : t('student')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chats Channels List Container */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-none scrollbar-thin">
          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1 font-mono">{t('chatRooms')}</span>

          {/* General Lounge Channel button */}
          <button
            onClick={() => {
              setActiveChannelId('general');
              setMobileView('chat');
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-300 border text-left ${
              activeChannelId === 'general'
                ? 'bg-gradient-to-r from-cyan-600/10 to-indigo-600/10 border-cyan-500/25 text-cyan-300 shadow-md shadow-cyan-950/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              activeChannelId === 'general' ? 'bg-cyan-500/15' : 'bg-slate-900/80 border border-white/5'
            }`}>
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="min-w-0 flex-1 leading-snug">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-200 truncate">{t('generalLounge')}</span>
                <span className="text-[8px] font-mono text-slate-500">Global</span>
              </div>
              <p className="text-[9px] text-slate-510 truncate mt-0.5 font-medium">{t('generalLoungeDesc')}</p>
            </div>
          </button>

          {/* Subjects channels mapped */}
          {subjects.map((sub) => {
            const isActive = activeChannelId === sub.id;
            const gradClass = getSubjectGradient(sub.title);

            return (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveChannelId(sub.id);
                  setMobileView('chat');
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-2xl text-xs font-semibold cursor-pointer transition-all duration-300 border text-left ${
                  isActive
                    ? 'bg-gradient-to-r ' + gradClass + ' font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border-transparent'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  isActive ? 'bg-white/10' : 'bg-slate-900/80 border border-white/5'
                }`}>
                  {getSubjectIcon(sub.title, "w-4 h-4")}
                </div>

                <div className="min-w-0 flex-1 leading-snug">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-200 truncate">{sub.title} Channel</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[9px] text-slate-510 truncate mt-0.5 font-medium">{sub.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Sidebar Arabic calligraphy quote */}
        <div className="hidden lg:flex flex-col items-center justify-center p-4 rounded-2xl border border-white/[0.03] bg-gradient-to-b from-slate-950 to-slate-950/60 shrink-0 text-center space-y-1 select-none">
          <span className="text-sm font-bold bg-gradient-to-r from-amber-400 via-rose-300 to-indigo-400 bg-clip-text text-transparent font-arabic" style={{ direction: 'rtl' }}>
            رَبِّ زِدْنِي عِلْمًا
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">
            Rabbi Zidni Ilma
          </span>
        </div>
      </div>

      {/* Main Messaging Container Area */}
      {/* responsive class:hidden toggles visibility on mobile based on mobileView */}
      <div className={`flex-1 flex flex-col justify-between overflow-hidden relative h-full ${
        mobileView === 'channels' ? 'hidden lg:flex' : 'flex'
      }`}>

        {/* Dynamic header of the active channel */}
        <div className="bg-slate-950/75 border-b border-white/[0.04] px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Channel Back Navigation Arrow */}
            <button
              onClick={() => setMobileView('channels')}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 cursor-pointer transition-colors shrink-0"
              title="Show Lobby"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Subject Avatar in title */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/5 shrink-0 hidden sm:block">
              {getSubjectIcon(activeChannelObj?.title || 'General', "w-5 h-5")}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#fbbf24] font-mono shrink-0">{t('liveClassChat')}</span>
                <span className="text-slate-650 shrink-0 select-none">•</span>
                <span className="font-mono text-cyan-400 text-[9px] tracking-widest font-bold truncate">{t('secureNode')}</span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-100 tracking-tight mt-0.5 truncate">{activeChannelTitle}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 hidden sm:block">{activeChannelDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-0.5 sm:gap-1 mr-0 sm:mr-2">
              <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer" title="Start Call Session">
                <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
              <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer" title="Start Video Meeting">
                <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
              <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer" title="Room Information">
                <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/70 border border-white/5 px-2.5 py-1.2 rounded-xl shrink-0">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-555 animate-ping" />
              <span className="text-[9px] font-mono text-slate-445 font-black uppercase tracking-wider">{t('activeStream')}</span>
            </div>
          </div>
        </div>

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="m-3 sm:m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-shake shrink-0">
            <AlertCircle className="shrink-0 w-4 h-4 text-red-400 mt-0.5 animate-pulse" />
            <div className="min-w-0">
              <span className="font-bold block">{t('networkAlert')}</span>
              <span className="text-slate-300 text-[11px] mt-0.5 block break-words">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Message Feeds Scrolling Scroller */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 relative scrollbar-thin">

          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/20 backdrop-blur-sm z-10 select-none">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold">Synchronizing discussions...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-3 select-none">
              <div className="p-4 bg-gradient-to-tr from-cyan-500/5 to-indigo-500/5 rounded-full border border-indigo-500/10 text-cyan-400 opacity-70">
                <MessageSquare className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">{t('academicRoom')}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-xs leading-normal">{t('noPostsYet')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isMine = msg.userId === user?.id;
                const dbId = msg.id || msg._id;
                const isTeacher = msg.userRole === 'admin';

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className={`flex gap-2 sm:gap-3 max-w-full sm:max-w-xl md:max-w-2xl ${
                      isMine ? 'ml-auto justify-end' : 'mr-auto justify-start'
                    }`}
                  >
                    {/* User Avatar with fallback - ONLY rendered for recipients (left side) as in Messenger */}
                    {!isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt="Profile Avatar"
                          referrerPolicy="no-referrer"
                          className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shrink-0 select-none shadow-md border ${
                            isTeacher ? 'border-amber-400/40 ring-2 ring-amber-500/10' : 'border-white/10'
                          }`}
                        />
                      ) : (
                        <div className={`p-1.5 sm:p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full border flex items-center justify-center shrink-0 select-none shadow-sm ${
                          isTeacher
                            ? 'bg-amber-450/10 border-amber-500/20 text-amber-400'
                            : 'bg-slate-900 border-white/5 text-slate-400'
                        }`}>
                          {isTeacher ? <ShieldCheck className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4" />}
                        </div>
                      )
                    )}

                    {/* Chat Bubble card */}
                    <div className="space-y-1 min-w-[120px] max-w-[85%]">

                      <div className={`flex items-center gap-1.5 text-[9px] flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`font-black tracking-tight ${
                          isTeacher ? 'text-[#fbbf24]' : 'text-slate-350'
                        }`}>{msg.userName}</span>

                        {isTeacher ? (
                          <span className="text-[7px] px-1 py-0.2 rounded bg-amber-500/15 text-[#fbbf24] border border-amber-500/20 font-mono font-bold uppercase tracking-wider">{t('teacher')}</span>
                        ) : (
                          <span className="text-[7px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 font-mono font-medium uppercase tracking-wider">{t('student')}</span>
                        )}

                        <span className="text-slate-500 font-bold font-mono text-[8px] ml-0.5">{formatDateLabel(msg.createdAt)}</span>

                        {/* Accessible delete marker button — visible on hover (desktop) or always (mobile) for owner/admin */}
                        {(isMine || user?.role === 'admin') && dbId && (
                          <button
                            onClick={() => handleDeleteMessage(dbId as string)}
                            className="text-slate-500 hover:text-red-400 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-rose-500/10 ml-1 shrink-0 lg:opacity-60 lg:group-hover:opacity-100"
                            title={t('deleteMessage')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Content block in Messenger Layout */}
                      <div
                        className={`relative px-3.5 py-2 sm:py-1.5 text-xs sm:text-[11px] leading-relaxed font-sans font-medium break-words transition-all ${
                          isMine
                            ? 'bg-[#0084FF] border-none text-white rounded-[16px] rounded-br-[3px] shadow-lg shadow-indigo-600/5'
                            : isTeacher
                              ? 'bg-slate-900 border border-amber-500/20 text-[#ffeeb6] rounded-[16px] rounded-bl-[3px] shadow-md'
                              : 'bg-slate-900 border border-white/[0.04] text-slate-200 rounded-[16px] rounded-bl-[3px]'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>

                    {/* Own Profile picture displayed on the right hand side */}
                    {isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt="My Avatar"
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover shrink-0 select-none shadow-md border border-indigo-500/30"
                        />
                      ) : (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-indigo-900/45 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-305 text-[9px] uppercase font-bold select-none font-mono">
                          {user?.name ? user.name.substring(0, 1) : "ME"}
                        </div>
                      )
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area: Quick chips and Input container (sticky at bottom on mobile) */}
        <div className="bg-slate-950/70 border-t border-white/[0.04] p-3 sm:p-4 shrink-0 space-y-3 sm:space-y-3.5 select-none sticky bottom-0">
          {/* Quick Reply Chips — horizontally scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={submitting}
                className="px-3 py-1.5 min-h-[36px] flex items-center rounded-xl border border-white/[0.03] hover:border-cyan-500/20 bg-slate-900/60 hover:bg-slate-900 text-[10px] font-sans font-bold text-slate-400 hover:text-cyan-300 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Bottom Message Input Form Control */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 sm:gap-3"
          >
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 select-none shadow border border-white/10"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/5 bg-slate-900 flex items-center justify-center shrink-0 text-slate-400 select-none">
                <User className="w-5 h-5" />
              </div>
            )}

            <input
              type="text"
              required
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              maxLength={600}
              placeholder={
                activeChannelId === 'general'
                  ? t('placeholderGeneral')
                  : `${t('placeholderChannel')} #${activeChannelObj?.title}...`
              }
              className="flex-1 min-w-0 min-h-[44px] bg-slate-900/90 border border-white/[0.05] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/5 px-4 sm:px-5 h-11 rounded-full text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all font-sans font-medium"
            />

            <button
              type="submit"
              disabled={!typedMessage.trim() || submitting}
              className="px-4 sm:px-5 min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-405 hover:to-indigo-550 text-white font-bold h-11 flex items-center justify-center shrink-0 border border-white/5 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
              title={t('liveClassChat')}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
