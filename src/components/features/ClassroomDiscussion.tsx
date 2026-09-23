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
  MessageSquare, Send, Loader2, AlertCircle, Paperclip,
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

  const activeChannelObj = (subjects || []).find(s => s.id === activeChannelId);
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
            {/* Image upload button — Paperclip icon */}
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
              aria-label="Attach image"
            >
              <Paperclip className="w-4 h-4" />
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