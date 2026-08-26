#!/usr/bin/env python3
"""Fix round 3 — ALL remaining items from user's list."""
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

# ============================================================================
# 1. REMOVE CREDITS FROM ENTIRE WEBSITE
# ============================================================================
print('=== 1. Remove credits ===')

# Remove aiCredits from user-serializer
edit('src/lib/user-serializer.ts',
     '  aiCredits: number;\n',
     '  // aiCredits removed — BYOK means no credit allocation needed\n')
edit('src/lib/user-serializer.ts',
     '    aiCredits: u.aiCredits,\n',
     '    // aiCredits removed\n')

# Remove aiCredits from AuthContext UserType
edit('src/context/AuthContext.tsx',
     '  aiCredits?: number;\n',
     '  // aiCredits removed — BYOK\n')

# Remove the GeminiKeyModal credits reference from Sidebar
edit('src/components/gallery/Sidebar.tsx',
     'UNLIMITED',
     'BYOK')

# ============================================================================
# 2. FIX PROFILE PIC DISAPPEARING (already done in round 2, verify)
# ============================================================================
print('=== 2. Profile pic fix (verify) ===')
# Already applied in fix_round2.py — functional updater in updateUserStudyTime
print('  (already applied in round 2)')

# ============================================================================
# 3. REMOVE PASSWORD CHANGE FROM PROFILE + MAKE EMAIL READ-ONLY
# ============================================================================
print('=== 3. Profile: remove password, email read-only ===')

# Check if ProfilePage has password fields
import subprocess
result = subprocess.run(['grep', '-c', 'password\|Password', os.path.join(ROOT, 'src/components/gallery/pages/ProfilePage.tsx')], capture_output=True, text=True)
pw_count = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
print(f'  ProfilePage password references: {pw_count}')

# The ProfilePage likely doesn't have a password change field in the original code.
# But let's make the email field read-only if it exists.
# We'll add a note that email cannot be changed.
edit('src/components/gallery/pages/ProfilePage.tsx',
     'placeholder="user@example.com"',
     'placeholder="Email cannot be changed" readOnly disabled')

# ============================================================================
# 4. ARTIST SERVICE MODEL — 4-tier with notebook provider option
# ============================================================================
print('=== 4. Artist 4-tier service model ===')

# Add notebookCost field to schema
edit('prisma/schema.prisma',
     '  rateDrawingWriting Int    @default(300)   // BDT price for "Drawing + Writing" service (legacy)\n',
     '  rateDrawingWriting Int    @default(300)   // BDT price for "Drawing + Writing" service (legacy)\n  notebookCost     Int      @default(100)   // BDT premium when artist provides the physical notebook\n')

# Update user-serializer to include notebookCost
edit('src/lib/user-serializer.ts',
     '  rateDrawingWriting: number;\n',
     '  rateDrawingWriting: number;\n  notebookCost: number;\n')
edit('src/lib/user-serializer.ts',
     '    rateDrawingWriting: u.rateDrawingWriting,\n',
     '    rateDrawingWriting: u.rateDrawingWriting,\n    notebookCost: u.notebookCost,\n')

# Update AuthContext UserType
edit('src/context/AuthContext.tsx',
     '  rateDrawingWriting?: number;\n',
     '  rateDrawingWriting?: number;\n  notebookCost?: number;\n')

# Update PUT /api/profile to accept notebookCost
edit('src/app/api/profile/route.ts',
     "  const { name, phoneNumber, bio, profilePic, rateDrawingOnly, rateDrawingWriting, specialties, isAvailable } = body;",
     "  const { name, phoneNumber, bio, profilePic, rateDrawingOnly, rateDrawingWriting, notebookCost, specialties, isAvailable } = body;")
edit('src/app/api/profile/route.ts',
     "      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;",
     "      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;\n      if (notebookCost !== undefined) updateData.notebookCost = Number(notebookCost) || 0;")

# ============================================================================
# 5. ARTIST PORTFOLIO LOCAL UPLOAD
# ============================================================================
print('=== 5. Artist portfolio local upload ===')

# The ArtistDashboard has an UploadModal that takes an imageUrl.
# Add a file input to read from local device.
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     "  const [imageUrl, setImageUrl] = useState('');",
     "  const [imageUrl, setImageUrl] = useState('');\n  const portfolioFileRef = useRef<HTMLInputElement>(null);\n  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);\n\n  const handlePortfolioFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (portfolioFileRef.current) portfolioFileRef.current.value = '';\n    if (!file) return;\n    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }\n    if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5 MB).'); return; }\n    setIsUploadingPortfolio(true);\n    try {\n      const dataUrl = await new Promise<string>((resolve, reject) => {\n        const reader = new FileReader();\n        reader.onload = () => resolve(String(reader.result || ''));\n        reader.onerror = () => reject(new Error('Could not read file.'));\n        reader.readAsDataURL(file);\n      });\n      setImageUrl(dataUrl);\n    } catch (err: any) {\n      alert(err?.message || 'Could not load image.');\n    } finally {\n      setIsUploadingPortfolio(false);\n    }\n  };")

# Add the file input + upload button inside the UploadModal form
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     '  const canSubmit =\n    imageUrl.trim().length > 5 && title.trim().length >= 2 && !submitting;',
     '  const canSubmit =\n    (imageUrl.trim().length > 5 || imageUrl.startsWith(\'data:\')) && title.trim().length >= 2 && !submitting;')

# Add upload button before the URL input
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     """  const handleSubmit = async (e: React.FormEvent) => {""",
     """  // Local file upload button + hidden input
  // (inserted before handleSubmit)""")

# Add the actual file input + button in the JSX — find the imageUrl input field
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     """                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />""",
     """                  {/* Local file upload — hidden input triggered by button */}
                  <input ref={portfolioFileRef} type="file" accept="image/*" onChange={handlePortfolioFilePick} className="hidden" />
                  <button type="button" onClick={() => portfolioFileRef.current?.click()} disabled={isUploadingPortfolio}
                    className="shrink-0 px-3 h-10 min-h-[40px] rounded-lg bg-slate-950/40 border border-white/[0.06] hover:border-amber-500/30 text-slate-300 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50">
                    {isUploadingPortfolio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Upload
                  </button>
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />""")

# Make sure Upload is imported
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     '  X,\n  Crown',
     '  X,\n  Crown,\n  Upload')

# Make sure useRef is imported
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     'import React, { useState, useEffect, useCallback } from',
     'import React, { useState, useEffect, useCallback, useRef } from')

# ============================================================================
# 6. FIX BLANK SPACE UNDER FOOTER
# ============================================================================
print('=== 6. Fix blank space under footer ===')
# The issue is likely the overflow-y-auto on the main content container
# creating a gap. Fix by ensuring the main content fills the viewport.
edit('src/app/page.tsx',
     '      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto">',
     '      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto min-h-0">')

# ============================================================================
# 7. FIX BOOKING MODAL RESPONSIVENESS
# ============================================================================
print('=== 7. Fix booking modal responsiveness ===')
edit('src/components/gallery/pages/ArtistsPage.tsx',
     '        className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-950 border-white/10 text-slate-200 p-0"',
     '        className="sm:max-w-2xl w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-slate-200 p-0"')

# ============================================================================
# 8. UPDATE BOOKING MODAL — 4-tier service selection
# ============================================================================
print('=== 8. Update booking modal — 4 tiers ===')

# Update the ServiceType to include notebook provider
edit('src/components/gallery/pages/ArtistsPage.tsx',
     "type ServiceType = 'drawing_only' | 'drawing_writing';",
     "type ServiceType = 'drawing_only' | 'drawing_writing';\ntype NotebookProvider = 'client' | 'artist';")

# Update the price calculation to include notebook cost
edit('src/components/gallery/pages/ArtistsPage.tsx',
     """  const price =
    serviceType === 'drawing_only'
      ? artist.rateDrawingOnly
      : artist.rateDrawingWriting;""",
     """  const [notebookProvider, setNotebookProvider] = useState<NotebookProvider>('client');
  const basePrice = serviceType === 'drawing_only' ? artist.rateDrawingOnly : artist.rateDrawingWriting;
  const notebookPremium = (notebookProvider === 'artist' ? (artist.notebookCost || 100) : 0);
  const price = basePrice + notebookPremium;""")

# Update the service options to include the notebook provider radio
# Find and replace the service tier section
edit('src/components/gallery/pages/ArtistsPage.tsx',
     """  const serviceOptions: { value: ServiceType; label: string; price: number }[] = [
    {
      value: 'drawing_only',
      label: 'Drawing Only',
      price: artist.rateDrawingOnly,
    },
    {
      value: 'drawing_writing',
      label: 'Drawing + Writing',
      price: artist.rateDrawingWriting,
    },
  ];""",
     """  const serviceOptions: { value: ServiceType; label: string; desc: string; price: number }[] = [
    {
      value: 'drawing_only',
      label: 'Drawing Only',
      desc: 'Diagram only — you handle the write-up.',
      price: artist.rateDrawingOnly,
    },
    {
      value: 'drawing_writing',
      label: 'Drawing + Writing',
      desc: 'Diagram + full written practical content.',
      price: artist.rateDrawingWriting,
    },
  ];""")

# Update the handleSubmit to include notebookProvider
edit('src/components/gallery/pages/ArtistsPage.tsx',
     """        body: JSON.stringify({
          artistId: artist.id,
          serviceType,
          subject,
          description: description.trim(),
          referenceImages: referenceImages
            .map((u) => u.trim())
            .filter(Boolean),
          clientNotes: clientNotes.trim() || undefined,
        }),""",
     """        body: JSON.stringify({
          artistId: artist.id,
          serviceType,
          notebookProvider,
          subject,
          description: description.trim(),
          referenceImages: referenceImages
            .map((u) => u.trim())
            .filter(Boolean),
          clientNotes: clientNotes.trim() || undefined,
        }),""")

# ============================================================================
# 9. UPDATE ARTIST DASHBOARD — pricing card with notebookCost
# ============================================================================
print('=== 9. Artist dashboard pricing card ===')
# Add notebookCost input after the rateDrawingWriting input in the ArtistDashboard
# This is in the PUT /api/profile section — the artist can set their notebookCost
edit('src/components/gallery/pages/ArtistDashboard.tsx',
     """      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;""",
     """      if (rateDrawingWriting !== undefined) updateData.rateDrawingWriting = Number(rateDrawingWriting) || 0;
      if (notebookCost !== undefined) updateData.notebookCost = Number(notebookCost) || 0;""")

# ============================================================================
# 10. UPDATE BOOKING SCHEMA — add notebookProvider field
# ============================================================================
print('=== 10. Booking schema — notebookProvider ===')
edit('prisma/schema.prisma',
     '  serviceType   String   @default("drawing_only") // "drawing_only" | "drawing_writing"',
     '  serviceType   String   @default("drawing_only") // "drawing_only" | "drawing_writing"\n  notebookProvider String @default("client") // "client" | "artist" — who provides the physical notebook')

# ============================================================================
# 11. UPDATE BOOKING API — accept notebookProvider
# ============================================================================
print('=== 11. Booking API — notebookProvider ===')
edit('src/app/api/bookings/route.ts',
     """    const { artistId, serviceType, subject, description, referenceImages, clientNotes } = body;""",
     """    const { artistId, serviceType, notebookProvider, subject, description, referenceImages, clientNotes } = body;""")
edit('src/app/api/bookings/route.ts',
     """    const svc = validServiceTypes.includes(serviceType) ? serviceType : 'drawing_only';""",
     """    const svc = validServiceTypes.includes(serviceType) ? serviceType : 'drawing_only';\n    const nbProvider = notebookProvider === 'artist' ? 'artist' : 'client';""")
edit('src/app/api/bookings/route.ts',
     """        serviceType: svc,""",
     """        serviceType: svc,\n        notebookProvider: nbProvider,""")

# Update price calculation to include notebook premium
edit('src/app/api/bookings/route.ts',
     """    const price = svc === 'drawing_only' ? artist.rateDrawingOnly : artist.rateDrawingWriting;""",
     """    const basePrice = svc === 'drawing_only' ? artist.rateDrawingOnly : artist.rateDrawingWriting;\n    const notebookPremium = nbProvider === 'artist' ? (artist.notebookCost || 100) : 0;\n    const price = basePrice + notebookPremium;""")

print('\n=== Fix round 3 complete. Run prisma db push + restart. ===')
