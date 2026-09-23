'use client';

/**
 * OrderChatModal — fully responsive chat overlay.
 *
 * Layout strategy:
 *   Mobile (< 640px): full-screen bottom sheet, slides up, uses 100dvh,
 *                     respects safe-area insets, body scroll locked.
 *   Desktop (>= 640px): centered card, 600px tall, max 92vh, rounded-3xl.
 *
 * Other improvements over the original:
 *   - `100dvh` instead of `vh` (handles iOS Safari URL bar)
 *   - safe-area-inset padding for notch / home indicator
 *   - body scroll lock while open
 *   - ESC key closes the modal
 *   - input text-base on mobile (prevents iOS auto-zoom on focus)
 *   - scrollIntoView with 'auto' fallback for iOS
 *   - browser-safe ref typing (ReturnType<typeof setInterval>)
 *   - Profile pictures for both sender and user (Messenger style, top-aligned)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Send, MessageSquare, AlertCircle,
} from 'lucide-react';

interface OrderChatModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingSubject: string;
}

interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    profilePic: string | null;
    role: string;
  };
}

export const OrderChatModal: React.FC<OrderChatModalProps> = ({
  open, onClose, bookingId, bookingSubject,
}) => {
  const { user, apiFetch } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollDateRef = useRef<string | null>(null);

  /* ---------- helpers ---------- */

  const scrollToBottom = useCallback(() => {
    // 'auto' is more reliable than 'smooth' inside overflow containers on iOS Safari
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, []);

  /* ---------- body scroll lock + ESC key ---------- */

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose, sending]);

  /* ---------- data fetching ---------- */

  const fetchMessages = useCallback(async (isInitial: boolean = false) => {
    try {
      const url = `/api/bookings/${bookingId}/chat${
        lastPollDateRef.current ? `?since=${encodeURIComponent(lastPollDateRef.current)}` : ''
      }`;
      const res = await apiFetch(url);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load messages');
      }

      const data = await res.json();
      lastPollDateRef.current = data.polledAt;

      if (data.messages && data.messages.length > 0) {
        setMessages(prev => (isInitial ? data.messages : [...prev, ...data.messages]));
        setTimeout(scrollToBottom, 50);
      }
    } catch (e: any) {
      if (isInitial) setError(e?.message || 'Could not load chat');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [apiFetch, bookingId, scrollToBottom]);

  useEffect(() => {
    if (!open || !bookingId) return;

    setLoading(true);
    setError(null);
    setMessages([]);
    setInput('');
    lastPollDateRef.current = null;

    fetchMessages(true);

    pollTimerRef.current = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [open, bookingId, fetchMessages]);

  /* ---------- send ---------- */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const messageText = input.trim();
    setInput('');

    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }

      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 50);
        if (data.polledAt) lastPollDateRef.current = data.polledAt;
      }
    } catch (e: any) {
      setError(e?.message || 'Could not send message');
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Format a date as a separator label: "Today", "Yesterday", or "September 19, 2026"
  const formatDateLabel = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (msgDate.getTime() === today.getTime()) return 'Today';
      if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Returns the date key for a message (used to detect day changes)
  const getDateKey = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    } catch {
      return '';
    }
  };

  // Format full date + time for tooltip (e.g., "Sep 19, 2026, 2:30 PM")
  const formatFullDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  /* ---------- render ---------- */

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-2000 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md"
          style={{
            // 100dvh adapts to mobile browser chrome (URL bar hide/show)
            height: '100dvh',
          }}
          onClick={(e) => {
            // tap outside the modal closes (desktop behavior)
            if (e.target === e.currentTarget && window.innerWidth >= 640 && !sending) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="
              w-full sm:max-w-lg
              h-[100dvh] sm:h-[600px] sm:max-h-[92vh] max-h-[100dvh]
              bg-[#0d121f] border border-slate-700/70
              rounded-t-3xl sm:rounded-3xl
              shadow-[0_25px_70px_rgba(0,0,0,0.9)]
              relative flex flex-col overflow-hidden
            "
            style={{
              // safe-area insets for notch / home indicator
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
          >
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div
              className="
                flex items-center justify-between p-3 sm:p-4
                border-b border-white/[0.06] shrink-0
                bg-[#0d121f]
              "
              style={{
                paddingBottom: 'max(env(safe-area-inset-top, 0px), 0px)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-white truncate">Order Chat</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                    {bookingSubject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                className="
                  p-2 text-slate-400 hover:text-white hover:bg-slate-800
                  rounded-full transition-colors cursor-pointer shrink-0
                  min-h-10 min-w-10 sm:min-h-9 sm:min-w-9
                  flex items-center justify-center
                "
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollContainerRef}
              className="
                flex-1 min-h-0 overflow-y-auto overflow-x-hidden
                p-3 sm:p-4 space-y-3
                overscroll-contain
                scrollbar-thin scrollbar-thumb-white/5
              "
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
                    type="button"
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      fetchMessages(true);
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
                  const isMe = msg.sender.id === user?.id;
                  const currentDateKey = getDateKey(msg.createdAt);
                  const prevMsg = messages[index - 1];
                  const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
                  const showDateSeparator = currentDateKey !== prevDateKey;
                  
                  return (
                    <div key={`${msg.id}-${index}`} className="space-y-2">
                      {/* Date separator — full width, centered above message */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4 first:mt-0">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-white/[0.06]">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                              {formatDateLabel(msg.createdAt)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                          </div>
                        </div>
                      )}

                      {/* Message row — aligned to top like Messenger */}
                      <div className={`flex items-start gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Sender Avatar (Left) */}
                        {!isMe && (
                          <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0 overflow-hidden mt-4">
                            {msg.sender.profilePic ? (
                              <img src={msg.sender.profilePic} alt={msg.sender.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{msg.sender.name?.charAt(0).toUpperCase() || '?'}</span>
                            )}
                          </div>
                        )}

                        {/* Message Content */}
                        <div className={`max-w-[80%] sm:max-w-[75%] space-y-1 min-w-0 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <p className="text-[10px] sm:text-[9px] font-bold text-slate-400 px-2 truncate">
                              {msg.sender.name}
                              {msg.sender.role === 'artist' && (
                                <span className="text-amber-400"> (Artist)</span>
                              )}
                            </p>
                          )}
                          <div
                            className={`
                              px-3 py-2 rounded-2xl text-xs sm:text-[13px] break-words leading-relaxed
                              ${
                                isMe
                                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-50 rounded-br-sm'
                                  : 'bg-slate-800/60 border border-white/5 text-slate-200 rounded-bl-sm'
                              }
                            `}
                          >
                            {msg.text}
                          </div>
                          <p
                            title={formatFullDateTime(msg.createdAt)}
                            className={`text-[9px] text-slate-500 px-2 cursor-help ${
                              isMe ? 'text-right' : 'text-left'
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>

                        {/* My Avatar (Right) */}
                        {isMe && (
                          <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-200 shrink-0 overflow-hidden mt-4">
                            {user?.profilePic ? (
                              <img src={user.profilePic} alt="You" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{user?.name?.charAt(0).toUpperCase() || 'M'}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className="
                p-3 sm:p-4 border-t border-white/[0.06] shrink-0
                bg-[#0d121f]
              "
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
              }}
            >
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  // text-base on mobile prevents iOS auto-zoom; sm:text-sm shrinks on desktop
                  className="
                    flex-1 bg-slate-950/60 border border-slate-700
                    focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20
                    rounded-xl px-4 py-2.5
                    text-base sm:text-sm text-white placeholder:text-slate-600
                    outline-none transition-all min-h-[44px]
                  "
                  maxLength={1000}
                  disabled={sending}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="
                    p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30
                    text-cyan-300 hover:bg-cyan-500/25
                    transition-all cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    min-h-[44px] min-w-[44px]
                    flex items-center justify-center
                  "
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};