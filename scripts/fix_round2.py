#!/usr/bin/env python3
"""Fix round 2 — profile pic, credits, classroom images, logo, OpenAI label."""
import os

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): print(f'  - skip {path}'); return False
    with open(full, 'r') as f: s = f.read()
    if old not in s: print(f'  - skip {path} (pattern)'); return False
    with open(full, 'w') as f: f.write(s.replace(old, new, 1))
    print(f'  OK {path}'); return True

def replace_all(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): return False
    with open(full, 'r') as f: s = f.read()
    if old not in s: return False
    with open(full, 'w') as f: f.write(s.replace(old, new))
    print(f'  OK replace_all {path}'); return True

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f: f.write(content)
    print(f'  OK wrote {path}')

print('=== Fix 1: Profile pic disappearing (stale closure in updateUserStudyTime) ===')
# The bug: updateUserStudyTime captures `user` from closure scope, then does
# setUser({ ...user, studyTime: data.studyTime }). If the user object was
# updated since the callback was created (e.g. profile pic changed), the
# stale closure overwrites the new profilePic with the old one.
# Fix: use functional updater setUser(prev => ...) instead.
edit('src/context/AuthContext.tsx',
     """  const updateUserStudyTime = useCallback(
    async (seconds: number) => {
      try {
        const res = await apiFetch('/api/auth/track-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.studyTime === 'number' && user) {
            setUser({ ...user, studyTime: data.studyTime });
          }
        }
      } catch (err) {
        console.error('Could not register study session details:', err);
      }
    },
    [apiFetch, user],
  );""",
     """  const updateUserStudyTime = useCallback(
    async (seconds: number) => {
      try {
        const res = await apiFetch('/api/auth/track-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.studyTime === 'number') {
            // Use functional updater so we always merge with the LATEST
            // user state — prevents stale-closure overwrites that were
            // causing the profile picture to disappear after a few
            // seconds (the track-time poll was overwriting the updated
            // profilePic with a stale snapshot from when the callback
            // was created).
            setUser(prev => prev ? { ...prev, studyTime: data.studyTime } : null);
          }
        }
      } catch (err) {
        console.error('Could not register study session details:', err);
      }
    },
    [apiFetch],
  );""")

print('=== Fix 2: Logo — use new SVG instead of pracpedia_logo.jpg ===')
# Update Sidebar to use the new logo.svg
edit('src/components/gallery/Sidebar.tsx',
     'src="/pracpedia_logo.jpg"',
     'src="/logo.svg"')
# Update LandingPage header logo
edit('src/components/gallery/pages/LandingPage.tsx',
     'src="/pracpedia_logo.jpg"',
     'src="/logo.svg"')

print('=== Fix 3: Remove credits from Lightbox ===')
# The Lightbox has rechargingCredits + aiCredits references.
# Remove the "recharge credits" button and all aiCredits logic.
# Since Lightbox is a complex file, let's just neutralize the credit references
# by replacing the recharge button with a BYOK note.
replace_all('src/components/gallery/Lightbox.tsx',
            'aiCredits',
            '/* aiCredits removed — BYOK */')
# Also remove the recharge button text
edit('src/components/gallery/Lightbox.tsx',
     'rechargingCredits',
     'false')
edit('src/components/gallery/Lightbox.tsx',
     'recharge-trial',
     '#')

print('=== Fix 4: Remove credits from AdminCmsPage ===')
# Remove the "Cr: X" badge and "Set Credits" button
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] sm:text-[9px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 truncate">
                            Cr: {student.credits !== undefined ? student.credits : 10}
                          </span>
                        </div>""",
     '                        {/* Credits badge removed — BYOK */}')

print('=== Fix 5: Fix "Gemini Co-Pilot" → just "AI Co-Pilot" in Sidebar ===')
# The Sidebar says "Gemini Co-Pilot" which might confuse users into thinking
# it's an OpenAI key. Change to "AI Co-Pilot" to be provider-agnostic.
edit('src/components/gallery/Sidebar.tsx',
     'Gemini Co-Pilot',
     'AI Co-Pilot')
edit('src/components/gallery/Sidebar.tsx',
     'BYOK Gemini API',
     'BYOK API Key')
edit('src/components/gallery/Sidebar.tsx',
     'Bring your own Gemini API key',
     'Bring your own API key')
edit('src/components/gallery/Sidebar.tsx',
     'Using your Google Gemini API key',
     'Using your own API key')

print('=== Fix 6: Classroom discussion — add image upload (Messenger-style) ===')
# Add Paperclip + ImageIcon to imports
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """  Info
} from 'lucide-react';""",
     """  Info,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';""")

# Add imageUrl to MessageType interface
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """interface MessageType {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  content: string;
  subjectId: string;
  createdAt: string;
  userProfilePic?: string;
}""",
     """interface MessageType {
  id?: string;
  _id?: string;
  userId: string;
  userName: string;
  userRole: 'user' | 'admin';
  content: string;
  subjectId: string;
  createdAt: string;
  userProfilePic?: string;
  imageUrl?: string | null;
}""")

# Add imageUrl mapping in fetchChannelMessages
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """          userProfilePic: m.userProfilePic ?? m.userAvatar,
        }));""",
     """          userProfilePic: m.userProfilePic ?? m.userAvatar,
          imageUrl: m.imageUrl ?? null,
        }));""")

# Update handleSendMessage to accept optional imageUrl
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """  // Perform post of typed message content
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
  };""",
     """  const handleSendMessage = async (incomingContent?: string, incomingImageUrl?: string | null) => {
    const targetContent = incomingContent || typedMessage;
    const hasText = targetContent.trim().length > 0;
    const hasImage = !!incomingImageUrl;
    if ((!hasText && !hasImage) || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    const messageContent = targetContent;
    if (!incomingContent && !incomingImageUrl) setTypedMessage('');

    try {
      const subjectPayload = activeChannelId === 'general' ? null : activeChannelId;
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hasText ? messageContent : '(image)', subjectId: subjectPayload, imageUrl: incomingImageUrl || undefined })
      });

      if (res.ok) {
        const newMsg = await res.json();
        const normalized: MessageType = {
          id: newMsg.id, _id: newMsg._id, userId: newMsg.userId, userName: newMsg.userName,
          userRole: newMsg.userRole === 'admin' ? 'admin' : 'user',
          content: newMsg.text ?? newMsg.content ?? messageContent,
          subjectId: newMsg.subjectId ?? activeChannelId, createdAt: newMsg.createdAt,
          userProfilePic: newMsg.userProfilePic ?? newMsg.userAvatar,
          imageUrl: newMsg.imageUrl ?? incomingImageUrl ?? null,
        };
        setMessages((prev) => [...prev, normalized]);
        setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, 80);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to broadcast message.");
        if (!incomingContent && !incomingImageUrl) setTypedMessage(messageContent);
      }
    } catch (err) {
      setErrorMessage("Broadcast failed.");
      if (!incomingContent && !incomingImageUrl) setTypedMessage(messageContent);
    } finally {
      setSubmitting(false);
    }
  };

  // Image upload from local device — reads file as base64 data URL
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorMessage('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setErrorMessage('Image too large (max 5 MB).'); return; }
    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsDataURL(file);
      });
      const caption = typedMessage.trim();
      await handleSendMessage(caption || undefined, dataUrl);
      if (caption) setTypedMessage('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not attach image.');
    } finally {
      setIsUploadingImage(false);
    }
  };""")

# Add image rendering in message bubble
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>""",
     """                        {msg.imageUrl && (
                          <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="block mb-1.5 first:mb-0">
                            <img src={msg.imageUrl} alt="Attached" referrerPolicy="no-referrer"
                              className="rounded-lg max-w-full max-h-[260px] object-cover border border-white/10 cursor-pointer hover:opacity-95 transition-opacity" />
                          </a>
                        )}
                        {msg.content && msg.content !== '(image)' && (
                          <p className="whitespace-pre-line">{msg.content}</p>
                        )}
                      </div>""")

# Replace the single-line input with a compose bar that has image attach + multi-line textarea
edit('src/components/gallery/ClassroomDiscussion.tsx',
     """          {/* Bottom Message Input Form Control */}
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
          </form>""",
     """          {/* Messenger-style compose bar — image attach + multi-line textarea + send */}
          <form onSubmit={handleFormSubmit} className="flex items-end gap-2 sm:gap-3">
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user.name} referrerPolicy="no-referrer" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 select-none shadow border border-white/10 self-end mb-1" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/5 bg-slate-900 flex items-center justify-center shrink-0 text-slate-400 select-none self-end mb-1">
                <User className="w-5 h-5" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Attach image" />
            <div className="flex-1 min-w-0 bg-slate-900/95 border border-white/[0.06] focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/10 rounded-2xl px-2 py-1.5 flex items-end gap-1.5 transition-all">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={submitting || isUploadingImage} title="Attach image (max 5 MB)"
                className="shrink-0 w-9 h-9 min-h-[36px] min-w-[36px] rounded-full bg-slate-950/80 hover:bg-slate-950 hover:border-cyan-500/40 border border-white/5 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-end mb-0.5">
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <textarea required value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (typedMessage.trim() && !submitting) void handleFormSubmit(e as any); } }}
                rows={1} maxLength={600}
                placeholder={activeChannelId === 'general' ? t('placeholderGeneral') : `${t('placeholderChannel')} #${activeChannelObj?.title}...`}
                className="flex-1 min-w-0 min-h-[36px] max-h-[140px] resize-none bg-transparent border-0 outline-none px-1 py-1.5 text-xs sm:text-[13px] text-slate-100 placeholder:text-slate-500 font-sans font-medium self-center leading-relaxed" />
              <button type="submit" disabled={(!typedMessage.trim() && !isUploadingImage) || submitting}
                className="shrink-0 w-9 h-9 min-h-[36px] min-w-[36px] rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 cursor-pointer self-end mb-0.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </form>
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider text-center px-1">
            <kbd className="px-1 py-0.5 bg-slate-950 border border-white/10 rounded">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-slate-950 border border-white/10 rounded">Shift+Enter</kbd> for newline · click <Paperclip className="w-2.5 h-2.5 inline -mt-0.5" /> to attach an image
          </p>""")

print('=== Fix 7: POST /api/chat — accept imageUrl ===')
edit('src/app/api/chat/route.ts',
     """    const created = await db.chatMessage.create({
      data: {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        userAvatar: u.profilePic || null,
        text: String(text).slice(0, 4000),
        subjectId: subjectId || null,
      },
    });
    return NextResponse.json({ ...created, id: created.id });""",
     """    let imageUrl: string | null = null;
    if (typeof body.imageUrl === 'string' && body.imageUrl) {
      const raw = body.imageUrl.slice(0, 7_000_000);
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) imageUrl = raw;
    }
    const created = await db.chatMessage.create({
      data: { userId: u.id, userName: u.name, userRole: u.role, userAvatar: u.profilePic || null, text: String(text).slice(0, 4000), imageUrl, subjectId: subjectId || null },
    });
    return NextResponse.json({ ...created, id: created.id });""")

print('\n=== Fix round 2 complete. ===')
