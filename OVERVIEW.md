# Sportograf TL Tool — Visual Overview

## 🎯 What Is This?

**Sportograf TL Tool** is an internal operational web application for **Sportograf Team Leaders** to manage events, photographers, courses, positions, tactics, and files.

**Problem Solved**: Replace scattered WhatsApp messages, PDFs, Google Maps links, and screenshots with **one centralized platform**.

**Product Principle**: **"One event. One source of truth."**

---

## 👥 User Roles

### Team Leader (Authenticated)
- **Who**: AKT, GIP, MAT, JOE, HOA (Sportograf Team Leaders)
- **Access**: Login required
- **Can Do**:
  - Create and manage events
  - Add photographers
  - Upload GPX courses
  - Manage positions
  - Upload files
  - Create tactics
  - Share events
  - Build Bookshelf templates

### Photographer (Public)
- **Who**: Event photographers
- **Access**: No login required (shareable link)
- **Can Do**:
  - View event details
  - See venue, hotel, transportation
  - Check position assignments
  - View course map
  - Download files
  - Call contacts

---

## 📱 User Interface Overview

### Team Leader View (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  Sportograf TL Tool                    [AKT] [Search] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dashboard                                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  My Events                                    [+ Create]     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ [READY]      │  │ [PLANNING]   │  │ [LIVE]       │     │
│  │              │  │              │  │              │     │
│  │ IRONMAN 70.3 │  │ HYROX NYC    │  │ Spartan Race │     │
│  │ Shanghai     │  │ 2026         │  │ Dallas       │     │
│  │              │  │              │  │              │     │
│  │ Oct 18, 2026 │  │ May 30, 2026 │  │ Apr 12, 2026 │     │
│  │ Shanghai, CN │  │ New York, US │  │ Dallas, US   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Event Workspace (9 Tabs)

```
┌─────────────────────────────────────────────────────────────┐
│  IRONMAN 70.3 Shanghai 2026                    [Share] [⚙️] │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Info] [Schedule] [Team] [Tactics] [Course]    │
│  [Files] [Checklist] [Settings]                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 VENUE                                                    │
│  Century Park Start/Finish                                   │
│  1001 Jinxiu Rd, Pudong, Shanghai                           │
│  [Open in Maps]                                              │
│                                                              │
│  🏨 HOTEL                                                    │
│  Novotel Shanghai Atlantis                                   │
│  Check-in: Oct 17, 14:00                                     │
│  Rooms: AKT/GIP — 1204 · MAT/JOE — 1206                     │
│  [Open in Maps]                                              │
│                                                              │
│  🚗 TRANSPORTATION                                           │
│  Oct 17, 15:30 — Airport → Hotel                            │
│  Oct 18, 05:00 — Hotel → Venue (DO NOT MISS)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Course & Positions Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Course & Positions                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────┐  ┌──────────────────────────┐  │
│  │                        │  │ Position List             │  │
│  │      [MAP VIEW]        │  │                           │  │
│  │                        │  │ AKT_01 — Bike — 2.5/7.2km│  │
│  │   🔵 Bike Route        │  │ GIP_01 — Bike — 11.4 km  │  │
│  │   🟢 Run Route         │  │ MAT_01 — Run — 3.2 km    │  │
│  │                        │  │ JOE_01 — Run — 7.8 km    │  │
│  │   📍 AKT_01            │  │ JOE_02 — Run — 12.1 km   │  │
│  │   📍 GIP_01            │  │                           │  │
│  │   📍 MAT_01            │  │ [Copy All]                │  │
│  │   📍 JOE_01            │  │                           │  │
│  │   📍 JOE_02            │  │ [Paste Locations]         │  │
│  │                        │  │ [Upload GPX]              │  │
│  └────────────────────────┘  └──────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Photographer View (Mobile)

```
┌─────────────────────┐
│ IRONMAN 70.3        │
│ Shanghai 2026       │
├─────────────────────┤
│                     │
│ [📍] [🏨] [🚗] [📅] │
│ [📸] [🗺] [📄] [☎]  │
│                     │
├─────────────────────┤
│ 📍 VENUE            │
│ ▼                   │
│ Century Park        │
│ Gate 7 entrance     │
│ [Open in Maps] 🗺   │
│                     │
├─────────────────────┤
│ 🏨 HOTEL            │
│ ▼                   │
│ Novotel Atlantis    │
│ Room: 1204          │
│ [Open in Maps] 🗺   │
│                     │
├─────────────────────┤
│ 📸 YOUR POSITION    │
│ ▼                   │
│ GIP_01              │
│ Bike — 11.4 km      │
│ Feed station exit   │
│ [View on Map] 🗺    │
│                     │
├─────────────────────┤
│ ☎ CONTACTS          │
│ ▼                   │
│ AKT (Team Leader)   │
│ [Call] 📞           │
│                     │
└─────────────────────┘
```

---

## 🗺️ Application Flow

### Team Leader Workflow

```
Login
  ↓
Dashboard (See all events)
  ↓
Create Event
  ↓
Add Event Info
  ├─ Venue
  ├─ Hotel
  ├─ Transportation
  ├─ Schedule
  └─ Contacts
  ↓
Add Photographers
  ├─ AKT
  ├─ GIP
  ├─ MAT
  └─ JOE
  ↓
Upload GPX Course
  ↓
Paste Google Maps Links (from WhatsApp)
  ↓
System Extracts Coordinates
  ↓
System Analyzes Positions vs Course
  ↓
Edit Positions (add distances, notes)
  ↓
Generate Position List
  ↓
Copy Position List
  ↓
Generate Share Link (/e/abc123)
  ↓
Send Link to Photographers (WhatsApp)
```

### Photographer Workflow

```
Receive Link via WhatsApp
  ↓
Open Link on Phone (no login)
  ↓
See Event Overview
  ↓
Check Venue Location
  ↓
Click "Open in Maps"
  ↓
Google Maps Opens
  ↓
Check Hotel Details
  ↓
Check Transportation Schedule
  ↓
Check Position Assignment
  ↓
View Course Map
  ↓
Download PDF Briefing
  ↓
Call Team Leader if Needed
```

---

## 🏗️ System Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER                              │
│  (Team Leader Desktop / Photographer Mobile)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      NEXT.JS APP                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Authenticated│  │    Public    │  │     API      │      │
│  │    Routes    │  │    Routes    │  │   Routes     │      │
│  │  (app)/      │  │  e/[slug]/   │  │   api/       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Auth.js (NextAuth)                       │  │
│  │         Session Management + Route Protection        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │ Vercel Blob  │  │  Leaflet     │      │
│  │   (Atlas)    │  │  (Storage)   │  │   (Maps)     │      │
│  │              │  │              │  │              │      │
│  │ • Users      │  │ • PDFs       │  │ • Course     │      │
│  │ • Events     │  │ • Images     │  │   Display    │      │
│  │ • Templates  │  │ • GPX files  │  │ • Position   │      │
│  │ • Files      │  │              │  │   Markers    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model (Simplified)

### User (Team Leader)
```
User
├─ name: "Mo Tran"
├─ acronym: "AKT"
├─ email: "akt@sportograf.com"
├─ passwordHash: "..."
└─ role: "team_leader"
```

### Event
```
Event
├─ name: "IRONMAN 70.3 Shanghai 2026"
├─ date: "2026-10-18"
├─ location: "Shanghai, China"
├─ status: "ready"
├─ shareSlug: "sh4ng2026"
├─ ownerId: → User
│
├─ venue: { name, address, mapLink, entrance, parking, ... }
├─ hotel: { name, address, checkIn, checkOut, rooms, ... }
├─ transport: [{ kind, date, time, pickup, destination, ... }]
├─ schedule: [{ day, time, title, detail }]
├─ contacts: [{ role, name, phone, email }]
│
├─ photographers: [
│   { acronym: "AKT", name: "Mo Tran", phone, email, ... },
│   { acronym: "GIP", name: "Giang Pham", ... }
│ ]
│
├─ positions: [
│   { id: "AKT_01", photographer: "AKT", sport: "bike",
│     distances: [2.5, 7.2], lat, lng, mapLink, notes },
│   { id: "GIP_01", photographer: "GIP", sport: "bike",
│     distances: [11.4], lat, lng, ... }
│ ]
│
├─ course: {
│   legs: [
│     { name: "Bike", sport: "bike", points: [...], distanceKm: 18.2 },
│     { name: "Run", sport: "run", points: [...], distanceKm: 1.9 }
│   ]
│ }
│
├─ documents: [
│   { title: "Race Day Tactic", category: "tactic", body: "..." },
│   { title: "Equipment Notes", category: "note", body: "..." }
│ ]
│
├─ checklist: [
│   { title: "PRE-EVENT", items: [
│     { text: "Confirm venue", done: true },
│     { text: "Upload GPX", done: true },
│     { text: "Send event link", done: false }
│   ]}
│ ]
│
└─ notes: "Race day is hot and humid..."
```

### Template (Bookshelf)
```
Template
├─ title: "IRONMAN Bike Position Guide"
├─ category: "guide"
├─ tags: ["ironman", "bike"]
├─ body: "# IRONMAN Bike Position Guide\n\n..."
└─ ownerId: → User
```

### File
```
File
├─ filename: "Shanghai_70.3_course.gpx"
├─ url: "https://blob.vercel-storage.com/..."
├─ mime: "application/gpx+xml"
├─ size: 45678
├─ category: "map"
├─ eventId: → Event
└─ ownerId: → User
```

---

## 🎨 Design Tokens

### Colors (Sport)
- 🔵 **Swim**: Cyan (`bg-cyan-500`)
- 🔵 **Bike**: Blue (`bg-blue-500`)
- 🟢 **Run**: Green (`bg-green-500`)
- ⚫ **Other**: Slate (`bg-slate-500`)

### Colors (Status)
- ⚪ **Planning**: Slate (`bg-slate-100`)
- 🔵 **Ready**: Blue (`bg-blue-100`)
- 🔴 **Live**: Red (`bg-red-100`)
- 🟢 **Completed**: Green (`bg-green-100`)
- ⚫ **Archived**: Slate (`bg-slate-100`)

### Typography
- **Headings**: Bold, tracking-tight
- **Body**: Regular, readable line-height
- **Labels**: Uppercase, small, tracking-wider
- **Code**: Monospace

### Spacing
- **Tight**: 0.5rem (8px)
- **Normal**: 1rem (16px)
- **Loose**: 1.5rem (24px)
- **Extra**: 2rem (32px)

---

## 🔑 Key Features Explained

### 1. Google Maps Coordinate Extraction
**Problem**: Photographers send Google Maps links via WhatsApp  
**Solution**: Paste links → System extracts lat/lng automatically  
**Example**:
```
Input:  https://www.google.com/maps/search/?api=1&query=31.222,121.545
Output: Latitude: 31.222, Longitude: 121.545
```

### 2. Loop-Aware Position Analysis
**Problem**: On loop courses, one GPS point = multiple race distances  
**Solution**: System detects all occurrences along the course  
**Example**:
```
GPS: 31.222, 121.545
Course: Bike loop (2 laps)
Result: Distances: 2.5 km, 7.2 km (same physical location, 2 laps)
```

### 3. Bookshelf Templates
**Problem**: Team Leaders recreate tactics for similar events  
**Solution**: Create once, reuse everywhere  
**Example**:
```
Create: "IRONMAN Bike Position Guide" template
Use: Add to Shanghai event, Tokyo event, Kona event
Result: Consistent tactics, saved time
```

### 4. Embedded PDF Viewer
**Problem**: Downloading PDFs on mobile is slow  
**Solution**: View PDFs directly in browser  
**Example**:
```
Click: "Race_Briefing.pdf"
Result: PDF opens in embedded viewer with zoom, page nav
```

### 5. No-Login Photographer View
**Problem**: Photographers don't want to create accounts  
**Solution**: Shareable read-only links  
**Example**:
```
Team Leader: Generate link → /e/sh4ng2026
Photographer: Open link → See everything (no login)
```

---

## 📱 Mobile-First Design

### Quick-Nav Chips
```
[📍 Venue] [🏨 Hotel] [🚗 Transport] [📅 Schedule]
[📸 Positions] [🗺 Course] [📄 Files] [☎ Contacts]
```
Tap chip → Jump to section

### Click-to-Call
```
AKT (Team Leader)
+84 901 111 111  [📞 Call]
```
Tap phone → Opens dialer

### Open in Maps
```
Century Park Start/Finish
1001 Jinxiu Rd, Pudong, Shanghai
[🗺 Open in Maps]
```
Tap button → Opens Google Maps app

### Collapsible Sections
```
📍 VENUE ▼
  Century Park...
  [Details expanded]

🏨 HOTEL ▶
  [Details collapsed]
```
Tap header → Expand/collapse

---

## 🚀 Performance Features

### Server-Side Rendering (SSR)
- Dashboard, event workspace, public event pages rendered on server
- Faster initial page load
- Better SEO

### Dynamic Imports
- Leaflet map loaded only when needed
- Reduces initial bundle size
- Faster page loads

### MongoDB Indexes
- Text indexes for search
- Compound indexes for queries
- Fast data retrieval

### Image Optimization
- Next.js Image component
- Automatic resizing, format conversion
- Lazy loading

---

## 🔒 Security Features

### Authentication
- JWT sessions (Auth.js)
- Password hashing (bcryptjs, 10 rounds)
- Secure cookies

### Authorization
- Team Leaders can only modify their own events
- Ownership checks on every mutation
- Public event links are read-only

### Input Validation
- Zod schemas for API requests
- File type validation (PDF, images, GPX only)
- File size limits (10MB default)
- URL validation

### Environment Variables
- No hardcoded secrets
- All sensitive data in `.env.local`
- Never committed to Git

---

## 📦 Tech Stack Summary

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.4 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS v4 |
| **Icons** | Lucide React |
| **Database** | MongoDB (Mongoose) |
| **Auth** | Auth.js (NextAuth) |
| **Storage** | Vercel Blob |
| **Maps** | Leaflet |
| **Parsing** | fast-xml-parser (GPX) |
| **Validation** | Zod |
| **Crypto** | bcryptjs |
| **Deployment** | Vercel |

---

## 📚 Documentation Map

```
Documentation/
├─ README.md ................. Project overview, getting started
├─ QUICKSTART.md ............. 3-minute setup guide
├─ FEATURES.md ............... Complete feature list (40+)
├─ TESTING.md ................ 200+ test cases, workflows
├─ DEPLOYMENT.md ............. Step-by-step Vercel deployment
├─ ARCHITECTURE.md ........... System design, data flow
├─ PROJECT_SUMMARY.md ........ Executive summary
├─ STATUS.md ................. Current status, checklist
└─ OVERVIEW.md ............... This document (visual guide)
```

**Start Here**: `README.md` → `QUICKSTART.md` → Explore the app!

---

## 🎯 One-Minute Pitch

**Sportograf TL Tool** replaces scattered WhatsApp messages, PDFs, and Google Maps links with **one centralized platform**.

**Team Leaders** create events, add photographers, upload GPX courses, paste Google Maps links from WhatsApp, and the system automatically extracts coordinates and analyzes positions against the course.

**Photographers** receive a shareable link, open it on their phone (no login), and see everything: venue, hotel, transportation, positions, course map, files, contacts.

**Result**: No more "Where is the hotel?" questions. Everything in one place. Mobile-optimized. Always up-to-date.

**"One event. One source of truth."** ✨

---

**Ready to explore?** Run `npm run dev` and login with `akt@sportograf.com` / `demo1234`!
