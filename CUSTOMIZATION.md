# PracPedia — Customization Guide

A practical reference for adapting PracPedia to your needs. Covers themes, components, API extensions, new views, marketplace tweaks, AI modes, env vars, and database schema changes.

> Pair this with [README.md](./README.md) for setup and architecture context.

---

## Recent Updates (2026-08-31)

This section documents the major changes in the latest production-readiness pass.

### Email Removed from Platform Owners

`mahabubrahmanakash275@gmail.com` has been removed from `PLATFORM_OWNER_EMAILS` in `.env` (replaced with `pracpedia@gmail.com`). The `.env.example` now uses `you@example.com` as a placeholder. No users with that email existed in the DB.

### Deep-Space Atmosphere on Landing Page

The landing page background was upgraded from a single ambient orb + grid overlay to a 4-layer cosmic scene:

1. **Nebula clouds** — 3 drifting violet/cyan/indigo blobs with heavy blur + slow `pp-nebula-drift` animation
2. **Distant star field** — 90 dim twinkling pinpricks using `pp-twinkle` keyframes
3. **Mid star field** — 50 brighter cyan/violet/amber stars with glow shadows
4. **Near dust + shooting stars** — 20 white specks + dynamic shooting stars array

Three new CSS keyframes added to `globals.css`: `pp-twinkle`, `pp-nebula-drift`, `pp-shooting-star`.

### Random Shooting Stars

JS-driven shooting stars spawn every 0.6–1.8 seconds at a random position with a random 0–360° angle, random travel distance (320–740 px), random duration (0.7–1.5 s), random thickness (1–2.2 px), and a random color from a 4-color palette. Each star auto-evicts from state after its animation completes. Honors `prefers-reduced-motion`.

### Grid Removed From All Pages

The grid overlay (`bg-[linear-gradient(to_right,...)]`) has been removed from:
- `src/components/features/pages/LandingPage.tsx`
- `src/app/admin/login/page.tsx`
- `src/components/features/pages/PublicMarketplace.tsx`
- `src/components/features/pages/AuthPage.tsx`

The deep-space atmosphere is now the sole background on the landing page.

### Lightbox Shadow Fixed

The notebook viewer (`Lightbox.tsx`) had a "weird shadow" caused by three stacked effects on the image: `bg-slate-950/60` (dark backdrop), `p-1.5` (padding showing the dark bg as a frame), and `shadow-[0_15px_50px_rgba(0,0,0,0.5)]` (50px-blur drop shadow). Removed all three — the image now has just `rounded-2xl border border-white/10`. Also removed the AI panel's upward shadow.

### BYOK Gemini Enforcement (AI Features Locked Without a Key)

Every AI feature now requires the user's own Google Gemini API key (BYOK). Server-side, all 6 AI endpoints reject requests without the `x-gemini-api-key` header with HTTP 403 `{ error, needsGeminiKey: true }`:
- `/api/academy/lesson`, `/api/academy/chat`, `/api/academy/mcq`, `/api/academy/cq`
- `/api/scan/analyze-page`, `/api/scan/detect-corners`

Client-side, every AI callsite checks `geminiApiKey` from `useAuth()` BEFORE the API call. If missing, it opens the `GeminiKeyModal` and shows a localized (English/Bengali) prompt. The `GeminiKeyModal` now actually verifies the key by calling the real Gemini REST endpoint (was: called `/api/health` which never reads the header).

The "Open AI Key" sidebar button in `ProfilePage` has been renamed to **"Gemini Key"**.

### New `src/lib/gemini-byok.ts` Helper

All AI endpoints use a dedicated helper that calls the Gemini REST API directly with the user's key — no `process.env` mutation. This fixes a critical race condition where concurrent requests from different users would have leaked each other's keys via `process.env.GEMINI_API_KEY` global state.

### Theme Renames + New Immersive Themes

- `islamic-green` → **`botanic-green`** ("🌿 Botanic Green")
- `golden-mosque` → **`saffron-gold`** ("🌟 Saffron Gold")

Three new immersive heavy themes added:
- **`theme-abyss-violet`** ("🌌 Abyss Violet") — 4-layer deep violet + magenta + indigo
- **`theme-obsidian-gold`** ("⚫ Obsidian Gold") — 4-layer near-black base with gold filaments
- **`theme-plasma-storm`** ("⚡ Plasma Storm") — 4-layer magenta + cyan + violet plasma

### Edit Profile Card Padding Fix

8 main-content `<Card>` components in `ProfilePage.tsx` had `py-0` (zero vertical padding) making content stick to the card borders. Changed to `py-5` for proper breathing room. The sidebar avatar card kept `py-0` since its inner blocks provide their own `p-5` padding.

### Granular Permissions Wired Into Admin API Routes

All admin API routes now use `requirePermission(request, '<permission_key>')` instead of coarse role checks:
- `manage_subjects` — `/api/subjects` POST, `/api/subjects/[id]` PUT/DELETE
- `manage_folders` — `/api/folders` POST, `/api/folders/[id]` PUT/DELETE
- `manage_images` — `/api/images` POST (also admin-only + transactional)
- `manage_announcements` — `/api/announcements` POST, `/api/announcements/[id]` DELETE
- `manage_admins` — `/api/users/promote` POST (super_admin only)
- `view_activity_log` — `/api/activity-log` GET

A regular admin with NO permissions assigned can no longer perform admin actions. Only super_admin (who implicitly has all permissions) bypasses the checks.

### AI Credits: Atomic Decrement + Recharge Cooldown

- `/api/scan/analyze-page` now deducts credits atomically via `db.user.updateMany({ where: { id, aiCredits: { gt: 0 } } })`. Concurrent requests can't both see the same credit balance.
- `/api/users/recharge-trial` now has a 24-hour cooldown (new `User.lastRechargeAt` column). Platform owners bypass.

### Settings Endpoints Race-Safe

`/api/settings/landing` and `/api/settings/banner` now use a race-safe create-then-on-conflict-update pattern (was: two super admins hitting PUT simultaneously could both create duplicate config rows).

### `/api/credentials` Production Hard-Block

The credentials endpoint now uses `isTestModeSafe()` — returns 404 in production even if `PRACPEDIA_TEST_PASSWORDS_VISIBLE=true` is set. Prevents a leaked `.env` from exposing credentials.

### `/api/bookings/[id]` paymentStatus Gating

Clients can no longer self-mark their booking as `paid`. Only admin/artist can set `paymentStatus`, and it must be one of `unpaid`, `paid`, `refunded`. Prevents forging a paid booking with no payment gateway integration.

### `/api/images` Admin-Only + Transactional

`/api/images` POST now requires admin role. The read-modify-write of `imagesJson` is wrapped in `db.$transaction` so concurrent uploads don't lose one image.

### Error Log Path Fixed for Vercel

`src/lib/error-log.ts` now writes to `/tmp/pracpedia-logs/errors.log` (was: `/home/z/my-project/logs/errors.log` which throws EROFS on Vercel serverless).

### AiAcademyRoom: Single Source of Truth for Gemini Key

`AiAcademyRoom` now reads `geminiApiKey` exclusively from `useAuth()`. Removed the separate local `googleApiKey` state that could drift out of sync. Added SSR guards to all localStorage-backed `useState` initializers. Added BYOK gate to `handleSendChat`.

### Admin Login: No Hardcoded Credentials

`/admin/login` no longer pre-fills `pracpedia@gmail.com` / `pracpedia123456789` into the form fields. The demo credentials hint is now gated behind `process.env.NODE_ENV !== 'production'` so it only shows in dev/preview.

### App Router Fallbacks

Added the standard App Router convention files:
- `src/app/loading.tsx` — uses the existing `<DataLoader />`
- `src/app/error.tsx` — branded error fallback with "Try again" + "Back to home"
- `src/app/global-error.tsx` — root error fallback (renders own `<html>`)
- `src/app/not-found.tsx` — branded 404 with subtle nebula backdrop

### Prisma Migrations Initialized

Created `prisma/migrations/0_init/migration.sql` as the baseline snapshot. Deleted the duplicate `prisma/schema.sqlite.prisma` and `prisma/schema.postgres.prisma`. The active `prisma/schema.prisma` is PostgreSQL-only. Added `db:deploy` script (`prisma migrate deploy`) for production CI/CD.

Also added `@@index([targetUserId])` and `@@index([createdById])` to the `Announcement` model.

### Production Server Instead of Dev Server

On memory-constrained hosts (4GB / no-swap), use `next start` (the production server) instead of `next dev`. The production server serves pre-built bundles — memory footprint is ~150MB vs 1.5GB+ for dev, response times are 3–50ms vs 5–15s, and there are no on-demand compiles to OOM the sandbox. A `start.sh` script at the project root builds (if needed) and starts the production server.

---

## Table of Contents

- [1. Theming & Visual Customization](#1-theming--visual-customization)
- [2. shadcn/ui Component Customization](#2-shadcnui-component-customization)
- [3. Adding a New Dashboard View](#3-adding-a-new-dashboard-view)
- [4. Adding a New API Route](#4-adding-a-new-api-route)
- [5. Extending the Database Schema](#5-extending-the-database-schema)
- [6. Customizing the Artist Marketplace](#6-customizing-the-artist-marketplace)
- [7. Adding a New AI Academy Mode](#7-adding-a-new-ai-academy-mode)
- [8. Environment Variables Reference](#8-environment-variables-reference)
- [9. Authentication & Role Customization](#9-authentication--role-customization)
- [10. Language & i18n](#10-language--i18n)
- [11. Logo & Branding](#11-logo--branding)
- [12. Sidebar Navigation Customization](#12-sidebar-navigation-customization)
- [13. Profile Page Tabs](#13-profile-page-tabs)
- [14. Admin Portal Tabs](#14-admin-portal-tabs)
- [15. Switching Database to PostgreSQL](#15-switching-database-to-postgresql)
- [16. Production Hardening Checklist](#16-production-hardening-checklist)

---

## 1. Theming & Visual Customization

### Theme Variables

All theme tokens live in [`src/app/globals.css`](./src/app/globals.css) under `:root`. The app uses HSL color values via CSS variables:

```css
:root {
  --background: 222 47% 5%;        /* page background */
  --foreground: 210 40% 98%;       /* primary text */
  --card: 222 47% 8%;              /* card background */
  --card-foreground: 210 40% 98%;
  --primary: 199 89% 48%;          /* cyan-500 — buttons, links */
  --primary-foreground: 222 47% 5%;
  --secondary: 217 33% 17%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 199 89% 48%;
  --destructive: 0 84% 60%;
  --border: 217 33% 20%;
  --input: 217 33% 20%;
  --ring: 199 89% 48%;
  --radius: 0.75rem;

  /* chart colors (used by Recharts) */
  --chart-1: 199 89% 48%;
  --chart-2: 142 71% 45%;
  --chart-3: 38 92% 50%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

### Built-in Theme Variants

The dashboard supports 6 runtime themes toggled via the `activeTheme` state in `src/app/page.tsx`. Each theme is a CSS class added to the root div:

| Theme class | Vibe | Source |
|---|---|---|
| `glass-main-bg` | Default dark glass | `globals.css` |
| `theme-peaceful-purple` | Soft purple | `globals.css` |
| `theme-deep-blue` | Deep ocean | `globals.css` |
| `theme-cosmic-black` | Pure black + neon | `globals.css` |
| `theme-mesh-aurora` | Aurora gradient | `globals.css` |
| `theme-emerald-green` | Green accent | `globals.css` |

### Adding a New Theme

1. **Define the theme class in `src/app/globals.css`:**

   ```css
   .theme-sunset-orange {
     --background: 20 60% 8%;
     --foreground: 30 80% 98%;
     --primary: 25 95% 55%;
     --accent: 25 95% 55%;
     --ring: 25 95% 55%;
     /* …override other tokens as needed… */
     background: linear-gradient(135deg, hsl(20 60% 8%), hsl(15 70% 12%));
   }
   ```

2. **Add the theme to the switch in `src/app/page.tsx` (around line 1404):**

   ```tsx
   <div className={`min-h-screen flex flex-col text-slate-100 relative transition-all duration-300 ${
     activeTheme === 'peaceful-purple' ? 'theme-peaceful-purple' :
     activeTheme === 'sunset-orange' ? 'theme-sunset-orange' :    // ← add this
     activeTheme === 'deep-blue' ? 'theme-deep-blue' :
     // …
     'glass-main-bg'
   }`}>
   ```

3. **Add a theme selector button** in the Sidebar or profile settings (search for `setActiveTheme` to find existing buttons).

### Custom Fonts

Fonts are loaded via `next/font/google` in `src/app/layout.tsx`:

```tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

To switch to Inter or Plus Jakarta Sans:

```tsx
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
```

For Bangla script support, add Noto Sans Bengali:

```tsx
import { Noto_Sans_Bengali } from "next/font/google";
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"] });
// Add `${bengali.variable}` to the body className
```

### Custom Brand Colors (Tailwind Config)

Edit [`tailwind.config.ts`](./tailwind.config.ts) to add brand colors:

```ts
theme: {
  extend: {
    colors: {
      brand: {
        50: '#f0fdfa',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
      },
    },
  },
},
```

Then use as `bg-brand-500`, `text-brand-600`, etc.

---

## 2. shadcn/ui Component Customization

shadcn/ui components live in [`src/components/ui/`](./src/components/ui/). They are **copied** into your project (not installed as a package), so you can edit them freely.

### Extending a Component Variant

Example — adding a `ghost` variant to the Button:

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center …",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground …",
        ghost: "bg-transparent hover:bg-white/5 text-slate-300",  // ← add
      },
      // …
    },
  }
);
```

### Adding a New Component via shadcn CLI

```bash
bunx shadcn@latest add tooltip
```

This downloads the component into `src/components/ui/tooltip.tsx` and updates `components.json`.

### Component Aliases

Defined in [`components.json`](./components.json):

```json
{
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

To rename a directory (e.g. `ui` → `primitives`), update both the alias and move the folder.

### Common Overrides

**Card padding** — `src/components/ui/card.tsx`:

```tsx
const Card = React.forwardRef<HTMLDivElement, …>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
));
// Default padding lives on CardHeader/CardContent, not Card itself.
```

**Button height** — override via className:

```tsx
<Button className="h-8 min-h-[32px] text-[11px]">Compact</Button>
<Button className="h-12 min-h-[48px] text-base">Large</Button>
```

---

## 3. Adding a New Dashboard View

The main dashboard (`src/app/page.tsx`) renders different views based on `currentView` state. To add a new view:

### Step 1 — Create the View Component

```tsx
// src/components/features/pages/MyNewView.tsx
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const MyNewView: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My New View</h1>
      <p className="text-slate-400">Hello, {user?.name}!</p>
    </div>
  );
};
```

### Step 2 — Register the View in `src/app/page.tsx`

Find the `currentView ===` conditional block (search for `currentView === 'profile'`) and add:

```tsx
{currentView === 'my_view' && (
  <div className="space-y-6 animate-in fade-in duration-300">
    <MyNewView />
  </div>
)}
```

Import at the top:

```tsx
import { MyNewView } from '@/components/features/pages/MyNewView';
```

### Step 3 — Add a Sidebar Navigation Entry

Edit [`src/components/features/Sidebar.tsx`](./src/components/features/Sidebar.tsx) — find the `handleNav` calls and add:

```tsx
<button onClick={() => handleNav('my_view')} className="…">
  <MyIcon className="w-4 h-4" />
  <span>My View</span>
</button>
```

### Step 4 — (Optional) Add to Breadcrumb

In `src/app/page.tsx`, find the breadcrumb switch (around line 1866) and add:

```tsx
{currentView === 'my_view' && (
  <>
    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 self-center" />
    <span className="text-slate-200 font-bold truncate">My View</span>
  </>
)}
```

---

## 4. Adding a New API Route

Next.js App Router uses file-based routing for APIs. Each file in `src/app/api/<path>/route.ts` becomes an endpoint at `/api/<path>`.

### Template — Public GET Endpoint

```ts
// src/app/api/hello/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello, world!' });
}
```

### Template — Authenticated POST Endpoint

```ts
// src/app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const payload = await getUserFromRequest(request);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  const body = await request.json();
  const { title } = body as { title: string };

  // 3. Validate
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // 4. Mutate DB
  const item = await db.someModel.create({ data: { title, userId: payload.userId } });

  // 5. Return
  return NextResponse.json({ item });
}
```

### Template — Role-Gated Endpoint

```ts
export async function POST(request: NextRequest) {
  const payload = await getUserFromRequest(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Role gate — only admin or super_admin
  if (payload.role !== 'admin' && payload.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // …rest of handler
}
```

### Dynamic Route Parameters

```ts
// src/app/api/items/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Promise in Next.js 15+
) {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item });
}
```

### Calling from the Client

```ts
import { useAuth } from '@/contexts/AuthContext';

const { apiFetch } = useAuth();

const res = await apiFetch('/api/my-feature', {
  method: 'POST',
  body: JSON.stringify({ title: 'Hello' }),
});
const data = await res.json();
```

`apiFetch` automatically attaches the `Authorization: Bearer <token>` header.

---

## 5. Extending the Database Schema

### Step 1 — Edit `prisma/schema.prisma`

```prisma
model NewEntity {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("new_entities")
}
```

Don't forget to add the back-relation on `User`:

```prisma
model User {
  // …existing fields…
  newEntities NewEntity[]
}
```

### Step 2 — Apply the Schema

For development (with data loss accepted):

```bash
bunx prisma db push
```

For a migration (production-safe):

```bash
bunx prisma migrate dev --name add_new_entity
```

### Step 3 — Regenerate the Client

```bash
bunx prisma generate
```

This updates `node_modules/@prisma/client` with the new types.

### Step 4 — Update the Serializer (if returning via API)

Edit [`src/lib/user-serializer.ts`](./src/lib/user-serializer.ts) to include new fields in `SerializedUser` if they're user-scoped.

### Field Type Reference (SQLite)

| Prisma Type | SQLite Column | Use For |
|---|---|---|
| `String` | TEXT | Short strings, emails, names |
| `String?` | TEXT NULL | Optional fields |
| `Int` | INTEGER | Counters, prices (BDT in paisa) |
| `Float` | REAL | Ratings, averages |
| `Boolean` | INTEGER (0/1) | Toggles |
| `DateTime` | TEXT (ISO 8601) | Timestamps |
| `String @default("[]")` | TEXT | JSON arrays (parse on read) |
| `Json` | TEXT | Native JSON (Prisma handles parsing) |

### SQLite Gotchas

- No native `ARRAY` type — store arrays as JSON strings (`specialtiesJson String @default("[]")`).
- No native `ENUM` — use `String` with a comment listing valid values.
- `DateTime` is stored as ISO 8601 text.
- Integer overflow at 2^31-1 (~2.1B) — for `studyTime` (seconds), use `Int` but clamp on write.

---

## 6. Customizing the Artist Marketplace

### Changing the Two-Tier Pricing Model

The marketplace currently uses two service tiers:

- `drawing_only` — Drawing only (price: `artist.rateDrawingOnly`)
- `drawing_writing` — Drawing + Writing (price: `artist.rateDrawingWriting`)

**To add a third tier (e.g. "Rush Delivery"):**

1. Add `rateRushDelivery Int @default(500)` to `User` in `prisma/schema.prisma`
2. `bunx prisma db push`
3. Update `src/lib/user-serializer.ts` to include `rateRushDelivery`
4. Update `SERVICE_META` in `src/components/features/pages/ArtistsPage.tsx`:

   ```ts
   const SERVICE_META = {
     drawing_only: { label: 'Drawing Only', icon: Pen, cls: '…' },
     drawing_writing: { label: 'Drawing + Writing', icon: PenLine, cls: '…' },
     rush_delivery: { label: 'Rush Delivery', icon: Zap, cls: '…' },  // ← add
   };
   ```

5. Update `POST /api/bookings` to derive `price` from the new tier:

   ```ts
   const price = serviceType === 'drawing_only' ? artist.rateDrawingOnly
              : serviceType === 'drawing_writing' ? artist.rateDrawingWriting
              : serviceType === 'rush_delivery' ? artist.rateRushDelivery
              : 0;
   ```

6. Update the booking modal UI to show the third option.

### Customizing the Booking Form

The booking modal lives in [`src/components/features/pages/ArtistsPage.tsx`](./src/components/features/pages/ArtistsPage.tsx). Search for `booking` or `commission` to find:

- The trigger button (artist card)
- The form fields (subject, description, reference images)
- The submit handler

### Notebook Provider Option

The marketplace supports a "client provides notebook" vs "artist provides notebook" toggle. Search for `notebookProvider` in:

- `prisma/schema.prisma` — `notebookProvider String @default("client")`
- `src/components/features/pages/ArtistsPage.tsx` — radio buttons
- `POST /api/bookings` — saves the field

### Commission Percentage (Admin Override)

Admins can set a commission percentage on each booking via the AdminCmsPage Commissions tab. The percentage is stored as `commissionAmount Int @default(0)` on `Booking`.

To change the calculation:

```ts
// src/app/api/bookings/[id]/route.ts (PUT handler)
const commissionAmount = Math.round((booking.price * body.commissionPercent) / 100);
await db.booking.update({
  where: { id },
  data: { commissionAmount },
});
```

---

## 7. Adding a New AI Academy Mode

The AI Academy has 4 modes (chat, lesson, mcq, cq). To add a 5th:

### Step 1 — Create the API Route

```ts
// src/app/api/academy/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  const payload = await getUserFromRequest(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { topic, subject, language = 'en' } = body;

  const apiKey = request.headers.get('x-gemini-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 400 });
  }

  try {
    const zai = await ZAI.create({ apiKey });
    const prompt = `Summarize the topic "${topic}" for HSC ${subject} students in ${language === 'bn' ? 'Bangla' : 'English'}.`;
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      // model, max_tokens, etc.
    });
    return NextResponse.json({ content: completion.choices[0]?.message?.content || '' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'AI failed' }, { status: 500 });
  }
}
```

### Step 2 — Add the UI Tab in AiAcademyRoom

Edit [`src/components/features/AiAcademyRoom.tsx`](./src/components/features/AiAcademyRoom.tsx) — find the tab switcher and add a new tab:

```tsx
<button
  onClick={() => setMode('summary')}
  className={mode === 'summary' ? 'active-tab' : 'inactive-tab'}
>
  <FileText className="w-4 h-4" />
  Summary
</button>
```

### Step 3 — Wire the Submit Handler

```tsx
const handleSubmit = async () => {
  const res = await apiFetch('/api/academy/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-api-key': geminiApiKey,
    },
    body: JSON.stringify({ topic, subject, language }),
  });
  const data = await res.json();
  setResponse(data.content);
};
```

### z-AI SDK Reference

The `z-ai-web-dev-sdk` wraps the Google Gemini API. Common methods:

```ts
const zai = await ZAI.create({ apiKey });

// Chat completion
const completion = await zai.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
});

// Streaming
const stream = await zai.chat.completions.create({
  messages: […],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

See <https://www.npmjs.com/package/z-ai-web-dev-sdk> for full API.

---

## 8. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Prisma connection string. SQLite: `file:./db/custom.db` |
| `JWT_SECRET` | ⚠️ | `pracpedia_default_secret_change_me_2026` | HMAC-SHA256 secret for JWT signing |
| `PRACPEDIA_TEST_PASSWORDS_VISIBLE` | ❌ | `false` | Enables `/api/credentials` plaintext password dump (test-mode only) |
| `GEMINI_API_KEY` | ❌ | — | Server-side fallback for AI Academy when user has no key |
| `PLATFORM_OWNER_EMAILS` | ❌ | — | Comma-separated emails that bypass Gmail blocking |
| `NODE_ENV` | auto | `development` | `production` for optimized builds |

### Adding a New Env Var

1. Add to `.env.example` (documented template)
2. Read in code via `process.env.MY_VAR`
3. For client-side env vars, prefix with `NEXT_PUBLIC_`:
   ```ts
   const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
   ```
4. TypeScript types — edit `next-env.d.ts` (auto-generated) or create `src/types/env.d.ts`:
   ```ts
   namespace NodeJS {
     interface ProcessEnv {
       DATABASE_URL: string;
       JWT_SECRET: string;
       MY_NEW_VAR?: string;
     }
   }
   ```

---

## 9. Authentication & Role Customization

### Adding a New Role

1. Update `User.role` defaults in `prisma/schema.prisma`:
   ```prisma
   role String @default("user") // "user" | "artist" | "moderator" | "admin" | "super_admin"
   ```

2. Update the `UserType` union in [`src/contexts/AuthContext.tsx`](./src/contexts/AuthContext.tsx):
   ```ts
   role: 'user' | 'artist' | 'moderator' | 'admin' | 'super_admin';
   ```

3. Update `SerializedUser` in [`src/lib/user-serializer.ts`](./src/lib/user-serializer.ts):
   ```ts
   role: 'user' | 'artist' | 'moderator' | 'admin' | 'super_admin';
   ```

4. Add role checks where needed:
   ```ts
   if (payload.role !== 'moderator' && payload.role !== 'admin' && payload.role !== 'super_admin') {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```

5. Add sidebar nav items conditional on the new role.

### Changing Password Hashing

Currently `bcryptjs` with 10 rounds. To switch to argon2:

1. `bun add argon2`
2. Edit `prisma/seed.ts` and `src/app/api/auth/register/route.ts`:
   ```ts
   import argon2 from 'argon2';
   const passwordHash = await argon2.hash(password);
   // Verify:
   const valid = await argon2.verify(user.passwordHash, password);
   ```

### Changing JWT Expiry

In [`src/lib/auth.ts`](./src/lib/auth.ts):

```ts
exp: now + 60 * 60 * 24 * 30,  // 30 days
```

Change to e.g. 24 hours:

```ts
exp: now + 60 * 60 * 24,  // 24 hours
```

### Adding OAuth (Google, GitHub, etc.)

The codebase has a stub for Google OAuth at `/api/auth/google` (not implemented). To add real OAuth:

1. `bun add next-auth @auth/core`
2. Configure `src/app/api/auth/[...nextauth]/route.ts`
3. Add Google credentials to `.env`:
   ```
   GOOGLE_CLIENT_ID=…
   GOOGLE_CLIENT_SECRET=…
   NEXTAUTH_SECRET=…
   ```
4. Replace the custom JWT logic in `AuthContext` with `next-auth/react`'s `useSession()`.

---

## 10. Language & i18n

The app supports English and Bangla via [`src/contexts/LanguageContext.tsx`](./src/contexts/LanguageContext.tsx).

### Adding a Translation Key

1. Open `LanguageContext.tsx` and find the `translations` object:

   ```ts
   const translations = {
     en: {
       appName: 'PracPedia',
       appSub: 'Practical Notebook Gallery',
       login: 'Login',
       // …add new keys here…
       myNewKey: 'My New Key',
     },
     bn: {
       appName: 'প্র্যাকপিডিয়া',
       appSub: 'প্রাকটিক্যাল নোটবুক গ্যালারি',
       login: 'লগইন',
       myNewKey: 'আমার নতুন কী',
     },
   };
   ```

2. Use in components:

   ```tsx
   const { t } = useLanguage();
   return <span>{t('myNewKey')}</span>;
   ```

### Adding a Third Language

1. Add the language code to the `Language` type:

   ```ts
   type Language = 'en' | 'bn' | 'hi';
   ```

2. Add translations:

   ```ts
   const translations = {
     en: { … },
     bn: { … },
     hi: { appName: 'प्रैकपीडिया', … },
   };
   ```

3. Add a language toggle button in the Sidebar.

### Server-Side i18n with next-intl

The project includes `next-intl` as a dependency but does not use it. For server-rendered translations:

1. Wrap the app in `NextIntlClientProvider` in `src/app/layout.tsx`
2. Add `src/messages/en.json` and `src/messages/bn.json`
3. Use `useTranslations()` from `next-intl` in client components

See <https://next-intl-docs.vercel.app/> for setup.

---

## 11. Logo & Branding

### Logo Files

- [`public/logo.svg`](./public/logo.svg) — Neon DNA-helix + pen-nib SVG (used as favicon)
- [`public/pracpedia_logo.jpg`](./public/pracpedia_logo.jpg) — Square JPG (used in sidebar + footer)

### Replacing the Logo

1. Replace the files in `public/`
2. Update references — search for `logo.svg` and `pracpedia_logo.jpg`:

   - `src/app/layout.tsx` — favicon
   - `src/components/features/Sidebar.tsx` — sidebar brand
   - `src/app/page.tsx` — header breadcrumb + footer

### Changing the App Name

Search for `PracPedia` across the codebase and replace with your brand:

```bash
rg -l "PracPedia" src/ prisma/ public/
```

Key files:
- `src/app/layout.tsx` — `<title>` and metadata
- `src/contexts/LanguageContext.tsx` — `appName` translation
- `src/components/features/Sidebar.tsx` — brand text
- `src/components/features/pages/LandingPage.tsx` — hero headline
- `README.md`

### Brand Color Override

To switch the primary accent from cyan to a different color:

1. Edit `--primary` and `--accent` in `src/app/globals.css`:

   ```css
   :root {
     --primary: 280 65% 60%;     /* purple */
     --accent: 280 65% 60%;
     --ring: 280 65% 60%;
   }
   ```

2. Update hardcoded Tailwind classes — search for `cyan-` and replace:

   ```bash
   rg "cyan-500|cyan-400|cyan-300" src/ | wc -l
   ```

   Replace with your brand color (e.g. `purple-500`).

---

## 12. Sidebar Navigation Customization

The Sidebar is in [`src/components/features/Sidebar.tsx`](./src/components/features/Sidebar.tsx).

### Adding a Nav Item

Find the existing nav buttons (search for `handleNav('dashboard')`) and add:

```tsx
<button
  onClick={() => handleNav('my_view')}
  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
    currentView === 'my_view'
      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
  }`}
>
  <MyIcon className="w-4 h-4 shrink-0" />
  <span className="text-xs font-semibold truncate">My View</span>
</button>
```

### Conditional Rendering by Role

```tsx
{(user?.role === 'admin' || user?.role === 'super_admin') && (
  <button onClick={() => handleNav('admins')}>
    <Shield className="w-4 h-4" />
    <span>Admin Portal</span>
  </button>
)}

{user?.role === 'artist' && (
  <button onClick={() => handleNav('artist_dashboard')}>
    <Palette className="w-4 h-4" />
    <span>Artist Dashboard</span>
  </button>
)}
```

### Sidebar Width

Edit the `aside` className in `Sidebar.tsx`:

```tsx
<aside className="… lg:w-72 …">  // ← change lg:w-72 to lg:w-80 or lg:w-64
```

Also update `lg:w-72` references in `src/app/page.tsx` (the main content offset).

---

## 13. Profile Page Tabs

The Profile page has 5 tabs defined in [`src/components/features/pages/ProfilePage.tsx`](./src/components/features/pages/ProfilePage.tsx):

1. **Profile** — name, phone, bio, avatar
2. **Marketplace** — artist rates + specialties (artist only)
3. **Portfolio** — artist's portfolio grid (artist only)
4. **Commissions** — bookings where user is the client
5. **Security** — account type, BYOK info, email display, delete account

### Adding a New Tab

1. Add to the `Tabs` component:

   ```tsx
   <TabsTrigger value="notifications">
     <Bell className="w-3.5 h-3.5" />
     Notifications
   </TabsTrigger>
   ```

2. Add the tab content:

   ```tsx
   <TabsContent value="notifications">
     <NotificationsTab />
   </TabsContent>
   ```

3. Implement the tab component (in the same file or a new one).

### Tab Visibility by Role

```tsx
{user?.role === 'artist' && (
  <TabsTrigger value="marketplace">
    <Palette className="w-3.5 h-3.5" />
    Marketplace
  </TabsTrigger>
)}
```

---

## 14. Admin Portal Tabs

The Admin Portal is in [`src/components/features/pages/AdminCmsPage.tsx`](./src/components/features/pages/AdminCmsPage.tsx).

Tabs: Overview · Users · Content · Announcements · Hire Requests · Commissions · Activity Log

### Adding a New Tab

1. Add a `TabsTrigger`:

   ```tsx
   <TabsTrigger value="reports">
     <Flag className="w-3.5 h-3.5" />
     Reports
   </TabsTrigger>
   ```

2. Add a `TabsContent`:

   ```tsx
   <TabsContent value="reports">
     <ReportsTab />
   </TabsContent>
   ```

3. Implement `ReportsTab` — typically lists entries from a new `Report` model (see [Extending the Database Schema](#5-extending-the-database-schema)).

### Restricting Tabs to Super Admin

```tsx
{user?.role === 'super_admin' && (
  <TabsTrigger value="credentials">
    <Key className="w-3.5 h-3.5" />
    Credentials
  </TabsTrigger>
)}
```

---

## 15. Switching Database to PostgreSQL

SQLite is great for development but doesn't scale to production multi-instance deployments. To switch to Postgres:

### Step 1 — Provision a Postgres Instance

Options:
- **Neon** (serverless Postgres, free tier) — <https://neon.tech>
- **Supabase** (Postgres + auth + storage) — <https://supabase.com>
- **Railway** — <https://railway.app>
- **Self-hosted** — `docker run -e POSTGRES_PASSWORD=… postgres:16`

### Step 2 — Update `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"      // ← was "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 3 — Update `.env`

```
DATABASE_URL=postgresql://user:password@host:5432/pracpedia?schema=public
```

### Step 4 — Migrate

```bash
# Delete the old SQLite DB and migrations
rm -rf prisma/migrations db/

# Create the initial migration
bunx prisma migrate dev --name init

# Seed
bunx prisma db seed
```

### Step 5 — Re-test

```bash
bun run dev
```

### Postgres-Specific Schema Improvements

Once on Postgres, you can use native types:

```prisma
model User {
  // …
  specialties String[]   // ← native array (was specialtiesJson String)
  role        Role       // ← native enum (was String)
}

enum Role {
  USER
  ARTIST
  ADMIN
  SUPER_ADMIN
}
```

Then update `serializeUser` to remove the JSON parsing.

---

## 16. Production Hardening Checklist

Before deploying to production, walk through this checklist:

### Security

- [ ] **Change `JWT_SECRET`** to a random 32+ character string (`openssl rand -hex 32`)
- [ ] **Set `PRACPEDIA_TEST_PASSWORDS_VISIBLE=false`** (or unset) to disable the credentials viewer
- [ ] **Remove the `/api/credentials` route** if not needed at all
- [ ] **Enable HTTPS** — use a reverse proxy (Caddy, nginx) or Vercel's auto-TLS
- [ ] **Add rate limiting** — use `@upstash/ratelimit` or a middleware in `src/middleware.ts`
- [ ] **Audit CORS** — currently wide open; restrict `Access-Control-Allow-Origin` to your frontend domain
- [ ] **Add CSRF protection** for cookie-based auth (not needed for Bearer token auth, which is what we use)

### Performance

- [ ] **Switch to Postgres** (or MySQL) — SQLite doesn't handle concurrent writes well
- [ ] **Add database indexes** on frequently queried fields (`User.email`, `Booking.clientId`, `Booking.artistId`, `ChatMessage.subjectId`)
- [ ] **Add Redis caching** for `/api/stats`, `/api/subjects`, `/api/artists` (read-heavy, rarely change)
- [ ] **Move image uploads to S3/R2** — base64 in DB bloats fast; use presigned URLs
- [ ] **Enable Next.js ISR** for landing page (`export const revalidate = 60`)
- [ ] **Add `<Image>` from `next/image`** instead of `<img>` for automatic optimization

### Reliability

- [ ] **Add error monitoring** — Sentry (`@sentry/nextjs`)
- [ ] **Add structured logging** — `pino` or `winston`
- [ ] **Add health checks** — `/api/health` route that pings the DB
- [ ] **Add database backups** — automated daily snapshots
- [ ] **Set up uptime monitoring** — UptimeRobot, BetterUptime

### UX

- [ ] **Add loading skeletons** for all async views (some exist via `DataLoader`)
- [ ] **Add error boundaries** — React `ErrorBoundary` component per view
- [ ] **Add offline support** — service worker via `next-pwa`
- [ ] **Add real-time chat** — migrate from polling to Server-Sent Events or WebSocket
- [ ] **Add email notifications** — for booking status changes, announcements (Resend, SendGrid)

### Deployment

- [ ] **Set `NODE_ENV=production`**
- [ ] **Run `bun run build`** and verify no errors
- [ ] **Test the standalone output** — `node .next/standalone/server.js`
- [ ] **Set up CI/CD** — GitHub Actions to auto-deploy on push
- [ ] **Set up preview deployments** — Vercel preview URLs per PR
- [ ] **Configure custom domain** — add CNAME/A records

### Legal

- [ ] **Add a Privacy Policy** page
- [ ] **Add Terms of Service** page
- [ ] **Add a Cookie Policy** if using cookies
- [ ] **Add GDPR consent banner** if serving EU users
- [ ] **Add an `imprint` page** if serving German users

---

## Need More Help?

- **Bug reports & feature requests:** Open an issue on GitHub
- **Code questions:** Search the codebase with `rg "keyword" src/`
- **Next.js docs:** <https://nextjs.org/docs>
- **Prisma docs:** <https://www.prisma.io/docs>
- **shadcn/ui docs:** <https://ui.shadcn.com>
- **Tailwind CSS docs:** <https://tailwindcss.com/docs>
- **z-AI SDK:** <https://www.npmjs.com/package/z-ai-web-dev-sdk>

Happy hacking! 🚀
