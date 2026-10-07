# Sportograf TL Tool — Quick Start Guide

## 🚀 Get Started in 3 Minutes

### 1. Prerequisites
- Node.js 20+ installed
- MongoDB database (MongoDB Atlas free tier works great)

### 2. Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local` and set:

```bash
# Get this from MongoDB Atlas or your local MongoDB
MONGODB_URI="mongodb+srv://user:pass@cluster0.mongodb.net/sportograf-tl"

# Generate with: npx auth secret
AUTH_SECRET="your-generated-secret-here"

# Optional: For Vercel Blob storage (leave empty for local dev)
BLOB_READ_WRITE_TOKEN=""
```

### 3. Seed Demo Data

```bash
npm run seed
```

This creates:
- ✅ 2 demo Team Leader accounts (AKT, GIP)
- ✅ 1 complete event (IRONMAN 70.3 Shanghai 2026)
- ✅ 4 Bookshelf templates
- ✅ GPX course file + PDF briefing
- ✅ 5 photographer positions

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔐 Demo Login

**Team Leader Access:**
- Email: `akt@sportograf.com`
- Password: `demo1234`

**Photographer View (no login):**
- Visit: [http://localhost:3000/e/sh4ng2026](http://localhost:3000/e/sh4ng2026)

## 📱 Test the Full Workflow

### As Team Leader (AKT):

1. **Login** → Dashboard shows "IRONMAN 70.3 Shanghai 2026"
2. **Click event** → See 9 workspace tabs
3. **Overview tab** → Event summary, share link
4. **Info tab** → Venue, hotel, transportation, contacts
5. **Schedule tab** → Race day timeline
6. **Team tab** → 4 photographers (AKT, GIP, MAT, JOE)
7. **Tactics & Docs tab** → Race tactic + equipment notes
8. **Course & Positions tab**:
   - Interactive map with GPX route
   - 5 photographer positions on map
   - Click "Copy Position List" → Get formatted text
   - Try "Paste Locations" → Add Google Maps links
9. **Files tab** → View PDF briefing, download GPX
10. **Checklist tab** → Pre-event checklist with progress
11. **Bookshelf** → 4 reusable templates
12. **Search** → Try searching "bike" or "IRONMAN"

### As Photographer (Mobile):

1. **Open** → [http://localhost:3000/e/sh4ng2026](http://localhost:3000/e/sh4ng2026)
2. **See**:
   - Event overview
   - Venue with "Open in Maps" button
   - Hotel details
   - Transportation schedule
   - Your position assignments
   - Course map
   - PDF briefing (embedded viewer)
   - Contacts with click-to-call
3. **Test mobile** → Resize browser to phone size, everything adapts

## 🎯 Key Features to Try

### Create a New Event
1. Dashboard → "+ New Event"
2. Fill in basic info
3. Add venue, hotel, transportation
4. Add photographers
5. Upload GPX file
6. Generate share link
7. Send link to team

### Use Bookshelf Templates
1. Go to Bookshelf
2. Click "IRONMAN Bike Position Guide"
3. Click "Add to Event"
4. Select your event
5. Template is copied to event documents

### Position Management
1. Open event → Course & Positions tab
2. Click "Paste Locations"
3. Paste Google Maps links like:
   ```
   AKT https://www.google.com/maps/search/?api=1&query=31.222,121.545
   GIP https://maps.google.com/?q=31.230,121.473
   ```
4. System extracts coordinates automatically
5. Click positions on map to edit
6. System suggests course distances (loop-aware!)
7. Copy position list for operational use

### File Management
1. Open event → Files tab
2. Click "Upload File"
3. Upload a PDF or image
4. PDF opens in embedded viewer
5. Images open in lightbox

## 🔧 Development Tips

### Reset Demo Data
```bash
npm run seed
```
Re-runs the seed script (safe to run multiple times)

### Check MongoDB Connection
```bash
npx tsx -e "import('./src/lib/db').then(m => m.connectDB()).then(() => console.log('✓ Connected')).catch(e => console.error('✗', e.message))"
```

### Generate New Auth Secret
```bash
npx auth secret
```

### View Logs
- Next.js logs: Terminal where `npm run dev` is running
- MongoDB queries: Check MongoDB Atlas logs
- Browser console: Open DevTools (F12)

## 📦 Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/sportograf-tl.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repo
4. Add environment variables:
   - `MONGODB_URI` → Your MongoDB connection string
   - `AUTH_SECRET` → Generate with `npx auth secret`
   - `AUTH_URL` → Your Vercel app URL (e.g., `https://sportograf-tl.vercel.app`)
   - `BLOB_READ_WRITE_TOKEN` → Create Blob store in Vercel dashboard, copy token

### 3. Deploy
- Click "Deploy"
- Wait ~2 minutes
- Your app is live! 🎉

### 4. Seed Production Database
```bash
# Set MONGODB_URI to production in .env.local temporarily
npm run seed

# Or run seed script on Vercel via serverless function
```

## 🆘 Troubleshooting

### "MONGODB_URI is not set"
- Make sure `.env.local` exists and has `MONGODB_URI`
- Check for typos in the variable name

### "Port 3000 is in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### "Cannot connect to MongoDB"
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)
- Verify connection string format
- Check username/password in connection string

### "File upload fails"
- In local dev, files go to `public/uploads` (no Blob token needed)
- In production, make sure `BLOB_READ_WRITE_TOKEN` is set
- Check file size limits (default: 10MB)

### "Share link doesn't work"
- Make sure event has a share slug (click "Generate Share Link" in Overview tab)
- Check URL format: `/e/[slug]` not `/events/[id]`

## 📚 Next Steps

1. **Customize branding** → Edit `src/lib/design.ts` for colors
2. **Add your team** → Register Team Leader accounts
3. **Create real events** → Use the demo as a template
4. **Build templates** → Create your own tactics/guides in Bookshelf
5. **Invite photographers** → Share event links via WhatsApp/email
6. **Deploy to production** → Follow Vercel deployment steps above

## 💡 Pro Tips

- **Use acronyms consistently** → They appear throughout the system
- **Upload GPX early** → Enables automatic position analysis
- **Build a Bookshelf** → Reuse tactics across similar events
- **Test mobile view** → Most photographers use phones
- **Copy position lists** → Paste into Sportograf internal system
- **Rotate share links** → If a link leaks, generate a new one

## 🎓 Learn More

- **Full feature list** → See `FEATURES.md`
- **Project structure** → See `README.md`
- **Code documentation** → Check inline comments in `src/`

---

**Need help?** Check the code comments or create an issue on GitHub.

**Ready to build?** Start with `npm run dev` and explore the demo event! 🚀
