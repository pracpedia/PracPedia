# PracPedia

**A Bangladesh HSC Science Practical Notebook Portal** — built for students, artists, and administrators to collaborate on practical notebooks, commission artwork, and access AI tutoring.

Built with **Next.js 16 (App Router)**, **Prisma ORM**, **SQLite**, **Tailwind CSS v4**, **shadcn/ui**, and the **z-AI web-dev SDK** for LLM features (BYOK — Bring Your Own Gemini Key).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication & Roles](#authentication--roles)
- [API Reference](#api-reference)
- [Frontend Architecture](#frontend-architecture)
- [Artist Marketplace](#artist-marketplace)
- [AI Academy (BYOK)](#ai-academy-byok)
- [Classroom Discussion](#classroom-discussion)
- [Admin Portal](#admin-portal)
- [Themes & Customization](#themes--customization)
- [Build & Deploy](#build--deploy)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

PracPedia is a single-page Next.js application that serves as a digital practical-notebook gallery for Bangladeshi HSC Science students. It combines:

1. **A subject/folder/image gallery** — admins create subjects (Physics, Chemistry, Biology, ICT, Higher Math) and folders, students browse practical experiments with diagrams.
2. **An artist marketplace** — students commission professional illustrations from verified artists with two service tiers (Drawing Only / Drawing + Writing) and a transparent BDT pricing model.
3. **A classroom discussion board** — real-time chat per subject (or global), with image upload support.
4. **An AI Academy** — students ask questions and receive AI-generated lessons, MCQs, and worked solutions using their own Gemini API key (BYOK model).
5. **An admin portal** — super admins and admins manage users, artists, commissions, announcements, and platform integrity from a unified CMS.

The app ships with seed data for 6 demo accounts (super admin, admin, student, artist + secondary admin and artist), so you can log in and explore immediately.

---

## Key Features

### For Students
- Browse practical notebooks organized by subject → folder → image
- Commission custom drawings from marketplace artists
- Chat with classmates and teachers in the classroom discussion board
- Access AI-powered tutoring (lessons, MCQs, creative-question solver)
- Track study time and recent folder views
- Rate artists after order completion (1–5 stars + optional review)
- Multilingual UI (English / Bangla)

### For Artists
- Register as an artist with a portfolio and two-tier pricing
- Set BDT rates for "Drawing Only" and "Drawing + Writing" services
- Toggle availability for new commissions
- Manage incoming bookings (accept → in progress → completed)
- Showcase portfolio items with tags (Physics, Chemistry, etc.)
- Receive ratings from clients

### For Admins
- Create / edit / delete subjects and folders
- Upload practical notebook images
- Promote users to admins, demote admins back to users
- View real-time platform stats (users, subjects, folders, announcements)
- Manage announcements with deadlines
- Approve / reject hire requests from the public contact form
- Set commission percentages on bookings (admin override)

### For Super Admins
- All admin capabilities, plus:
- Promote users to super admins
- Demote admins and artists (cannot demote self or other super admins)
- Access the System Credentials viewer (test-mode only — see [Security Notes](#security-notes))
- Protected from regular admin actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 + `tw-animate-css` |
| Components | shadcn/ui (new-york style) + Radix UI primitives |
| Icons | lucide-react |
| Animation | Framer Motion + GSAP |
| State | React Context + hooks (no Redux/Zustand for app state) |
| Database | SQLite via Prisma ORM v6 |
| Auth | Custom JWT (HMAC-SHA256 via Web Crypto API) |
| AI | z-ai-web-dev-sdk (BYOK — users supply their own Gemini API key) |
| Markdown | react-markdown + remark-math + rehype-katex |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Package Manager | Bun (also works with npm/pnpm) |

---

## Project Structure

```
pracpedia/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Subject, Folder, Booking, …)
│   └── seed.ts                # Seeds 6 demo accounts + sample subjects/folders
├── public/
│   ├── logo.svg               # Neon DNA-helix + pen-nib brand mark
│   ├── pracpedia_logo.jpg     # Favicon / sidebar logo
│   └── robots.txt
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout — wraps everything in AuthProvider + LanguageProvider
│   │   ├── page.tsx           # Main dashboard SPA (~2,900 lines, hosts all views)
│   │   ├── globals.css        # Tailwind directives + theme variables + custom utilities
│   │   └── api/               # REST API routes (see API Reference below)
│   │       ├── auth/          # /api/auth/{login,register,me,track-time}
│   │       ├── users/         # /api/users/{admins,students,super-admins,promote,demote,…}
│   │       ├── artists/       # /api/artists + /api/artists/register + /api/artists/[id]
│   │       ├── bookings/      # /api/bookings + /api/bookings/[id] (+ /rate subroute)
│   │       ├── subjects/      # /api/subjects + /api/subjects/[id]
│   │       ├── folders/       # /api/folders + /api/folders/[id]
│   │       ├── images/        # /api/images + /api/images/[folderId]/[imgIndex]
│   │       ├── chat/          # /api/chat + /api/chat/[subjectId]
│   │       ├── academy/       # /api/academy/{chat,lesson,mcq,cq}
│   │       ├── announcements/ # /api/announcements + /api/announcements/[id]
│   │       ├── portfolio/     # /api/portfolio + /api/portfolio/[id]
│   │       ├── profile/       # /api/profile
│   │       ├── credentials/   # /api/credentials (super_admin only, test-mode)
│   │       ├── hire/          # /api/hire (public contact form + admin inbox)
│   │       └── stats/         # /api/stats (public aggregate counts)
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (Button, Card, Dialog, …)
│   │   └── features/          # Feature-level components
│   │       ├── pages/         # Top-level view components
│   │       │   ├── AuthPage.tsx           # Login + Register tabs
│   │       │   ├── LandingPage.tsx        # Public marketing page
│   │       │   ├── AdminCmsPage.tsx       # Admin/super-admin portal
│   │       │   ├── ArtistDashboard.tsx    # Artist self-management
│   │       │   ├── ArtistsPage.tsx        # Marketplace listing + booking modal
│   │       │   ├── CredentialsView.tsx    # Super-admin credential viewer
│   │       │   ├── ProfilePage.tsx        # Profile editor (5 tabs)
│   │       │   └── …
│   │       ├── Sidebar.tsx                # Left navigation drawer
│   │       ├── ClassroomDiscussion.tsx    # Real-time chat with image upload
│   │       ├── AiAcademyRoom.tsx          # AI tutor UI (chat + lesson + MCQ + CQ)
│   │       ├── Lightbox.tsx               # Fullscreen image viewer
│   │       ├── UploadModal.tsx            # Image upload dialog
│   │       ├── FolderModal.tsx            # Folder create/edit dialog
│   │       ├── GeminiKeyModal.tsx         # BYOK API key entry
│   │       ├── FormattedMarkdown.tsx      # Markdown + KaTeX renderer
│   │       ├── ConfirmModal.tsx           # Confirmation dialog
│   │       ├── DataLoader.tsx             # Skeleton loader
│   │       ├── StatsGrid.tsx              # Dashboard stats cards
│   │       └── GsapStudentCounter.tsx     # Animated counter on landing
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Token + user state, apiFetch helper, study-time tracking
│   │   └── LanguageContext.tsx # English / Bangla translation map + `t()` helper
│   ├── hooks/
│   │   ├── use-mobile.ts       # `true` when viewport < 768px
│   │   └── use-toast.ts        # Toast hook (shadcn/ui)
│   └── lib/
│       ├── auth.ts             # JWT sign/verify via Web Crypto API + getUserFromRequest()
│       ├── db.ts               # PrismaClient singleton (prevents hot-reload exhaustion)
│       ├── storage.ts          # SSR-safe localStorage wrapper (safeLocalStorage)
│       ├── user-serializer.ts  # Prisma User row → API response shape
│       └── utils.ts            # cn() classname merge helper
├── .env                        # Local env (DATABASE_URL, JWT_SECRET, …)
├── .env.example                # Documented template — copy to .env
├── .gitignore
├── components.json             # shadcn/ui config (style: new-york)
├── eslint.config.mjs
├── next.config.ts              # output: "standalone" for production
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** (or **Bun 1.1+** — recommended, faster installs)
- **Python 3.10+** (only needed for the Prisma binary on some Linux setups)

### Install & Run

```bash
# 1. Clone
git clone <your-repo-url> pracpedia
cd pracpedia

# 2. Install deps (bun is preferred — npm/pnpm also work)
bun install

# 3. Copy env template and edit if needed
cp .env.example .env

# 4. Create the SQLite database and apply the schema
bunx prisma db push

# 5. Seed demo data (6 users + sample subjects/folders)
bunx prisma db seed
# (or) bunx tsx prisma/seed.ts

# 6. Start the dev server
bun run dev
```

Open <http://localhost:3000> — you should see the landing page. Click **Login** and use a demo account (see below).

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@gallery.com` | `admin123` |
| Admin | `admin2@gallery.com` | `admin123` |
| Student | `student@gallery.com` | `user123` |
| Artist | `sajid@draw.com` | `artist123` |
| Artist 2 | `nadia@artbd.com` | `artist123` |
| Student 2 | `arif@student.com` | `user123` |

> ⚠️ Passwords in the seed script are hashed with bcrypt (10 rounds). The plaintext passwords above are for **local development only**.

---

## Environment Variables

All env vars live in `.env` (gitignored). See `.env.example` for a documented template.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Prisma connection string. SQLite example: `file:./db/custom.db` |
| `JWT_SECRET` | ⚠️ | `pracpedia_default_secret_change_me_2026` | HMAC-SHA256 secret for signing JWTs. **Change in production.** |
| `PRACPEDIA_TEST_PASSWORDS_VISIBLE` | ❌ | `false` | When `true`, the `/api/credentials` endpoint returns demo-account plaintext passwords. **Test-mode only.** |
| `GEMINI_API_KEY` | ❌ | — | Optional server-side fallback for AI Academy routes when the user has not supplied their own key. |
| `PLATFORM_OWNER_EMAILS` | ❌ | — | Comma-separated list of email addresses that bypass Gmail-blocking and other client-side checks. |
| `NODE_ENV` | auto | `development` | Set to `production` for optimized builds. |

---

## Database

Prisma + SQLite. Schema defined in `prisma/schema.prisma`.

### Models

| Model | Purpose | Notable Fields |
|---|---|---|
| **User** | All account types (student/artist/admin/super_admin) | `role`, `passwordHash`, `studyTime`, `isPremium`, `rating`, `completedOrders`, `rateDrawingOnly`, `rateDrawingWriting`, `specialtiesJson` |
| **Subject** | Top-level category (Physics, Chemistry, …) | `title`, `description` |
| **Folder** | Practical notebook collection under a subject | `subjectId`, `title`, `imagesJson` (JSON array of `{url, title}`) |
| **Announcement** | Platform-wide notices | `title`, `content`, `deadline`, `createdByName` |
| **ChatMessage** | Classroom discussion messages | `subjectId` (null = global), `userId`, `text` |
| **HireRequest** | Public contact-form submissions | `fullName`, `email`, `phone`, `subject`, `message`, `status` |
| **Booking** | Commission order (client → artist) | `clientId`, `artistId`, `serviceType`, `price`, `status`, `paymentStatus`, `artistNotes` (rating marker stored here) |
| **PortfolioItem** | Artist's portfolio image | `artistId`, `imageUrl`, `title`, `tagsJson` |

### Schema Lifecycle

- `prisma db push` — apply schema changes (development, with data loss accepted)
- `prisma migrate dev` — create a migration (production-ready)
- `prisma migrate reset` — wipe and re-run all migrations
- `prisma db seed` — run `prisma/seed.ts` to populate demo data
- `prisma generate` — regenerate the Prisma Client after schema changes

### SQLite File Location

By default, the DB lives at `file:./db/custom.db` (relative to project root). For persistence across container rebuilds, mount a volume at `/app/db` in production.

---

## Authentication & Roles

### JWT Implementation

Custom JWT (no `next-auth` dependency in the request path). See `src/lib/auth.ts`:

- **Algorithm:** HMAC-SHA256 via Web Crypto API (`crypto.subtle`)
- **Format:** Standard JWT — `header.payload.signature` (base64url-encoded)
- **Expiry:** 30 days from issue
- **Storage:** Client-side `localStorage` under the `png_token` key
- **Verification:** Every API route calls `getUserFromRequest(request)` which extracts the Bearer token, verifies the signature, checks expiry, and returns `{ userId, email, role }` or `null`.

### Roles (ascending privilege)

1. **`user`** — Student. Can browse, commission, chat, use AI Academy, edit own profile.
2. **`artist`** — Has all `user` rights, plus: set rates, manage portfolio, accept bookings, receive ratings.
3. **`admin`** — Manages subjects/folders/images/announcements, promotes/demotes regular users, views hire requests.
4. **`super_admin`** — All admin rights, plus: promotes/demotes admins, cannot be demoted by other admins, accesses the System Credentials viewer (test-mode).

### Auth Flow

```
[Client] POST /api/auth/login { email, password }
   ↓
[Server] verify password (bcrypt compare), sign JWT, return { token, user }
   ↓
[Client] store token in localStorage, attach to every request via apiFetch()
   ↓
[Server] every protected route calls getUserFromRequest(request) → Bearer JWT verify
```

### `apiFetch()` Helper

The `AuthContext` exposes `apiFetch(url, options)` — a fetch wrapper that automatically:

1. Attaches `Authorization: Bearer <token>` header
2. Sends `Content-Type: application/json` for POST/PUT
3. Returns the raw `Response` (caller does `.json()`)

Always use `apiFetch` instead of bare `fetch` for authenticated calls.

---

## API Reference

39 route files, 54 HTTP handlers, 15 domains. Full catalog below — see `CUSTOMIZATION.md` for guidance on extending each domain.

### `/api/auth/*` — Authentication

| Method | Path | Description | Auth | Body |
|---|---|---|---|---|
| POST | `/api/auth/login` | Email/password login → JWT | Public | `{ email, password }` |
| POST | `/api/auth/register` | Register user or artist | Public | `{ email, password, name?, role?, ...artistFields? }` |
| GET | `/api/auth/me` | Get current user profile | Bearer | — |
| POST | `/api/auth/track-time` | Add seconds to `studyTime` | Bearer | `{ seconds: number }` |

### `/api/users/*` — User Management

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/users/super-admins` | List all super_admins | Bearer |
| GET | `/api/users/admins` | List admins + super_admins | Bearer |
| GET | `/api/users/students` | List students | admin+ |
| POST | `/api/users/promote` | Promote user → admin | admin+ |
| POST | `/api/users/promote-super` | Promote user → super_admin | super_admin |
| POST | `/api/users/demote` | Demote admin/artist → user | admin+ |
| GET | `/api/users/scare-status` | Easter-egg trigger flags | Bearer |
| POST | `/api/users/clear-scare` | Reset scare flag | Bearer |
| POST | `/api/users/clear-cat` | Reset cat flag | Bearer |

### `/api/artists/*` — Artist Marketplace

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/artists` | List all artists (sorted) | Public |
| GET | `/api/artists/[id]` | Get artist + portfolio | Public |
| POST | `/api/artists/register` | Register as artist | Public |
| PUT | `/api/artists/register` | Update own artist profile | Artist |

### `/api/bookings/*` — Commissions

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/bookings?scope=client\|artist` | List bookings (filtered by role) | Bearer |
| POST | `/api/bookings` | Create commission | Bearer |
| GET | `/api/bookings/[id]` | Get single booking | Party or admin |
| PUT | `/api/bookings/[id]` | Update status / payment / notes | Party or admin |
| DELETE | `/api/bookings/[id]` | Soft-cancel (status → cancelled) | Party or admin |
| POST | `/api/bookings/[id]/rate` | Client rates artist 1–5 stars | Client of booking |

**Booking lifecycle:** `pending` → `in_progress` → `completed` (or `cancelled` at any point). On transition to `completed`, `artist.completedOrders` is incremented. Rolling back decrements it.

### `/api/subjects/*`, `/api/folders/*`, `/api/images/*` — Gallery Content

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/subjects` | List subjects | Public |
| POST | `/api/subjects` | Create subject | admin |
| GET/PUT/DELETE | `/api/subjects/[id]` | CRUD one subject | Public / admin / admin |
| GET | `/api/folders` | List folders (with parsed images) | Public |
| POST | `/api/folders` | Create folder | admin |
| GET/PUT/DELETE | `/api/folders/[id]` | CRUD one folder | Public / admin / admin |
| POST | `/api/images` | Append image to folder | Bearer |
| DELETE | `/api/images/[folderId]/[imgIndex]` | Remove image at index | admin |

### `/api/chat/*` — Classroom Discussion

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/chat` | Global messages (up to 200) | Bearer |
| POST | `/api/chat` | Post message (text + optional subjectId) | Bearer |
| DELETE | `/api/chat?id=…` | Delete own message (or admin) | Bearer |
| GET | `/api/chat/[subjectId]` | Subject-scoped messages | Bearer |

### `/api/academy/*` — AI Academy (BYOK)

All four routes use the z-ai-web-dev-sdk and gracefully degrade to templated fallbacks on AI failure.

| Method | Path | Description | Body |
|---|---|---|---|
| POST | `/api/academy/chat` | Generic AI tutor Q&A | `{ prompt, subject?, language? }` |
| POST | `/api/academy/lesson` | Structured lesson (Overview → Practice) | `{ prompt?, subject?, topic?, language? }` |
| POST | `/api/academy/mcq` | Generate N MCQs as JSON | `{ subject?, topic?, count?, language? }` |
| POST | `/api/academy/cq` | Solve creative question (Given/Required/Solution) | `{ subject?, topic?, question, language? }` |

### Other Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET/POST | `/api/announcements` | List / create announcements | Public / admin |
| DELETE | `/api/announcements/[id]` | Delete announcement | admin |
| GET/POST | `/api/portfolio` | List (any artist) / add own portfolio item | Bearer / Artist |
| DELETE | `/api/portfolio/[id]` | Delete portfolio item | Owner or super_admin |
| PUT | `/api/profile` | Update own profile (re-issues JWT) | Bearer |
| GET | `/api/credentials` | Full system snapshot + demo accounts (test-mode) | super_admin |
| GET | `/api/hire` | List hire requests | admin |
| POST | `/api/hire` | Public contact form submission | Public |
| GET | `/api/stats` | Aggregate counts | Public |

---

## Frontend Architecture

### Single-Page Dashboard

The main dashboard (`src/app/page.tsx`, ~2,900 lines) is a single-page app that renders different views based on `currentView` state:

- `dashboard` — Home stats grid + recent activity
- `subject` — Subject detail with folder list
- `folder` — Folder detail with image grid + Lightbox
- `artists` — Marketplace listing + booking modal
- `artist_dashboard` — Artist self-management (artist role only)
- `profile` — Profile editor (5 tabs)
- `chat` — Classroom discussion
- `academy` — AI Academy room
- `admins` — Admin/super-admin portal
- `creds` — System credentials (super_admin only)

Navigation is driven by `setView(view, subjectId?, folderId?)` from the Sidebar.

### Context Providers

Two providers wrap the app in `src/app/layout.tsx`:

1. **`AuthProvider`** (`src/contexts/AuthContext.tsx`) — exposes `{ user, token, login, logout, apiFetch, setUser, updateSession, updateUserStudyTime, geminiApiKey, setGeminiApiKey, isKeyModalOpen, setIsKeyModalOpen, language, setLanguage }`.
2. **`LanguageProvider`** (`src/contexts/LanguageContext.tsx`) — exposes `{ language, setLanguage, t }` with English/Bangla translations.

### Component Conventions

- **`'use client'`** directive at the top of every interactive component.
- All API calls go through `useAuth().apiFetch` (auto-attaches JWT).
- shadcn/ui primitives live in `src/components/ui/` — never edit these directly; extend via className.
- Feature components live in `src/components/features/` and `src/components/features/pages/`.
- Toasts via `useToast()` hook from `src/hooks/use-toast.ts`.
- Animations via `motion` from `framer-motion` (not `framer-motion/third-party`).

### Theming

CSS variables defined in `src/app/globals.css` under `:root` and `.dark`. The dashboard supports 6 theme variants toggled at runtime:

- `glass-main-bg` (default — dark glass)
- `theme-peaceful-purple`
- `theme-deep-blue`
- `theme-cosmic-black`
- `theme-mesh-aurora`
- `theme-emerald-green`

See [CUSTOMIZATION.md](./CUSTOMIZATION.md) for theme editing instructions.

---

## Artist Marketplace

### Two-Tier Pricing

Each artist sets two BDT rates:

- **`rateDrawingOnly`** — price for a drawing with no written content (default 150 BDT)
- **`rateDrawingWriting`** — price for drawing + handwritten explanation (default 300 BDT)

### Booking Lifecycle

```
[Student] views artist card → clicks "Commission" → fills booking form
   ↓
[POST /api/bookings] → creates Booking with status=pending, price=artist.rate
   ↓
[Artist] sees booking in dashboard → accepts (status=in_progress)
   ↓
[Artist] completes work → marks status=completed (completedOrders++)
   ↓
[Student] sees "Rate This Artist" card in Profile → Commissions tab
   ↓
[POST /api/bookings/[id]/rate] → stores rating in artistNotes, recalculates artist.rating average
```

### Rating System

Ratings are stored as a marker string inside `Booking.artistNotes`:

```
[Rating: 4/5 — "Great work, delivered on time!"]
```

The `/api/bookings/[id]/rate` endpoint parses all completed bookings for an artist, extracts ratings, and updates `User.rating` to the average (rounded to 1 decimal).

---

## AI Academy (BYOK)

### Bring Your Own Key

PracPedia does **not** ship with a server-side AI key. Each user supplies their own Gemini API key, stored locally in `localStorage` under `user_gemini_key`. The key is sent to the server only in the `x-gemini-api-key` header when calling `/api/academy/*` routes.

To get a key:
1. Visit <https://aistudio.google.com/app/apikey>
2. Create an API key (free tier available)
3. Click the **Key** icon in the PracPedia sidebar → paste → Save

### Four AI Modes

1. **Chat** — Free-form Q&A with the AI tutor. Returns Markdown.
2. **Lesson** — Generates a structured lesson with Overview, Key Concepts, Examples, and Practice Questions.
3. **MCQ** — Generates N multiple-choice questions as JSON `{ question, options[4], answer, explanation }`.
4. **CQ (Creative Question)** — Solves a HSC-style creative question with Given / Required / Solution / Answer / Alternative format.

All routes support `language: 'en' | 'bn'` for English or Bangla responses.

---

## Classroom Discussion

Real-time chat per subject (or global). Features:

- Multi-line messages (Enter to send, Shift+Enter for newline)
- Image upload via base64 data URL (stored inline in `ChatMessage.imageUrl`)
- Per-subject threading (`/api/chat/[subjectId]`)
- Delete own messages (admins can delete anyone's)
- Auto-scroll to latest
- Avatar + role badge per message

**Polling:** The chat UI polls `/api/chat/[subjectId]` every 5 seconds for new messages. For true real-time, consider migrating to Server-Sent Events or a WebSocket gateway.

---

## Admin Portal

Located in `src/components/features/pages/AdminCmsPage.tsx`. Tabs:

1. **Overview** — Platform stats (users, subjects, folders, announcements, hires)
2. **Users** — Promote/demote users, view study time, premium status
3. **Content** — Manage subjects, folders, images
4. **Announcements** — Create/delete announcements with deadlines
5. **Hire Requests** — Approve/reject public contact submissions
6. **Commissions** — View all bookings, set admin commission percentage
7. **Activity Log** — Real-time platform activity stream

### Super Admin Exclusives

- **Promote to Super Admin** — elevates a regular admin
- **System Credentials** view — only visible when `PRACPEDIA_TEST_PASSWORDS_VISIBLE=true`

---

## Themes & Customization

See **[CUSTOMIZATION.md](./CUSTOMIZATION.md)** for:
- Theme color variables and how to add a new theme
- shadcn/ui component extension patterns
- Adding new API routes
- Adding new dashboard views
- Customizing the artist marketplace
- Adding new AI Academy modes
- Environment variable reference
- Database schema extension guide

---

## Build & Deploy

### Development

```bash
bun run dev          # http://localhost:3000 with hot reload
bun run lint         # ESLint
```

### Production (Standalone)

The `next.config.ts` sets `output: 'standalone'`, which produces a self-contained `.next/standalone/` directory with all deps bundled.

```bash
bun run build        # Builds + copies static + public into .next/standalone
bun run start        # Runs the standalone server.js
```

### Deploy Targets

- **Vercel** — Push to GitHub, import on Vercel, set env vars. SQLite won't persist across serverless invocations — switch to Postgres or Neon for production.
- **Docker** — Use the standalone output:
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY .next/standalone ./
  COPY .next/static ./.next/static
  COPY public ./public
  COPY db ./db
  EXPOSE 3000
  CMD ["node", "server.js"]
  ```
- **Self-hosted VPS** — `bun run build && bun run start` behind nginx/Caddy.

### Switching to PostgreSQL

1. Change `DATABASE_URL` to `postgresql://user:pass@host:5432/dbname`
2. Update `prisma/schema.prisma` → `provider = "postgresql"`
3. `bunx prisma migrate dev --name init`
4. `bunx prisma db seed`

---

## Security Notes

### Test-Mode Features (Disable in Production!)

1. **System Credentials Viewer** (`/api/credentials`) — Returns demo-account emails with **plaintext passwords** when `PRACPEDIA_TEST_PASSWORDS_VISIBLE=true`. Only super_admins can access it, but it should be disabled in production by setting the env var to `false` (or unsetting it).
2. **Plaintext password storage** — The current `AuthContext` flow uses bcrypt hashing (10 rounds) in `prisma/seed.ts` and `/api/auth/register`. The `/api/credentials` endpoint retrieves plaintext passwords from a hardcoded list in the seed script, **not** from the database. Do not enable it in production.

### Gmail Address Handling

Per project requirements, the codebase includes logic to block Gmail addresses in registration (encourage institutional emails). Override with `PLATFORM_OWNER_EMAILS` env var.

### JWT Secret

The default `JWT_SECRET` is `pracpedia_default_secret_change_me_2026`. **Change it in production** via the env var.

### SQL Injection

All database access goes through Prisma's parameterized queries — no raw SQL is used. Safe from injection by default.

### XSS

React escapes all interpolated values by default. The `FormattedMarkdown` component uses `react-markdown` with `rehype-katex` — both sanitize HTML by default. Do not pass untrusted HTML to `dangerouslySetInnerHTML`.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes following the existing patterns (TypeScript strict, shadcn/ui, Tailwind utility classes)
4. Test locally: `bun run dev`
5. Run lint: `bun run lint`
6. Submit a PR

### Code Style

- TypeScript strict mode
- Functional components with explicit `React.FC<Props>` typing
- Named exports preferred (default exports only for pages)
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays

---

## License

MIT — see `LICENSE` file (create one if you need formal licensing).
