# Sportograf TL Tool

Internal operational web app for **Sportograf Team Leaders** — one place for events, photographers, courses, tactics, files and position planning. Replaces scattered WhatsApp threads, spreadsheets and ad-hoc documents.

**One event. One source of truth.**

## What's inside

### For the Team Leader
- **Dashboard** — upcoming vs. past events at a glance
- **Events** — create, edit, filter, and archive events with lifecycle statuses (Planning → Ready → Live → Completed → Archived)
- **Event workspace** — nine focused tabs:
  - **Overview** — key facts, readiness signals, share-link management
  - **Info** — venue (entrance/parking/access/accreditation/meeting point), hotel (booking refs, rooms), transportation legs, contacts
  - **Schedule** — day-grouped timeline
  - **Team** — photographer roster with acronym, contact, vehicle
  - **Tactics & Docs** — Markdown documents (tactics, guides, notes) + add-from-Bookshelf
  - **Course & Positions** — GPX upload, interactive Leaflet map, position editor with automatic course-distance analysis (loop-aware: one spot = multiple race distances), paste Google Maps links to extract coordinates, generate/copy/share the position list
  - **Files** — uploads with inline PDF viewer and image lightbox
  - **Checklist** — grouped checklists with progress
  - **Settings** — general settings, share link rotation, danger zone
- **Bookshelf** — reusable templates (tactics/guides/checklists) with search, duplicate, archive — snapshot them into any event
- **Photographers** — aggregated roster across all events
- **Files** — every upload across events & bookshelf
- **Search** — global search across events, positions, templates, files

### For the Photographer
- **Shareable event link** (`/e/[slug]`) — no login needed, mobile-first, collapsible sections, quick-nav chips, click-to-call contacts, "Open in Maps" navigation buttons, embedded PDFs and images

## Tech stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4**
- **MongoDB** via Mongoose
- **Auth.js (NextAuth)** credentials provider, JWT sessions, `proxy.ts` route protection
- **Vercel Blob** for file storage (falls back to `public/uploads` in local dev)
- **Leaflet** for course maps (dynamically imported, client-only)
- **fast-xml-parser** for GPX, **zod** for API validation, **bcryptjs** for passwords

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
#    set MONGODB_URI and AUTH_SECRET  (npx auth secret generates one)

# 3. Seed demo data (creates users, event, course, files, templates)
npx tsx scripts/seed.ts

# 4. Run
npm run dev
```

**Demo logins** (after seeding):

| Email | Acronym | Password |
|---|---|---|
| `akt@sportograf.com` | AKT | `demo1234` |
| `gip@sportograf.com` | GIP | `demo1234` |

Photographer demo link: `http://localhost:3000/e/sh4ng2026`

## Deployment (Vercel)

1. Push to GitHub, import into Vercel.
2. Add env vars: `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`, `BLOB_READ_WRITE_TOKEN` (create a Blob store in the Vercel dashboard).
3. Deploy — no build-time config needed.

Without `BLOB_READ_WRITE_TOKEN` uploads still work locally via `public/uploads` (dev fallback only — serverless filesystems are ephemeral).

## Project structure

```
src/
  app/
    (app)/            # authenticated shell: dashboard, events, bookshelf, …
    (auth)/           # login / register
    e/[slug]/         # public photographer page (no auth)
    api/              # events, files, templates, search, parse-location, me
  components/
    workspace/        # event tab modules
    ui.tsx            # shared primitives
  lib/
    models.ts         # Mongoose schemas (User, Event, Template, FileDoc)
    geo.ts            # position→course analysis (loop-aware distances)
    gpx.ts            # GPX parsing
    coords.ts         # Google-Maps-URL coordinate extraction
    storage.ts        # Vercel Blob / local fallback
    design.ts         # centralized design tokens (sports, statuses, categories)
scripts/seed.ts       # demo data
```

## Notes

- Design tokens live in `src/lib/design.ts` and `globals.css` — no hardcoded brand colors elsewhere.
- Share links are random slugs; rotating or revoking is one click in the event **Overview/Settings** tab.
- The workspace PATCH endpoint is whitelist-based — only mutable fields are updatable.
