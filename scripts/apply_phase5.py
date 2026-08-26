#!/usr/bin/env python3
"""Phase 5: AiAcademyRoom image-gen removal + AdminCmsPage activity log tab +
remove buttons + ArtistsPage remove-artist button.

These are complex JSX changes that can't easily fit in the main patch
script. Run AFTER apply_all_fixes.py.
"""
import os, sys

ROOT = '/home/z/my-project/workspace'

def edit(path, old, new):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        print(f'  ✗ {path}: not found'); return False
    with open(full, 'r', encoding='utf-8') as f: s = f.read()
    if old not in s:
        print(f'  - {path}: already applied or pattern not found')
        return False
    s2 = s.replace(old, new, 1)
    with open(full, 'w', encoding='utf-8') as f: f.write(s2)
    print(f'  ✓ edited {path}')
    return True

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f: f.write(content)
    print(f'  ✓ wrote {path}')

# ============================================================================
# AiAcademyRoom: remove image-generation feature
# ============================================================================
print('Phase 5: AiAcademyRoom image-gen removal')

# 1. Remove diagram state declarations
edit('src/components/gallery/AiAcademyRoom.tsx',
     """  const handleDisconnectGoogleKey = () => {
    safeLocalStorage.removeItem('user_gemini_key');
    setGoogleApiKey('');
    setGoogleApiKeyInput('');
  };
  const [diagramStyle, setDiagramStyle] = useState<string>(() => {
    return localStorage.getItem('academy_diagram_style') || 'scientific';
  });
  const [diagramDetailText, setDiagramDetailText] = useState<string>(() => {
    return localStorage.getItem('academy_diagram_detail_text') || '';
  });
  const [diagramUrl, setDiagramUrl] = useState<string>(() => {
    return localStorage.getItem('academy_diagram_url') || '';
  });
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState<boolean>(false);
  const [showFullDiagram, setShowFullDiagram] = useState<boolean>(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);""",
     """  const handleDisconnectGoogleKey = () => {
    safeLocalStorage.removeItem('user_gemini_key');
    setGoogleApiKey('');
    setGoogleApiKeyInput('');
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);""")

# 2. Remove diagram localStorage effects
edit('src/components/gallery/AiAcademyRoom.tsx',
     """  useEffect(() => {
    localStorage.setItem('academy_chat_logs', JSON.stringify(chatLogs));
  }, [chatLogs]);

  useEffect(() => {
    localStorage.setItem('academy_diagram_style', diagramStyle);
  }, [diagramStyle]);

  useEffect(() => {
    localStorage.setItem('academy_diagram_detail_text', diagramDetailText);
  }, [diagramDetailText]);

  useEffect(() => {
    localStorage.setItem('academy_diagram_url', diagramUrl);
  }, [diagramUrl]);

  // Adjust scroll in chat window automatically""",
     """  useEffect(() => {
    localStorage.setItem('academy_chat_logs', JSON.stringify(chatLogs));
  }, [chatLogs]);

  // Adjust scroll in chat window automatically""")

# 3. Remove handleGenerateDiagram function
edit('src/components/gallery/AiAcademyRoom.tsx',
     """  // Generate highly descriptive AI Explanatory Scientific Diagram on demand
  const handleGenerateDiagram = () => {
    setIsGeneratingDiagram(true);
    const finalTopic = customTopic.trim() || selectedTopic || 'Hsc Science Study';

    // Build a state-of-the-art educational presentation illustration prompt
    let styleDescription = "highly detailed 4k academic scientific whiteboard sketch, neat blueprint formula notations, labeled";
    if (diagramStyle === 'illustration') {
      styleDescription = "beautiful pristine colorful 3D scientific vector illustration, clear academic display, isolated transparent dark background";
    } else if (diagramStyle === 'schematic') {
      styleDescription = "ultra-professional mechanical and physics visual schematic diagram, formula labels, detailed scientific layout, technical blueprints";
    }

    const detailSuffix = diagramDetailText.trim() ? `, showing explicit details: ${diagramDetailText.trim()}` : '';
    const rawPrompt = `academic ${selectedSubject} diagram of ${finalTopic}, ${styleDescription}${detailSuffix}, educational lesson slide chart, stunning colors, highly readable annotations, high contrast, slate dark background, no blurry text`;

    // Pollinations AI endpoint handles real-time dynamic rendering based on text prompts seamlessly
    const generatedUrl = `https://image.pollinations.ai/p/${encodeURIComponent(rawPrompt)}?width=768&height=512&nologo=true&seed=${Math.floor(Math.random() * 10005)}`;

    // Simulate high-performance rendering wait so student receives feedback
    setTimeout(() => {
      setDiagramUrl(generatedUrl);
      setIsGeneratingDiagram(false);

      // award brief gamification bonus for seeking visual aids
      const addition = 5;
      setKnowledgePoints(prev => {
        const nextVal = prev + addition;
        localStorage.setItem('academy_kp', String(nextVal));
        return nextVal;
      });
    }, 1500);
  };

  // Perform AI trigger action — maps to Next.js academy endpoints (lesson/mcq/cq/chat)""",
     """  // (Image generation feature removed — the academy is now text-only.)

  // Perform AI trigger action — maps to Next.js academy endpoints (lesson/mcq/cq/chat)""")

# 4. Remove the diagram UI block from the lesson render + add FormattedMarkdown
edit('src/components/gallery/AiAcademyRoom.tsx',
     """                      {/* Interactive Lesson Header information card */}
                      <div className=\"p-3 sm:p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-3 text-slate-400\">
                        <div className=\"flex items-center gap-2 min-w-0\">
                          <CheckCircle className=\"w-4 h-4 text-emerald-400 shrink-0\" />
                          <span className=\"break-words\">Topic: <strong>{customTopic.trim() || selectedTopic || \"General Standard Coursework\"}</strong></span>
                        </div>
                        <div className=\"flex items-center gap-2 text-indigo-300 shrink-0\">
                          <Lightbulb className=\"w-4 h-4 text-yellow-400 shrink-0\" />
                          <span>Study value: <strong>+15 KP Gained</strong></span>
                        </div>
                      </div>

                      {/* AI Explanatory Diagram Engine Component */}
                      <div className=\"p-3 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-950/20 to-slate-900 border border-indigo-500/15 space-y-4\">
                        <div className=\"flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2.5\">
                          <div className=\"flex items-center gap-2 min-w-0\">
                            <Sparkles className=\"w-4 h-4 text-indigo-400 shrink-0\" />""",
     """                      {/* Interactive Lesson Header information card */}
                      <div className=\"p-3 sm:p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-3 text-slate-400\">
                        <div className=\"flex items-center gap-2 min-w-0\">
                          <CheckCircle className=\"w-4 h-4 text-emerald-400 shrink-0\" />
                          <span className=\"break-words\">Topic: <strong>{customTopic.trim() || selectedTopic || \"General Standard Coursework\"}</strong></span>
                        </div>
                        <div className=\"flex items-center gap-2 text-indigo-300 shrink-0\">
                          <Lightbulb className=\"w-4 h-4 text-yellow-400 shrink-0\" />
                          <span>Study value: <strong>+15 KP Gained</strong></span>
                        </div>
                      </div>

                      <FormattedMarkdown content={responseHtml} />
                    </motion.div>""")

# Now we need to remove the dangling diagram JSX that follows (it spans
# many lines). Find the next significant block boundary (the </motion.div>
# + `) : (` that opens the "default study guides fallback helper").
# We do this with a targeted python regex below — simpler than constructing
# an exact-text replacement.
import re
full_path = os.path.join(ROOT, 'src/components/gallery/AiAcademyRoom.tsx')
with open(full_path, 'r', encoding='utf-8') as f: src = f.read()

# Remove everything from the duplicate <span className="text-[11px] font-bold...
# (the leftover diagram header) up to (and including) the </motion.div>
# that PRECEDES the `) : (` fallback branch. We do this with a regex.
pattern = re.compile(
    r'                    </motion\.div>\n'
    r'                            <span className="text-\[11px\] font-bold font-mono uppercase text-slate-200 tracking-wider truncate">\n'
    r'.*?'
    r'                      \)\}\s*\n'
    r'\n'
    r'                      <FormattedMarkdown content=\{responseHtml\} />\s*\n'
    r'                    </motion\.div>\s*\n'
    r'                  \) : \(',
    re.DOTALL,
)
m = pattern.search(src)
if m:
    src2 = src[:m.start()] + src[m.end():]
    # Re-insert the closing </motion.div> + `) : (` so the JSX tree stays balanced
    src2 = src2.replace(
        '                    </motion.div>\n                  ) : (',
        '                    </motion.div>\n                  ) : (',
        1,
    )
    with open(full_path, 'w', encoding='utf-8') as f: f.write(src2)
    print('  ✓ AiAcademyRoom: dangling diagram JSX removed')
else:
    print('  - AiAcademyRoom: dangling diagram JSX pattern not matched (already cleaned?)')

# ============================================================================
# AdminCmsPage: Activity Log tab + Remove buttons
# ============================================================================
print('Phase 5: AdminCmsPage activity log tab + remove buttons')

# Add Activity + RefreshCw to imports
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """  Key,
  Crown
} from 'lucide-react';""",
     """  Key,
  Crown,
  Activity,
  RefreshCw
} from 'lucide-react';""")

# Update activeTab type to include 'activity'
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     "  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'assets' | 'users' | 'commissions' | 'announcements'>('overview');",
     "  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'assets' | 'users' | 'commissions' | 'announcements' | 'activity'>('overview');")

# Add Activity Log state + fetchActivityLog + handleRemoveUser + confirmConfirmRemoval helper
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """  // Super Admin States (only used when user.role === 'super_admin')
  const [superAdminsList, setSuperAdminsList] = useState<AdminUser[]>([]);
  const [superPromoteEmail, setSuperPromoteEmail] = useState('');
  const [credsDialogOpen, setCredsDialogOpen] = useState(false);""",
     """  // Super Admin States (only used when user.role === 'super_admin')
  const [superAdminsList, setSuperAdminsList] = useState<AdminUser[]>([]);
  const [superPromoteEmail, setSuperPromoteEmail] = useState('');
  const [credsDialogOpen, setCredsDialogOpen] = useState(false);

  // Activity Log States — populated by polling /api/activity-log every 3s
  interface ActivityLogEntry {
    id: string;
    userId: string | null;
    userName: string;
    userRole: string;
    action: string;
    target: string | null;
    details: string | null;
    createdAt: string;
  }
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLogSince, setActivityLogSince] = useState<string | null>(null);
  const [activityLogLoading, setActivityLogLoading] = useState<boolean>(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);""")

# Add fetchActivityLog call to mount effect + the function + polling effect + handleRemoveUser
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """  // Fetch Students & Commissions data on mount
  useEffect(() => {
    fetchStudents();
    fetchCommissions();
    fetchSuperAdmins();
  }, []);""",
     """  // Fetch Students & Commissions data on mount
  useEffect(() => {
    fetchStudents();
    fetchCommissions();
    fetchSuperAdmins();
    fetchActivityLog(true);
  }, []);

  // Real-time activity log fetcher. Polls /api/activity-log every 3 seconds
  // when the activity tab is active. Uses ?since=<iso-ts> for incremental polling.
  const fetchActivityLog = async (initial: boolean = false) => {
    try {
      setActivityLogLoading(true);
      const sinceParam = activityLogSince ? `?since=${encodeURIComponent(activityLogSince)}` : '';
      const res = await apiFetch(`/api/activity-log${sinceParam}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: ActivityLogEntry[] = Array.isArray(data.entries) ? data.entries : [];
      if (incoming.length === 0) return;
      setActivityLog(prev => {
        const seen = new Set(prev.map(e => e.id));
        const merged = [...incoming.filter(e => !seen.has(e.id)), ...prev]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 100);
        return merged;
      });
      if (data.serverTime) setActivityLogSince(data.serverTime);
    } catch (e) {
      console.warn('Activity log poll failed:', e);
    } finally {
      setActivityLogLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'activity') return;
    const interval = setInterval(() => fetchActivityLog(false), 3000);
    return () => clearInterval(interval);
  }, [activeTab, activityLogSince]);

  // Super-admin: permanently remove a user (admin OR artist OR regular user).
  const handleRemoveUser = async (userId: string, userEmail: string, userRole: string) => {
    if (!userId) return;
    if (!confirmRemoveUserId || confirmConfirmRemoval !== userId) {
      setConfirmRemoveUserId(userId);
      setTimeout(() => setConfirmRemoveUserId(null), 4000);
      return;
    }
    setConfirmRemoveUserId(null);
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showSuccess(data?.message || `Removed ${userEmail} (${userRole}) from the platform.`);
        fetchStudents();
        fetchSuperAdmins();
        refreshWorkspaceData();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || 'Could not remove user.');
      }
    } catch (e) {
      showError('Network error removing user.');
    } finally {
      setIsActionLoading(false);
    }
  };
  const confirmConfirmRemoval = confirmRemoveUserId;""")

# Add Activity Log tab button (after Notice Broadcasts button)
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'announcements'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notice Broadcasts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {announcements.length}
          </span>
        </button>
      </div>""",
     """        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'announcements'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notice Broadcasts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {announcements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === 'activity'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
              : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/5'
          }`}
          title="Real-time audit log of platform activity"
        >
          <Activity className="w-4 h-4" />
          <span>Activity Log</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/80 font-mono">
            {activityLog.length}
          </span>
        </button>
      </div>""")

# Add Remove button after the Demote button in admin row
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """                        {canDemoteRow && (
                          <button
                            onClick={async () => {
                              if (confirmDemoteId !== adm.id) {
                                setConfirmDemoteId(adm.id);
                                setTimeout(() => setConfirmDemoteId(null), 4000);
                                return;
                              }
                              setIsActionLoading(true);
                              try {
                                const res = await apiFetch('/api/users/demote', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ targetAdminId: adm.id })
                                });
                                if (res.ok) {
                                  showSuccess(`Demoted ${adm.name}.`);
                                  refreshWorkspaceData();
                                  fetchStudents();
                                } else {
                                  const err = await res.json();
                                  showError(err.error || "Demotion failed.");
                                }
                              } catch (e) {
                                showError("Demotion network error.");
                              } finally {
                                setIsActionLoading(false);
                                setConfirmDemoteId(null);
                              }
                            }}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all min-h-[32px] ${
                              confirmDemoteId === adm.id
                                ? 'bg-rose-500 text-white border-rose-400 animate-pulse font-black'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                            }`}
                          >
                            {confirmDemoteId === adm.id ? 'Confirm' : 'Demote'}
                          </button>
                        )}""",
     """                        {canDemoteRow && (
                          <button
                            onClick={async () => {
                              if (confirmDemoteId !== adm.id) {
                                setConfirmDemoteId(adm.id);
                                setTimeout(() => setConfirmDemoteId(null), 4000);
                                return;
                              }
                              setIsActionLoading(true);
                              try {
                                const res = await apiFetch('/api/users/demote', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ targetAdminId: adm.id })
                                });
                                if (res.ok) {
                                  showSuccess(`Demoted ${adm.name}.`);
                                  refreshWorkspaceData();
                                  fetchStudents();
                                } else {
                                  const err = await res.json();
                                  showError(err.error || "Demotion failed.");
                                }
                              } catch (e) {
                                showError("Demotion network error.");
                              } finally {
                                setIsActionLoading(false);
                                setConfirmDemoteId(null);
                              }
                            }}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all min-h-[32px] ${
                              confirmDemoteId === adm.id
                                ? 'bg-rose-500 text-white border-rose-400 animate-pulse font-black'
                                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                            }`}
                          >
                            {confirmDemoteId === adm.id ? 'Confirm' : 'Demote'}
                          </button>
                        )}
                        {/* Super-admin only: permanently remove the user account */}
                        {isSuperAdmin && !isRowMainOwner && (
                          <button
                            onClick={() => handleRemoveUser(adm.id, adm.email, adm.role)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[9px] sm:text-[10px] font-bold cursor-pointer transition-all min-h-[32px] ${
                              confirmRemoveUserId === adm.id
                                ? 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse font-black'
                                : 'bg-rose-950/40 border-rose-500/20 text-rose-400 hover:bg-rose-950/70 hover:border-rose-500/40'
                            }`}
                            title="Permanently delete this account (super-admin only)"
                          >
                            {confirmRemoveUserId === adm.id ? 'Confirm Remove' : 'Remove'}
                          </button>
                        )}""")

# Add Remove button to student card
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """                    <button
                      onClick={() => {
                        setEditingCreditsUser(student);
                        setNewCreditsValue(student.credits !== undefined ? student.credits : 10);
                      }}
                      className="w-full py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[9px] sm:text-[10px] font-bold border border-white/10 cursor-pointer transition-colors shadow-sm text-center min-h-[36px]"
                    >
                      Set Credits
                    </button>
                  </div>
                ))}""",
     """                    <button
                      onClick={() => {
                        setEditingCreditsUser(student);
                        setNewCreditsValue(student.credits !== undefined ? student.credits : 10);
                      }}
                      className="w-full py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[9px] sm:text-[10px] font-bold border border-white/10 cursor-pointer transition-colors shadow-sm text-center min-h-[36px]"
                    >
                      Set Credits
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleRemoveUser(student.id, student.email, 'student')}
                        className={`w-full py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-bold border cursor-pointer transition-all min-h-[36px] ${
                          confirmRemoveUserId === student.id
                            ? 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse font-black'
                            : 'bg-rose-950/40 border-rose-500/20 text-rose-400 hover:bg-rose-950/70 hover:border-rose-500/40'
                        }`}
                        title="Permanently delete this account (super-admin only)"
                      >
                        {confirmRemoveUserId === student.id ? 'Confirm Remove' : 'Remove Account'}
                      </button>
                    )}
                  </div>
                ))}""")

# Add Activity Log tab render block at the end (before closing </div>)
edit('src/components/gallery/pages/AdminCmsPage.tsx',
     """    </div>
  );
};""",
     """      {/* =========================================================================
          TAB: ACTIVITY LOG — real-time audit log of platform events
          ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Activity className={`w-5 h-5 ${activityLogLoading ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">Real-time Activity Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Live audit trail of logins, promotions, demotions, bookings, and message posts. Auto-refreshes every 3 seconds.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
              <button
                type="button"
                onClick={() => { setActivityLogSince(null); setActivityLog([]); fetchActivityLog(true); }}
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Reload from the beginning"
              >
                <RefreshCw className={`w-3 h-3 ${activityLogLoading ? 'animate-spin' : ''}`} />
                Reload
              </button>
            </div>
          </div>

          {activityLog.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-white/5">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">No activity yet — logins, promotions, demotions, and message posts will show up here in real time.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {activityLog.map((entry) => {
                const isLogin = entry.action === 'login';
                const isPromote = entry.action.startsWith('promote');
                const isDemote = entry.action === 'demote';
                const isDelete = entry.action === 'user_delete';
                const isMessage = entry.action === 'message_post';
                const isCredits = entry.action === 'set_credits';
                const isPay = entry.action === 'booking_pay_toggle';
                const roleBadge =
                  entry.userRole === 'super_admin' ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' :
                  entry.userRole === 'admin' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  entry.userRole === 'artist' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                  'bg-slate-500/15 text-slate-300 border-slate-500/30';
                const actionBadge =
                  isLogin ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  isPromote ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' :
                  isDemote ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  isDelete ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                  isMessage ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                  isCredits ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                  isPay ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  'bg-slate-500/15 text-slate-300 border-slate-500/30';
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                    <div className="text-[9px] font-mono text-slate-500 whitespace-nowrap shrink-0 mt-0.5">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border whitespace-nowrap shrink-0 mt-0.5 ${roleBadge}`}>
                      {entry.userRole}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-200">{entry.userName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${actionBadge}`}>
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {entry.target ? <span className="font-mono">{entry.target}</span> : <span className="text-slate-500 italic">(no target)</span>}
                        {entry.details && <span className="text-slate-500"> — {entry.details}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};""")

# ============================================================================
# ArtistsPage: add Remove Artist button (super_admin only)
# ============================================================================
print('Phase 5: ArtistsPage remove-artist button')

edit('src/components/gallery/pages/ArtistsPage.tsx',
     """interface ArtistCardProps {
  artist: Artist;
  portfolioThumbs: string[];
  portfolioLoading: boolean;
  onView: () => void;
  onHire: () => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  portfolioThumbs,
  portfolioLoading,
  onView,
  onHire,
}) => {
  const unavailable = !artist.isAvailable;""",
     """interface ArtistCardProps {
  artist: Artist;
  portfolioThumbs: string[];
  portfolioLoading: boolean;
  onView: () => void;
  onHire: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  confirmRemove?: boolean;
}

const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  portfolioThumbs,
  portfolioLoading,
  onView,
  onHire,
  onRemove,
  canRemove,
  confirmRemove,
}) => {
  const unavailable = !artist.isAvailable;""")

edit('src/components/gallery/pages/ArtistsPage.tsx',
     """      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 bg-slate-950/40 border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:text-white min-h-[40px] text-xs font-bold"
        >
          <Eye className="w-3.5 h-3.5" />
          Portfolio
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onHire}
          disabled={unavailable}
          className={`flex-1 min-h-[40px] text-xs font-black border border-white/10 ${
            unavailable
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/15'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {unavailable ? 'Unavailable' : 'Hire'}
        </Button>
      </div>
    </motion.div>
  );
};""",
     """      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 bg-slate-950/40 border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:text-white min-h-[40px] text-xs font-bold"
        >
          <Eye className="w-3.5 h-3.5" />
          Portfolio
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onHire}
          disabled={unavailable}
          className={`flex-1 min-h-[40px] text-xs font-black border border-white/10 ${
            unavailable
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/15'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {unavailable ? 'Unavailable' : 'Hire'}
        </Button>
      </div>

      {/* Super-admin only: permanently remove this artist */}
      {canRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`mt-1 w-full py-2 rounded-xl text-[10px] font-bold border cursor-pointer transition-all min-h-[36px] ${
            confirmRemove
              ? 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse font-black'
              : 'bg-rose-950/40 border-rose-500/20 text-rose-400 hover:bg-rose-950/70 hover:border-rose-500/40'
          }`}
          title="Permanently remove this artist (super-admin only)"
        >
          {confirmRemove ? '⚠️ Confirm Remove' : 'Remove Artist'}
        </button>
      )}
    </motion.div>
  );
};""")

# Add state + handler in ArtistsPage main component
edit('src/components/gallery/pages/ArtistsPage.tsx',
     """  const [detailArtist, setDetailArtist] = useState<Artist | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);""",
     """  const [detailArtist, setDetailArtist] = useState<Artist | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Super-admin: track which artist is in the "Confirm Remove" two-step state
  const [confirmRemoveArtistId, setConfirmRemoveArtistId] = useState<string | null>(null);
  const isSuperAdmin = user?.role === 'super_admin';""")

# Wire up the props in the ArtistCard render
edit('src/components/gallery/pages/ArtistsPage.tsx',
     """              <AnimatePresence mode="popLayout">
                {visibleArtists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    artist={a}
                    portfolioThumbs={thumbsFor(a)}
                    portfolioLoading={portfolioLoading}
                    onView={() => openDetail(a)}
                    onHire={() => {
                      if (!user) {
                        showError(
                          'Please log in to commission an artist.',
                        );
                        return;
                      }
                      if (!a.isAvailable) {
                        showError(
                          `${a.name} is currently unavailable.`,
                        );
                        return;
                      }
                      setBookingArtist(a);
                    }}
                  />
                ))}
              </AnimatePresence>""",
     """              <AnimatePresence mode="popLayout">
                {visibleArtists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    artist={a}
                    portfolioThumbs={thumbsFor(a)}
                    portfolioLoading={portfolioLoading}
                    onView={() => openDetail(a)}
                    onHire={() => {
                      if (!user) {
                        showError('Please log in to commission an artist.');
                        return;
                      }
                      if (!a.isAvailable) { showError(`${a.name} is currently unavailable.`); return; }
                      setBookingArtist(a);
                    }}
                    canRemove={isSuperAdmin}
                    confirmRemove={confirmRemoveArtistId === a.id}
                    onRemove={async () => {
                      if (!isSuperAdmin) return;
                      if (confirmRemoveArtistId !== a.id) {
                        setConfirmRemoveArtistId(a.id);
                        setTimeout(() => setConfirmRemoveArtistId(null), 4000);
                        return;
                      }
                      setConfirmRemoveArtistId(null);
                      try {
                        const res = await apiFetch(`/api/users/${a.id}`, { method: 'DELETE' });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          showSuccess(data?.message || `Removed ${a.name} from the marketplace.`);
                          setArtists(prev => prev.filter(x => x.id !== a.id));
                        } else {
                          showError(data?.error || 'Could not remove artist.');
                        }
                      } catch (e) {
                        showError('Network error removing artist.');
                      }
                    }}
                  />
                ))}
              </AnimatePresence>""")

print()
print('=== Phase 5 patches applied. ===')
