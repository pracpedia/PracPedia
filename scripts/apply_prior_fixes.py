#!/usr/bin/env python3
"""
PracPedia patch script — re-applies the fixes from previous sessions after a
workspace wipe. Idempotent: safe to re-run.

Fixes applied:
1. Main dashboard container: lg:h-screen → lg:min-h-screen (fixes blank space below footer)
2. Inner pages (ArtistsPage, ArtistDashboard, ProfilePage): min-h-screen → min-h-[60vh],
   remove excessive bottom padding
3. AvatarField buttons: rename "Save Avatar" → "Save", make smaller, prevent overflow
4. Rating UI: BookingRatingCard component inside CommissionsTab for completed orders
"""

import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/workspace")
errors = []
applied = []


def patch_file(rel_path: str, find: str, replace: str, label: str = "") -> None:
    """Idempotent single-occurrence patch."""
    p = ROOT / rel_path
    if not p.exists():
        errors.append(f"[{label or rel_path}] file not found")
        return
    txt = p.read_text(encoding="utf-8")
    if replace in txt:
        # already applied
        return
    if find not in txt:
        errors.append(f"[{label or rel_path}] anchor not found")
        return
    txt = txt.replace(find, replace, 1)
    p.write_text(txt, encoding="utf-8")
    applied.append(label or rel_path)


def patch_file_multi(rel_path: str, edits: list[tuple[str, str]], label: str = "") -> None:
    """Apply multiple edits in one go."""
    p = ROOT / rel_path
    if not p.exists():
        errors.append(f"[{label or rel_path}] file not found")
        return
    txt = p.read_text(encoding="utf-8")
    changed = False
    for find, replace in edits:
        if replace in txt:
            continue  # already applied
        if find not in txt:
            errors.append(f"[{label or rel_path}] anchor not found for edit")
            continue
        txt = txt.replace(find, replace, 1)
        changed = True
    if changed:
        p.write_text(txt, encoding="utf-8")
        applied.append(label or rel_path)


# ---------------------------------------------------------------------------
# 1. Main dashboard container — fix blank space below footer
# ---------------------------------------------------------------------------
patch_file(
    "src/app/page.tsx",
    """      {/* Main dashboard view container */}
      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:h-screen lg:overflow-y-auto min-h-0">""",
    """      {/* Main dashboard view container — uses min-h-screen (not fixed h-screen) so it grows with content and never leaves blank space below the footer */}
      <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden lg:min-h-screen">""",
    label="page.tsx dashboard container h-screen→min-h-screen",
)

# ---------------------------------------------------------------------------
# 2. Inner pages — remove min-h-screen + excessive bottom padding
# ---------------------------------------------------------------------------
patch_file(
    "src/components/gallery/pages/ArtistsPage.tsx",
    '    <div className="min-h-screen text-slate-100 pb-20 sm:pb-24 select-none relative overflow-hidden bg-[#04060b]">',
    '    <div className="min-h-[60vh] text-slate-100 pb-6 select-none relative overflow-hidden bg-[#04060b]">',
    label="ArtistsPage min-h-screen → min-h-[60vh]",
)

patch_file(
    "src/components/gallery/pages/ArtistDashboard.tsx",
    '    <div className="min-h-screen text-slate-100 pb-20 sm:pb-24 select-none relative overflow-hidden bg-[#04060b]">',
    '    <div className="min-h-[60vh] text-slate-100 pb-6 select-none relative overflow-hidden bg-[#04060b]">',
    label="ArtistDashboard min-h-screen → min-h-[60vh]",
)

patch_file(
    "src/components/gallery/pages/ProfilePage.tsx",
    '    <div className="relative w-full min-h-screen px-4 sm:px-6 py-6">',
    '    <div className="relative w-full min-h-[60vh] px-4 sm:px-6 py-6">',
    label="ProfilePage root min-h-screen → min-h-[60vh]",
)

# ---------------------------------------------------------------------------
# 3. AvatarField buttons — make smaller, prevent overflow
# ---------------------------------------------------------------------------
patch_file(
    "src/components/gallery/pages/ProfilePage.tsx",
    """      <div className="flex gap-2">
        <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarFilePick} className="hidden" />
        <Button type="button" size="sm" variant="outline" disabled={saving || isUploadingAvatar}
          onClick={() => avatarFileRef.current?.click()}
          className="flex-1 h-9 min-h-[36px] text-[11px] bg-slate-950 border-white/10 text-slate-200 hover:bg-slate-900 px-2">
          {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isUploadingAvatar ? '…' : 'Upload'}
        </Button>
        <Button type="button" size="sm" disabled={saving || isUnchanged || !draft.trim()}
          onClick={() => void onApply(draft.trim())}
          className="flex-1 h-9 min-h-[36px] text-[11px] bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 px-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </Button>
      </div>""",
    """      <div className="flex gap-2">
        <input ref={avatarFileRef} type="file" accept="image/*" onChange={handleAvatarFilePick} className="hidden" />
        <Button type="button" size="sm" variant="outline" disabled={saving || isUploadingAvatar}
          onClick={() => avatarFileRef.current?.click()}
          className="flex-1 min-w-0 shrink h-8 min-h-[32px] text-[10px] bg-slate-950 border-white/10 text-slate-200 hover:bg-slate-900 px-2 gap-1.5">
          {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Upload className="w-3 h-3 shrink-0" />}
          <span className="truncate">{isUploadingAvatar ? '…' : 'Upload'}</span>
        </Button>
        <Button type="button" size="sm" disabled={saving || isUnchanged || !draft.trim()}
          onClick={() => void onApply(draft.trim())}
          className="flex-1 min-w-0 shrink h-8 min-h-[32px] text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 px-2 gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Save className="w-3 h-3 shrink-0" />}
          <span className="truncate">Save</span>
        </Button>
      </div>""",
    label="ProfilePage AvatarField buttons compact",
)

# ---------------------------------------------------------------------------
# 4. Rating UI — extend CommissionsTabProps + add BookingRatingCard
# ---------------------------------------------------------------------------
patch_file(
    "src/components/gallery/pages/ProfilePage.tsx",
    """interface CommissionsTabProps {
  loading: boolean;
  bookings: Booking[];
}

const CommissionsTab: React.FC<CommissionsTabProps> = ({ loading, bookings }) => {""",
    """interface CommissionsTabProps {
  loading: boolean;
  bookings: Booking[];
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onRated?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Rating Card — shown for completed bookings so the client can rate the     */
/*  artist 1-5 stars. Once submitted, the rating is locked.                   */
/* -------------------------------------------------------------------------- */

interface BookingRatingCardProps {
  bookingId: string;
  artistNotes?: string | null;
  apiFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onRated?: () => void;
}

const BookingRatingCard: React.FC<BookingRatingCardProps> = ({
  bookingId,
  artistNotes,
  apiFetch,
  onRated,
}) => {
  // Detect prior rating from artistNotes marker `[Rating: X/5 ...]`
  const priorMatch = artistNotes?.match(/\\[Rating:\\s*(\\d)(?:\\/5)?(?:\\s*—\\s*"([^"]*)")?\\]/);
  const priorRating = priorMatch ? Number(priorMatch[1]) : null;
  const priorReview = priorMatch?.[2] ?? '';

  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(priorRating ?? 0);
  const [review, setReview] = useState<string>(priorReview);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(priorRating !== null);

  const handleSubmit = async () => {
    if (submitted || selected < 1 || selected > 5) return;
    if (!apiFetch) {
      setError('Auth not ready — please reload.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selected, review: review.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not submit rating.');
      }
      setSubmitted(true);
      onRated?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
        <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
          {submitted ? 'Your Rating' : 'Rate This Artist'}
        </span>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-4 h-4 ${
                  n <= (priorRating ?? selected)
                    ? 'text-amber-300 fill-amber-300'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-300 font-bold">
            {(priorRating ?? selected)}/5
          </span>
          {priorReview && (
            <p className="text-[11px] text-slate-400 italic w-full mt-1">
              &ldquo;{priorReview}&rdquo;
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold ml-auto">
            <CheckCircle2 className="w-3 h-3" />
            Submitted
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={submitting}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(n)}
                  className="p-0.5 rounded hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform hover:scale-110 ${
                      n <= (hover ?? selected)
                        ? 'text-amber-300 fill-amber-300'
                        : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-bold ml-1">
              {selected > 0 ? `${selected}/5` : 'Tap a star'}
            </span>
          </div>

          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Optional review (max 500 chars)…"
            maxLength={500}
            disabled={submitting}
            className="mt-2 min-h-[60px] max-h-[120px] text-[11px] bg-slate-950/70 border-white/10 text-slate-100 placeholder:text-slate-500 resize-y"
          />

          {error && (
            <p className="mt-2 text-[10px] text-red-300 flex items-center gap-1">
              <XCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting || selected < 1 || selected > 5}
              onClick={() => void handleSubmit()}
              className="h-8 min-h-[32px] text-[11px] bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 px-3 gap-1.5 shrink"
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              ) : (
                <Star className="w-3 h-3 fill-amber-300 shrink-0" />
              )}
              <span className="truncate">
                {submitting ? 'Submitting…' : 'Submit Rating'}
              </span>
            </Button>
            {selected > 0 && !submitting && (
              <button
                type="button"
                onClick={() => setSelected(0)}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const CommissionsTab: React.FC<CommissionsTabProps> = ({ loading, bookings, apiFetch, onRated }) => {""",
    label="ProfilePage BookingRatingCard + CommissionsTab props",
)

# Inject the rating card render inside each completed booking
patch_file(
    "src/components/gallery/pages/ProfilePage.tsx",
    """              {b.description && (
                <p className="mt-3 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {b.description}
                </p>
              )}
            </motion.div>
          );""",
    """              {b.description && (
                <p className="mt-3 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {b.description}
                </p>
              )}

              {b.status === 'completed' && (
                <BookingRatingCard
                  bookingId={b.id}
                  artistNotes={b.artistNotes}
                  apiFetch={apiFetch}
                  onRated={onRated}
                />
              )}
            </motion.div>
          );""",
    label="ProfilePage inject BookingRatingCard render",
)

# Pass apiFetch + onRated to CommissionsTab
patch_file(
    "src/components/gallery/pages/ProfilePage.tsx",
    """            <TabsContent value="commissions" className="w-full mt-0">
              <CommissionsTab loading={bookingsLoading} bookings={bookings} />
            </TabsContent>""",
    """            <TabsContent value="commissions" className="w-full mt-0">
              <CommissionsTab
                loading={bookingsLoading}
                bookings={bookings}
                apiFetch={apiFetch}
                onRated={refreshBookings}
              />
            </TabsContent>""",
    label="ProfilePage wire CommissionsTab props",
)

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
print("=" * 60)
if applied:
    print(f"✓ Applied {len(applied)} patch(es):")
    for name in applied:
        print(f"  - {name}")
if errors:
    print(f"⚠ {len(errors)} error(s):")
    for e in errors:
        print(f"  - {e}")
if not applied and not errors:
    print("All patches already applied — no changes needed.")
print("=" * 60)
sys.exit(0 if not errors else 1)
