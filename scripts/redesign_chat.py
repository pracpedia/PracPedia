#!/usr/bin/env python3
"""Replace the render block of ClassroomDiscussion.tsx with a redesigned version."""

from pathlib import Path

FILE = Path("/home/z/my-project/workspace/src/components/features/ClassroomDiscussion.tsx")
text = FILE.read_text(encoding="utf-8")

# Find the start of the return statement (after getSubjectGradient function)
start_marker = "  return (\n    <div id=\"classroom-chat-root\""
start_idx = text.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

# Find the end — the final closing of the component
end_marker = "    </div>\n  );\n};\n"
end_idx = text.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)
end_idx += len(end_marker)

NEW_RENDER = '''  return (
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
                    className={`flex gap-2 sm:gap-3 max-w-full ${isMine ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    style={{ maxWidth: '85%' }}
                  >
                    {/* Avatar (only show for others) */}
                    {!isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt={msg.userName}
                          referrerPolicy="no-referrer"
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border ${
                            isTeacher ? 'border-amber-400/40' : 'border-white/10'
                          }`}
                        />
                      ) : (
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isTeacher
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'bg-slate-800 border border-white/5 text-slate-400'
                        }`}>
                          {msg.userName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )
                    )}

                    {/* Bubble */}
                    <div className="min-w-0 flex-1">
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
                        {(isMine || user?.role === 'admin' || user?.role === 'super_admin') && dbId && (
                          <button
                            onClick={() => handleDeleteMessage(dbId as string)}
                            className="p-1 rounded hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors"
                            title={t('deleteMessage')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Image (if present) */}
                      {hasImage && (
                        <div className="mb-1">
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
                      )}
                    </div>

                    {/* Own avatar (right side) */}
                    {isMine && (
                      msg.userProfilePic ? (
                        <img
                          src={msg.userProfilePic}
                          alt="You"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 border border-cyan-500/30"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300 text-xs font-bold">
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
          {/* Quick reply chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={submitting}
                className="px-2.5 py-1 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-slate-800 text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-all whitespace-nowrap disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>

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
              placeholder={
                pendingImage
                  ? 'Add a caption (optional)…'
                  : activeChannelId === 'general'
                  ? t('placeholderGeneral')
                  : `${t('placeholderChannel')} #${activeChannelObj?.title}...`
              }
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
'''

new_text = text[:start_idx] + NEW_RENDER + text[end_idx:]
FILE.write_text(new_text, encoding="utf-8")
print(f"✓ Replaced render block ({end_idx - start_idx} chars → {len(NEW_RENDER)} chars)")
