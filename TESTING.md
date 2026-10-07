# Sportograf TL Tool — Testing Checklist

## ✅ Complete Feature Testing Guide

### 🔐 Authentication & User Management

- [ ] **Login**
  - [ ] Login with `akt@sportograf.com` / `demo1234`
  - [ ] Login with `gip@sportograf.com` / `demo1234`
  - [ ] Try invalid credentials → See error message
  - [ ] Logout → Redirected to login page

- [ ] **Registration**
  - [ ] Register new Team Leader account
  - [ ] Verify acronym is uppercase
  - [ ] Verify email validation
  - [ ] Verify password requirements
  - [ ] Login with new account

- [ ] **Session Management**
  - [ ] Refresh page → Stay logged in
  - [ ] Access protected route without login → Redirect to login
  - [ ] Session persists across browser tabs

---

### 📊 Dashboard

- [ ] **Dashboard View**
  - [ ] See welcome message with name and acronym
  - [ ] See "IRONMAN 70.3 Shanghai 2026" event card
  - [ ] Event card shows status badge (READY)
  - [ ] Event card shows date (Oct 18, 2026)
  - [ ] Event card shows location (Shanghai, China)
  - [ ] Click event card → Navigate to event workspace

- [ ] **Create Event Button**
  - [ ] Click "+ Create Event" → Navigate to new event form
  - [ ] See empty state if no events exist

---

### 🎯 Event Management

- [ ] **Create New Event**
  - [ ] Fill in event name, type, date, location
  - [ ] Submit → Event created
  - [ ] Redirected to event workspace

- [ ] **Event Workspace - Overview Tab**
  - [ ] See event summary (name, date, location, status)
  - [ ] See share link section
  - [ ] Click "Generate Share Link" → Slug created
  - [ ] Click "Copy Link" → Link copied to clipboard
  - [ ] Click "Rotate Link" → New slug generated
  - [ ] See readiness indicators

- [ ] **Event Workspace - Info Tab**
  - [ ] **Venue Section**
    - [ ] Edit venue name, address
    - [ ] Add Google Maps link
    - [ ] Add entrance, parking, access info
    - [ ] Add accreditation instructions
    - [ ] Add meeting point
    - [ ] Add notes
    - [ ] Save → Changes persist
  - [ ] **Hotel Section**
    - [ ] Edit hotel name, address
    - [ ] Add check-in/out dates
    - [ ] Add booking reference
    - [ ] Add room assignments
    - [ ] Add breakfast info
    - [ ] Add parking info
    - [ ] Save → Changes persist
  - [ ] **Transportation Section**
    - [ ] Add new transport
    - [ ] Select type (airport-hotel, hotel-venue, etc.)
    - [ ] Add date, time, pickup, destination
    - [ ] Add driver, vehicle info
    - [ ] Add Google Maps link
    - [ ] Delete transport
    - [ ] Reorder transports
  - [ ] **Contacts Section**
    - [ ] Add new contact
    - [ ] Add role, name, phone, email
    - [ ] Click phone → Opens dialer (mobile)
    - [ ] Click email → Opens email client
    - [ ] Delete contact

- [ ] **Event Workspace - Schedule Tab**
  - [ ] See existing schedule items
  - [ ] Add new schedule item
  - [ ] Edit day, time, title, detail
  - [ ] Delete schedule item
  - [ ] Items grouped by day

- [ ] **Event Workspace - Team Tab**
  - [ ] See photographer roster (AKT, GIP, MAT, JOE)
  - [ ] Add new photographer
  - [ ] Edit photographer details (acronym, name, phone, email, role, vehicle)
  - [ ] Delete photographer
  - [ ] See photographer count

- [ ] **Event Workspace - Tactics & Docs Tab**
  - [ ] See existing documents (Race Day Tactic, Equipment Notes)
  - [ ] Click document → Expand/collapse
  - [ ] See markdown rendering
  - [ ] Add new document
  - [ ] Edit document title, category, body
  - [ ] Delete document
  - [ ] Click "Add from Bookshelf"
  - [ ] Select template → Copied to event
  - [ ] See source template reference

- [ ] **Event Workspace - Course & Positions Tab**
  - [ ] **Map View**
    - [ ] See interactive Leaflet map
    - [ ] See GPX route (bike loop + run)
    - [ ] See 5 position markers (AKT_01, GIP_01, MAT_01, JOE_01, JOE_02)
    - [ ] Markers color-coded by sport (bike = blue, run = green)
    - [ ] Click marker → See position details
    - [ ] Zoom in/out
    - [ ] Pan map
  - [ ] **Position List**
    - [ ] See formatted position list
    - [ ] Each position shows: ID, sport, distances
    - [ ] Click "Copy Position List" → Copied to clipboard
    - [ ] Click Google Maps icon → Opens in new tab
    - [ ] Click Edit → Edit position
    - [ ] Click Delete → Remove position
  - [ ] **Add Position**
    - [ ] Click "Add Position"
    - [ ] Select photographer
    - [ ] Select sport
    - [ ] Enter coordinates or click map
    - [ ] System suggests course distances
    - [ ] Add multiple distances for loops
    - [ ] Save → Position added to map
  - [ ] **Paste Locations**
    - [ ] Click "Paste Locations"
    - [ ] Paste Google Maps links:
      ```
      AKT https://www.google.com/maps/search/?api=1&query=31.222,121.545
      GIP https://maps.google.com/?q=31.230,121.473
      ```
    - [ ] System extracts coordinates
    - [ ] See parsed results
    - [ ] Import to positions
  - [ ] **Upload GPX**
    - [ ] Click "Upload GPX"
    - [ ] Select GPX file
    - [ ] Course parsed and displayed on map
    - [ ] See course legs (Bike, Run)
    - [ ] See total distance

- [ ] **Event Workspace - Files Tab**
  - [ ] See existing files (Shanghai_70.3_course.gpx, Race_Briefing.pdf)
  - [ ] **Upload File**
    - [ ] Click "Upload File"
    - [ ] Select PDF → Upload successful
    - [ ] Select image (JPG/PNG) → Upload successful
    - [ ] Select GPX → Upload successful
    - [ ] See file in list
  - [ ] **PDF Viewer**
    - [ ] Click PDF file → Opens embedded viewer
    - [ ] Zoom in/out
    - [ ] Navigate pages (if multi-page)
    - [ ] Fullscreen mode
    - [ ] Download PDF
  - [ ] **Image Viewer**
    - [ ] Click image → Opens lightbox
    - [ ] Zoom in/out
    - [ ] Fullscreen mode
    - [ ] Next/previous (if multiple images)
    - [ ] Download image
  - [ ] **File Management**
    - [ ] Edit file description
    - [ ] Change file category
    - [ ] Delete file
    - [ ] See file size, upload date, uploader

- [ ] **Event Workspace - Checklist Tab**
  - [ ] See checklist groups (PRE-EVENT)
  - [ ] See checklist items
  - [ ] Check/uncheck items
  - [ ] See progress indicator
  - [ ] Add new checklist group
  - [ ] Add new checklist item
  - [ ] Delete checklist item
  - [ ] Reorder items

- [ ] **Event Workspace - Settings Tab**
  - [ ] Edit event status
  - [ ] Edit event type
  - [ ] Edit event dates
  - [ ] See danger zone
  - [ ] Delete event (with confirmation)

---

### 📚 Bookshelf (Templates)

- [ ] **Bookshelf View**
  - [ ] See 4 demo templates
  - [ ] Filter by category (tactic, guide, checklist)
  - [ ] Search templates
  - [ ] See template cards with title, category, tags

- [ ] **Create Template**
  - [ ] Click "New Template"
  - [ ] Enter title, category, tags
  - [ ] Write markdown body
  - [ ] Save → Template created

- [ ] **Edit Template**
  - [ ] Click template → Open editor
  - [ ] Edit title, category, tags, body
  - [ ] Save → Changes persist

- [ ] **Template Actions**
  - [ ] Duplicate template
  - [ ] Archive template
  - [ ] Delete template
  - [ ] Add template to event

- [ ] **Template Files**
  - [ ] Upload file to template
  - [ ] See attached files
  - [ ] Delete file

---

### 👥 Photographers Page

- [ ] **Photographers List**
  - [ ] See all photographers across all events
  - [ ] See photographer details (acronym, name, email, phone)
  - [ ] See which events they're assigned to
  - [ ] Search photographers
  - [ ] Filter by event

---

### 📁 Files Page

- [ ] **Files List**
  - [ ] See all uploaded files
  - [ ] Filter by event
  - [ ] Filter by file type (PDF, image, GPX)
  - [ ] Search files
  - [ ] See file details (name, size, date, uploader)
  - [ ] Click file → Open viewer
  - [ ] Download file

---

### 🔍 Search

- [ ] **Global Search**
  - [ ] Search "IRONMAN" → Find event
  - [ ] Search "bike" → Find positions, templates, documents
  - [ ] Search "Shanghai" → Find event, venue
  - [ ] Search "AKT" → Find photographer, positions
  - [ ] See search results grouped by type
  - [ ] Click result → Navigate to item

---

### 📱 Photographer Public View

- [ ] **Access Event**
  - [ ] Open `/e/sh4ng2026` (no login required)
  - [ ] See event name and date
  - [ ] See all event information

- [ ] **Mobile View**
  - [ ] Resize browser to mobile size
  - [ ] See mobile-optimized layout
  - [ ] See collapsible sections
  - [ ] See quick-nav chips at top

- [ ] **Venue Section**
  - [ ] See venue name, address
  - [ ] Click "Open in Maps" → Opens Google Maps
  - [ ] See entrance, parking, access info
  - [ ] See meeting point

- [ ] **Hotel Section**
  - [ ] See hotel name, address
  - [ ] Click "Open in Maps" → Opens Google Maps
  - [ ] See check-in/out times
  - [ ] See room assignments
  - [ ] See breakfast info

- [ ] **Transportation Section**
  - [ ] See all transport items
  - [ ] See date, time, pickup, destination
  - [ ] See driver, vehicle info

- [ ] **Schedule Section**
  - [ ] See timeline grouped by day
  - [ ] See time, title, detail for each item

- [ ] **Contacts Section**
  - [ ] See all contacts
  - [ ] Click phone number → Opens dialer (mobile)
  - [ ] Click email → Opens email client

- [ ] **Team Section**
  - [ ] See photographer roster
  - [ ] See contact info for each photographer

- [ ] **Tactics Section**
  - [ ] See tactic documents
  - [ ] See markdown rendering
  - [ ] Expand/collapse documents

- [ ] **Positions Section**
  - [ ] See position list
  - [ ] See position IDs, sports, distances
  - [ ] Click Google Maps link → Opens in new tab

- [ ] **Course Map Section**
  - [ ] See interactive map
  - [ ] See GPX route
  - [ ] See position markers
  - [ ] Zoom/pan map

- [ ] **Files Section**
  - [ ] See uploaded files
  - [ ] Click PDF → Opens embedded viewer
  - [ ] Click image → Opens lightbox
  - [ ] Download files

- [ ] **Notes Section**
  - [ ] See event notes
  - [ ] See markdown rendering

---

### 🔧 Advanced Features

- [ ] **Google Maps Coordinate Extraction**
  - [ ] Paste various Google Maps URL formats:
    - [ ] `https://www.google.com/maps/search/?api=1&query=31.222,121.545`
    - [ ] `https://maps.google.com/?q=31.222,121.545`
    - [ ] `https://goo.gl/maps/...` (shortened)
    - [ ] `https://www.google.com/maps/@31.222,121.545,15z`
  - [ ] System extracts lat/lng correctly
  - [ ] Invalid URLs show error

- [ ] **Course Position Analysis**
  - [ ] Add position near GPX route
  - [ ] System calculates nearest course point
  - [ ] System suggests course distance
  - [ ] For loop courses, system detects multiple distances
  - [ ] See confidence indicator

- [ ] **Loop Course Detection**
  - [ ] Upload GPX with loop (bike course)
  - [ ] Add position on loop
  - [ ] System suggests multiple distances (e.g., 2.5 km, 7.2 km)
  - [ ] Select which distances apply

- [ ] **Position List Export**
  - [ ] Generate position list
  - [ ] Copy to clipboard
  - [ ] Paste into text editor
  - [ ] Format is clean and readable:
    ```
    AKT_01 — Bike — 2.5 km / 7.2 km
    GIP_01 — Bike — 11.4 km
    MAT_01 — Run — 3.2 km
    ```

---

### 🎨 Design & UX

- [ ] **Design System**
  - [ ] Sport colors consistent (swim, bike, run, other)
  - [ ] Status badges color-coded (planning, ready, live, completed, archived)
  - [ ] Icons from Lucide React
  - [ ] Tailwind CSS styling

- [ ] **Responsive Design**
  - [ ] Desktop view (1920px+)
  - [ ] Laptop view (1280px)
  - [ ] Tablet view (768px)
  - [ ] Mobile view (375px)
  - [ ] All layouts adapt properly

- [ ] **Loading States**
  - [ ] Buttons show loading spinner
  - [ ] Forms disable during submission
  - [ ] Maps show loading state

- [ ] **Error Handling**
  - [ ] Invalid form inputs show errors
  - [ ] API errors show user-friendly messages
  - [ ] File upload errors handled gracefully
  - [ ] 404 page for invalid routes

---

### 🔒 Security

- [ ] **Authorization**
  - [ ] Team Leader can only see their own events
  - [ ] Team Leader can only edit their own events
  - [ ] Team Leader can only delete their own events
  - [ ] Public event links are read-only
  - [ ] Cannot access other users' Bookshelf

- [ ] **Input Validation**
  - [ ] Email validation on registration
  - [ ] Required fields enforced
  - [ ] File type validation (PDF, images, GPX only)
  - [ ] File size limits enforced
  - [ ] URL validation for Google Maps links

- [ ] **Session Security**
  - [ ] Passwords hashed with bcrypt
  - [ ] JWT tokens secure
  - [ ] Session expires after inactivity
  - [ ] CSRF protection

---

### ⚡ Performance

- [ ] **Page Load Speed**
  - [ ] Dashboard loads < 2 seconds
  - [ ] Event workspace loads < 2 seconds
  - [ ] Public event page loads < 2 seconds
  - [ ] Map loads < 3 seconds

- [ ] **File Upload**
  - [ ] Small files (< 1MB) upload instantly
  - [ ] Large files (5-10MB) show progress
  - [ ] Multiple files can be uploaded

- [ ] **Search Performance**
  - [ ] Search results appear instantly
  - [ ] No lag when typing
  - [ ] Results accurate and relevant

---

### 🌐 Browser Compatibility

- [ ] **Desktop Browsers**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

- [ ] **Mobile Browsers**
  - [ ] iOS Safari
  - [ ] Chrome Mobile (Android)
  - [ ] Samsung Internet

---

### 📦 Deployment

- [ ] **Local Development**
  - [ ] `npm install` works
  - [ ] `npm run dev` starts server
  - [ ] `npm run seed` creates demo data
  - [ ] Hot reload works
  - [ ] Environment variables loaded

- [ ] **Production Build**
  - [ ] `npm run build` succeeds
  - [ ] No TypeScript errors
  - [ ] No ESLint errors
  - [ ] Build size reasonable

- [ ] **Vercel Deployment**
  - [ ] Deploy to Vercel
  - [ ] Environment variables set
  - [ ] MongoDB connection works
  - [ ] File uploads work (Vercel Blob)
  - [ ] Authentication works
  - [ ] All routes accessible

---

## 🎯 Critical User Workflows

### Workflow 1: Team Leader Creates Event
1. Login as AKT
2. Click "Create Event"
3. Fill in event details
4. Add venue, hotel, transportation
5. Add photographers
6. Upload GPX course
7. Add positions
8. Generate share link
9. Copy link
10. Share with team

### Workflow 2: Team Leader Manages Positions
1. Open event
2. Go to Course & Positions tab
3. Click "Paste Locations"
4. Paste Google Maps links from WhatsApp
5. System extracts coordinates
6. Import to positions
7. System analyzes against course
8. Edit positions (add distances, notes)
9. Generate position list
10. Copy to clipboard

### Workflow 3: Photographer Views Event
1. Receive event link via WhatsApp
2. Open link on mobile phone
3. See event overview
4. Check venue location
5. Click "Open in Maps"
6. Check hotel details
7. Check transportation schedule
8. Check position assignment
9. View course map
10. Download PDF briefing

### Workflow 4: Team Leader Uses Bookshelf
1. Go to Bookshelf
2. Create new tactic template
3. Write tactic content
4. Save template
5. Go to event
6. Click "Add from Bookshelf"
7. Select tactic template
8. Template copied to event
9. Edit event-specific details
10. Photographers see tactic in public view

---

## ✅ Testing Summary

**Total Test Cases**: 200+

**Categories**:
- Authentication: 10 tests
- Dashboard: 8 tests
- Event Management: 80+ tests
- Bookshelf: 15 tests
- Photographers: 8 tests
- Files: 12 tests
- Search: 8 tests
- Public View: 40+ tests
- Advanced Features: 15 tests
- Design & UX: 12 tests
- Security: 12 tests
- Performance: 8 tests
- Browser Compatibility: 8 tests
- Deployment: 10 tests

**Priority**:
- 🔴 Critical: Authentication, Event Creation, Position Management, Public View
- 🟡 Important: File Upload, Bookshelf, Search, Mobile UX
- 🟢 Nice-to-have: Advanced Features, Performance Optimization

---

**Testing Tip**: Start with critical workflows first, then move to individual features. Test on both desktop and mobile. Use real data when possible.
