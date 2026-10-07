# Sportograf TL Tool — Architecture Documentation

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Team Leader  │  │ Photographer │  │   Mobile     │     │
│  │   Desktop    │  │   Desktop    │  │    Phone     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (Vercel)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              App Router (React Server)               │  │
│  │  • (app)/ — Authenticated routes                     │  │
│  │  • (auth)/ — Login/Register                          │  │
│  │  • e/[slug]/ — Public event view                     │  │
│  │  • api/ — REST API endpoints                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Middleware Layer                     │  │
│  │  • Auth.js (NextAuth) — Session management           │  │
│  │  • proxy.ts — Route protection                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA & STORAGE LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MongoDB    │  │ Vercel Blob  │  │  Leaflet CDN │     │
│  │   (Atlas)    │  │  (Storage)   │  │   (Maps)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
windsurf-project/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # Authenticated shell
│   │   │   ├── layout.tsx            # AppShell with navigation
│   │   │   ├── dashboard/            # Team Leader dashboard
│   │   │   ├── events/               # Event management
│   │   │   │   ├── new/              # Create event
│   │   │   │   └── [id]/             # Event workspace (9 tabs)
│   │   │   ├── bookshelf/            # Templates library
│   │   │   ├── photographers/        # Photographer roster
│   │   │   ├── files/                # All files view
│   │   │   ├── search/               # Global search
│   │   │   └── settings/             # User settings
│   │   ├── (auth)/                   # Public auth routes
│   │   │   ├── login/                # Login page
│   │   │   └── register/             # Registration
│   │   ├── e/[slug]/                 # Public event view (no auth)
│   │   ├── api/                      # REST API routes
│   │   │   ├── auth/[...nextauth]/   # Auth.js handler
│   │   │   ├── events/               # Event CRUD
│   │   │   ├── files/                # File upload/delete
│   │   │   ├── templates/            # Bookshelf CRUD
│   │   │   ├── search/               # Global search
│   │   │   ├── parse-location/       # Google Maps parser
│   │   │   ├── register/             # User registration
│   │   │   └── me/                   # Current user
│   │   ├── globals.css               # Global styles + design tokens
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Redirect to dashboard
│   ├── components/
│   │   ├── workspace/                # Event workspace tabs
│   │   │   ├── OverviewTab.tsx       # Event summary
│   │   │   ├── InfoTab.tsx           # Venue/hotel/transport
│   │   │   ├── ScheduleTab.tsx       # Timeline
│   │   │   ├── TeamTab.tsx           # Photographers
│   │   │   ├── TacticsTab.tsx        # Documents
│   │   │   ├── CourseTab.tsx         # Map + positions
│   │   │   ├── FilesTab.tsx          # File management
│   │   │   ├── ChecklistTab.tsx      # Checklists
│   │   │   └── SettingsTab.tsx       # Event settings
│   │   ├── AppShell.tsx              # Main navigation shell
│   │   ├── BookshelfClient.tsx       # Bookshelf UI
│   │   ├── CourseMap.tsx             # Leaflet map component
│   │   ├── EventsFilter.tsx          # Event filtering
│   │   ├── FileViewers.tsx           # PDF/image viewers
│   │   ├── Markdown.tsx              # Markdown renderer
│   │   ├── NewEventForm.tsx          # Event creation form
│   │   ├── PublicEvent.tsx           # Photographer view
│   │   ├── SearchClient.tsx          # Search UI
│   │   ├── SettingsClient.tsx        # Settings UI
│   │   └── ui.tsx                    # Shared UI primitives
│   ├── lib/
│   │   ├── models.ts                 # Mongoose schemas
│   │   ├── db.ts                     # MongoDB connection
│   │   ├── geo.ts                    # Position analysis
│   │   ├── gpx.ts                    # GPX parsing
│   │   ├── coords.ts                 # Google Maps parser
│   │   ├── storage.ts                # Vercel Blob wrapper
│   │   ├── design.ts                 # Design tokens
│   │   ├── serialize.ts              # MongoDB → JSON
│   │   └── utils.ts                  # Utilities
│   ├── auth.config.ts                # Auth.js config
│   ├── auth.ts                       # Auth.js setup
│   ├── proxy.ts                      # Route protection
│   └── types.ts                      # Shared TypeScript types
├── scripts/
│   └── seed.ts                       # Demo data generator
├── public/
│   └── uploads/                      # Local dev file storage
├── .env.example                      # Environment template
├── .env.local                        # Local environment (gitignored)
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind config
├── next.config.ts                    # Next.js config
└── README.md                         # Documentation
```

---

## 🗄️ Database Schema

### MongoDB Collections

#### **users**
```typescript
{
  _id: ObjectId,
  name: string,              // "Mo Tran"
  acronym: string,           // "AKT" (unique, uppercase)
  email: string,             // "akt@sportograf.com" (unique)
  passwordHash: string,      // bcrypt hash
  image: string,             // Profile image URL
  role: string,              // "team_leader"
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `acronym` (unique)
- `email` (unique)

---

#### **events**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId,         // ref: User
  ownerAcronym: string,      // "AKT"
  name: string,              // "IRONMAN 70.3 Shanghai 2026"
  type: string,              // "IRONMAN 70.3"
  date: string,              // "2026-10-18" (YYYY-MM-DD)
  endDate: string,           // "2026-10-18"
  location: string,          // "Shanghai"
  country: string,           // "China"
  organizer: string,         // "IRONMAN Asia"
  website: string,           // "https://www.ironman.com"
  status: EventStatus,       // "planning" | "ready" | "live" | "completed" | "archived"
  shareSlug: string,         // "sh4ng2026" (unique, nullable)
  
  // Embedded documents (Schema.Types.Mixed)
  venue: VenueInfo,          // { name, address, mapLink, entrance, ... }
  hotel: HotelInfo,          // { name, address, checkIn, checkOut, ... }
  transport: Transport[],    // [{ kind, date, time, pickup, ... }]
  schedule: ScheduleItem[],  // [{ day, time, title, detail }]
  contacts: Contact[],       // [{ role, name, phone, email }]
  photographers: Photographer[], // [{ acronym, name, phone, ... }]
  positions: Position[],     // [{ id, photographer, sport, distances, ... }]
  preSpots: PreSpot[],       // [{ name, lat, lng }]
  tactic: TacticRow[],       // [{ spot, photographer, lens, ... }]
  hyrox: HyroxDayPlan[],     // HYROX-specific tactic
  course: Course,            // { legs: [{ name, sport, points, ... }] }
  documents: EventDoc[],     // [{ title, category, body }]
  checklist: ChecklistGroup[], // [{ title, items: [{ text, done }] }]
  notes: string,             // General notes (markdown)
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `ownerId`
- `status`
- `date` (descending)
- `shareSlug` (unique, sparse)
- Text index: `name`, `location`, `type`, `ownerAcronym`

**Design Decision**: Embedded documents (not references) for event sub-content because:
- Events are self-contained units
- No need to query photographers/positions independently
- Simpler PATCH operations
- Better performance (single query)

---

#### **templates**
```typescript
{
  _id: ObjectId,
  ownerId: ObjectId,         // ref: User
  title: string,             // "IRONMAN Bike Position Guide"
  category: DocCategory,     // "tactic" | "guide" | "checklist" | "note" | "strategy" | "other"
  tags: string[],            // ["ironman", "bike"]
  body: string,              // Markdown content
  archived: boolean,         // false
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `ownerId`
- `category`
- `archived`
- Text index: `title`, `body`, `tags`

---

#### **filedocs**
```typescript
{
  _id: ObjectId,
  eventId: ObjectId,         // ref: Event (optional)
  templateId: ObjectId,      // ref: Template (optional)
  ownerId: ObjectId,         // ref: User
  url: string,               // Vercel Blob URL or /uploads/...
  filename: string,          // "Shanghai_70.3_course.gpx"
  mime: string,              // "application/gpx+xml"
  size: number,              // bytes
  category: FileCategory,    // "map" | "briefing" | "venue" | "hotel" | "other"
  description: string,       // "Official course file"
  hidden: boolean,           // false
  uploadedBy: string,        // "AKT"
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `eventId`
- `templateId`
- `ownerId`
- Text index: `filename`, `description`

**Design Decision**: File metadata in MongoDB, binary in Vercel Blob/local storage:
- MongoDB documents limited to 16MB
- Blob storage optimized for large files
- Easier to migrate storage providers
- Better CDN integration

---

## 🔐 Authentication Flow

### Registration
```
User → /register
  ↓
POST /api/register
  ↓
Validate input (Zod)
  ↓
Hash password (bcryptjs, 10 rounds)
  ↓
Create User in MongoDB
  ↓
Auto-login via Auth.js
  ↓
Redirect to /dashboard
```

### Login
```
User → /login
  ↓
POST /api/auth/callback/credentials
  ↓
Auth.js authorize() function
  ↓
Find user by email
  ↓
Compare password (bcrypt.compare)
  ↓
Return user object
  ↓
Auth.js creates JWT session
  ↓
Set session cookie
  ↓
Redirect to /dashboard
```

### Session Management
```
Request to protected route
  ↓
auth() helper (from @/auth)
  ↓
Verify JWT token
  ↓
Return session { user: { id, name, email, acronym } }
  ↓
If no session → redirect to /login (via proxy.ts)
```

### Route Protection
```typescript
// src/proxy.ts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  // ... continue
}
```

---

## 🗺️ Course & Position System

### GPX Parsing Flow
```
User uploads GPX file
  ↓
POST /api/files/upload
  ↓
Store file in Vercel Blob
  ↓
parseGpx(xml, filename) — lib/gpx.ts
  ↓
Extract <trk> elements
  ↓
For each track:
  - Detect sport from name (swim/bike/run)
  - Extract <trkpt> coordinates
  - Calculate cumulative distance
  - Create CourseLeg
  ↓
Return Course { legs: [...] }
  ↓
PATCH /api/events/[id] { course }
  ↓
Save to event.course
```

### Position Analysis Algorithm
```typescript
// lib/geo.ts
function analyzePosition(legs, lat, lng, maxDistanceM) {
  const candidates = [];
  
  for (leg of legs) {
    for (point of leg.points) {
      const distM = haversineDistance(lat, lng, point.lat, point.lng);
      
      if (distM < maxDistanceM) {
        candidates.push({
          legIndex,
          legName: leg.name,
          sport: leg.sport,
          km: point.d,  // distance along course
          distToCourseM: distM
        });
      }
    }
  }
  
  // Sort by distance to course
  candidates.sort((a, b) => a.distToCourseM - b.distToCourseM);
  
  return {
    nearestKm: candidates[0].km,
    nearestLeg: candidates[0].legIndex,
    distToCourseM: candidates[0].distToCourseM,
    candidates  // All matches (for loop detection)
  };
}
```

**Loop Detection**: If a GPS point is near the course at multiple distances (e.g., 2.5 km and 7.2 km), all candidates are returned. Team Leader selects which distances apply.

### Google Maps Coordinate Extraction
```typescript
// lib/coords.ts
function parseGoogleMapsUrl(url) {
  // Pattern 1: ?query=lat,lng
  if (match = url.match(/[?&]query=([0-9.-]+),([0-9.-]+)/)) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  // Pattern 2: ?q=lat,lng
  if (match = url.match(/[?&]q=([0-9.-]+),([0-9.-]+)/)) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  // Pattern 3: @lat,lng,zoom
  if (match = url.match(/@([0-9.-]+),([0-9.-]+),/)) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  return null;
}
```

Supports multiple Google Maps URL formats from WhatsApp.

---

## 📤 File Upload System

### Upload Flow
```
User selects file
  ↓
Client: FormData with file
  ↓
POST /api/files/upload
  ↓
Validate file type & size
  ↓
storeFile(file) — lib/storage.ts
  ↓
If BLOB_READ_WRITE_TOKEN exists:
  → Upload to Vercel Blob
  → Return { url: blob URL, size }
Else (local dev):
  → Save to public/uploads/
  → Return { url: /uploads/..., size }
  ↓
Create FileDoc in MongoDB
  ↓
Return file metadata
  ↓
Client: Display file in UI
```

### File Viewing
```
User clicks PDF file
  ↓
<PdfViewer url={file.url} />
  ↓
Load PDF.js (or browser native)
  ↓
Render PDF in iframe/canvas
  ↓
Controls: zoom, page nav, fullscreen
```

```
User clicks image
  ↓
<ImageLightbox url={file.url} />
  ↓
Display in modal overlay
  ↓
Controls: zoom, fullscreen, download
```

---

## 🔄 Event Sharing System

### Share Link Generation
```
Team Leader clicks "Generate Share Link"
  ↓
POST /api/events/[id]/share
  ↓
Generate random slug (8 chars, alphanumeric)
  ↓
Check uniqueness in MongoDB
  ↓
Update event.shareSlug
  ↓
Return slug
  ↓
Client: Display /e/[slug] link
```

### Public Event Access
```
Photographer opens /e/[slug]
  ↓
GET /e/[slug]
  ↓
Find event by shareSlug (no auth required)
  ↓
If not found → 404
  ↓
Fetch event + files
  ↓
Render <PublicEvent /> component
  ↓
Mobile-optimized view
```

**Security**: Share links are read-only. No mutations allowed. Can be rotated if leaked.

---

## 🎨 Design System

### Color Tokens (`lib/design.ts`)
```typescript
export const SPORT_META = {
  swim: { label: "Swim", color: "bg-cyan-500", ... },
  bike: { label: "Bike", color: "bg-blue-500", ... },
  run: { label: "Run", color: "bg-green-500", ... },
  other: { label: "Other", color: "bg-slate-500", ... }
};

export const STATUS_META = {
  planning: { label: "Planning", badge: "bg-slate-100", ... },
  ready: { label: "Ready", badge: "bg-blue-100", ... },
  live: { label: "Live", badge: "bg-red-100", ... },
  completed: { label: "Completed", badge: "bg-green-100", ... },
  archived: { label: "Archived", badge: "bg-slate-100", ... }
};
```

**Centralized design tokens** prevent hardcoded colors throughout the codebase.

### Tailwind CSS v4
```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-brand-blue: #2563eb;
  --color-brand-red: #dc2626;
}
```

---

## 🚀 Performance Optimizations

### Server-Side Rendering (SSR)
- Dashboard, event workspace, public event pages use SSR
- Data fetched on server → faster initial load
- SEO-friendly (for public event pages)

### Dynamic Imports
```typescript
// CourseMap.tsx
const LeafletMap = dynamic(() => import('./LeafletMapClient'), {
  ssr: false,  // Leaflet requires window object
  loading: () => <div>Loading map...</div>
});
```

### MongoDB Indexes
- Text indexes for search (events, templates, files)
- Compound indexes for common queries
- Sparse indexes for optional fields (shareSlug)

### Image Optimization
```typescript
import Image from 'next/image';

<Image src={file.url} alt={file.filename} width={800} height={600} />
```
Next.js automatically optimizes images.

### Pagination
```typescript
// Future: Add pagination for large event lists
const events = await Event.find({ ownerId })
  .limit(20)
  .skip(page * 20)
  .sort({ date: -1 });
```

---

## 🔒 Security Measures

### Input Validation (Zod)
```typescript
import { z } from 'zod';

const eventSchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // ...
});

const data = eventSchema.parse(req.body);
```

### Authorization Checks
```typescript
// Every mutation checks ownership
const event = await Event.findById(id);
if (event.ownerId.toString() !== session.user.id) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Password Hashing
```typescript
import bcrypt from 'bcryptjs';

const passwordHash = await bcrypt.hash(password, 10);  // 10 rounds
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### CSRF Protection
Auth.js handles CSRF tokens automatically.

### Environment Variables
```bash
# Never commit .env.local
# All secrets in environment variables
MONGODB_URI=...
AUTH_SECRET=...
BLOB_READ_WRITE_TOKEN=...
```

---

## 📊 Data Flow Examples

### Example 1: Create Event
```
User fills form → Submit
  ↓
POST /api/events { name, date, location, ... }
  ↓
Validate with Zod
  ↓
Create Event in MongoDB
  ↓
Return event DTO
  ↓
Redirect to /events/[id]
  ↓
Fetch event + render workspace
```

### Example 2: Add Position
```
User clicks map → Select coordinates
  ↓
analyzePosition(course, lat, lng)
  ↓
Get suggested distances
  ↓
User confirms → Save
  ↓
PATCH /api/events/[id] { positions: [...] }
  ↓
Update event.positions array
  ↓
Re-render map with new marker
```

### Example 3: Share Event
```
Team Leader clicks "Generate Share Link"
  ↓
POST /api/events/[id]/share
  ↓
Generate random slug
  ↓
Update event.shareSlug
  ↓
Return /e/[slug] URL
  ↓
Team Leader copies link
  ↓
Sends via WhatsApp
  ↓
Photographer opens link
  ↓
GET /e/[slug] (no auth)
  ↓
Render public event view
```

---

## 🧪 Testing Strategy

### Unit Tests (Future)
```typescript
// lib/geo.test.ts
test('analyzePosition detects loop courses', () => {
  const course = { legs: [bikeLeg] };
  const result = analyzePosition(course.legs, 31.222, 121.545, 20);
  expect(result.candidates.length).toBeGreaterThan(1);
});
```

### Integration Tests (Future)
```typescript
// api/events.test.ts
test('POST /api/events creates event', async () => {
  const res = await fetch('/api/events', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Event', ... })
  });
  expect(res.status).toBe(200);
});
```

### E2E Tests (Future)
```typescript
// playwright/event-workflow.spec.ts
test('Team Leader creates and shares event', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type=email]', 'akt@sportograf.com');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  // ... continue workflow
});
```

---

## 🔮 Future Architecture Considerations

### Scalability
- **Horizontal scaling**: Vercel serverless functions auto-scale
- **Database sharding**: MongoDB Atlas supports sharding if needed
- **CDN**: Vercel Edge Network for global distribution
- **Caching**: Redis for session/query caching

### Real-Time Features
- **WebSockets**: For live GPS tracking
- **Pusher/Ably**: For real-time position updates
- **Server-Sent Events**: For event-day notifications

### Microservices (if needed)
- **GPX processing service**: Heavy GPX parsing offloaded
- **Image processing service**: Thumbnail generation, optimization
- **Notification service**: Email/SMS/WhatsApp integration

### Multi-Tenancy
- **Organization model**: Group Team Leaders by organization
- **Shared events**: Multiple Team Leaders collaborate
- **Role-based access**: Admin, Team Leader, Photographer roles

---

## 📈 Monitoring & Observability

### Vercel Analytics
- Page views, unique visitors
- Performance metrics (TTFB, FCP, LCP)
- Error tracking

### MongoDB Atlas Monitoring
- Query performance
- Index usage
- Storage metrics
- Connection pool

### Custom Logging
```typescript
// lib/logger.ts
export function logEvent(action: string, data: any) {
  console.log(JSON.stringify({ action, data, timestamp: new Date() }));
}
```

---

## 🎯 Key Design Decisions

1. **Embedded documents in events** → Simpler queries, better performance
2. **Vercel Blob for files** → Scalable, serverless-friendly
3. **Auth.js for authentication** → Industry standard, well-maintained
4. **Leaflet for maps** → Open-source, no API keys needed
5. **MongoDB text indexes** → Fast full-text search
6. **Server-side rendering** → Better performance, SEO
7. **TypeScript throughout** → Type safety, better DX
8. **Tailwind CSS v4** → Modern, performant styling
9. **No ORM (just Mongoose)** → Simpler, more control
10. **Monorepo structure** → All code in one place, easier deployment

---

## 📚 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI components |
| **Framework** | Next.js 16.4 | App Router, SSR, API routes |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Icons** | Lucide React | Modern icon library |
| **Language** | TypeScript 5 | Type safety |
| **Database** | MongoDB (Mongoose) | Document store |
| **Auth** | Auth.js (NextAuth) | Authentication |
| **Storage** | Vercel Blob | File storage |
| **Maps** | Leaflet | Interactive maps |
| **Parsing** | fast-xml-parser | GPX parsing |
| **Validation** | Zod | Schema validation |
| **Crypto** | bcryptjs | Password hashing |
| **Deployment** | Vercel | Serverless hosting |

---

**Architecture designed for**: Simplicity, scalability, developer experience, and operational efficiency.
