# Sportograf TL Tool — Production Deployment Guide

## 🚀 Deploy to Vercel in 10 Minutes

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- MongoDB Atlas account (free tier works)
- Git installed locally

---

## Step 1: Prepare MongoDB Atlas

### 1.1 Create MongoDB Cluster
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Log in
3. Click "Build a Database"
4. Choose **FREE** tier (M0 Sandbox)
5. Select region closest to your users
6. Click "Create Cluster"
7. Wait 3-5 minutes for cluster creation

### 1.2 Create Database User
1. In Atlas, go to **Database Access**
2. Click "Add New Database User"
3. Choose **Password** authentication
4. Username: `sportograf-admin` (or your choice)
5. **Auto-generate Secure Password** → Copy it!
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### 1.3 Allow Network Access
1. Go to **Network Access**
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - ⚠️ For production, restrict to Vercel IPs later
4. Click "Confirm"

### 1.4 Get Connection String
1. Go to **Database** → Click "Connect"
2. Choose "Connect your application"
3. Driver: **Node.js**, Version: **6.7 or later**
4. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` with your username
6. Replace `<password>` with the password you copied
7. Add database name before `?`:
   ```
   mongodb+srv://sportograf-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sportograf-tl?retryWrites=true&w=majority
   ```
8. **Save this connection string** — you'll need it for Vercel

---

## Step 2: Push to GitHub

### 2.1 Initialize Git (if not already done)
```bash
cd /Users/khanhtran/Desktop/sportograf_tl_tool/CascadeProjects/windsurf-project

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Sportograf TL Tool"
```

### 2.2 Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "+" → "New repository"
3. Repository name: `sportograf-tl-tool`
4. Description: "Internal operational tool for Sportograf Team Leaders"
5. Choose **Private** (recommended for internal tool)
6. **Do NOT** initialize with README (we already have one)
7. Click "Create repository"

### 2.3 Push to GitHub
```bash
# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/sportograf-tl-tool.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project
1. Go to [vercel.com](https://vercel.com)
2. Sign up / Log in (use GitHub account for easy integration)
3. Click "Add New..." → "Project"
4. Import your GitHub repository: `sportograf-tl-tool`
5. Click "Import"

### 3.2 Configure Project
**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `./` (default)
**Build Command**: `next build` (default)
**Output Directory**: `.next` (default)

**Don't click Deploy yet!** → We need to add environment variables first.

### 3.3 Add Environment Variables
Click "Environment Variables" section:

#### Required Variables:

**1. MONGODB_URI**
- Key: `MONGODB_URI`
- Value: Your MongoDB Atlas connection string from Step 1.4
- Example: `mongodb+srv://sportograf-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sportograf-tl?retryWrites=true&w=majority`
- Environment: Production, Preview, Development (all checked)

**2. AUTH_SECRET**
- Key: `AUTH_SECRET`
- Value: Generate a secure random string
  ```bash
  # Run this locally to generate:
  npx auth secret
  # Or use:
  openssl rand -base64 32
  ```
- Copy the generated string
- Environment: Production, Preview, Development (all checked)

**3. AUTH_URL**
- Key: `AUTH_URL`
- Value: Your Vercel app URL (you'll get this after first deploy)
- For now, use: `https://sportograf-tl.vercel.app` (or your custom domain)
- Environment: Production (only)
- ⚠️ Update this after first deploy with your actual Vercel URL

**4. BLOB_READ_WRITE_TOKEN** (for file uploads)
- Key: `BLOB_READ_WRITE_TOKEN`
- Value: We'll create this in Step 3.4
- Environment: Production, Preview, Development (all checked)

### 3.4 Create Vercel Blob Store
1. In Vercel dashboard, go to **Storage** tab
2. Click "Create Database"
3. Choose **Blob**
4. Store Name: `sportograf-files`
5. Click "Create"
6. Go to **Settings** tab of the Blob store
7. Copy the **BLOB_READ_WRITE_TOKEN**
8. Go back to your project → **Settings** → **Environment Variables**
9. Add `BLOB_READ_WRITE_TOKEN` with the copied value

### 3.5 Deploy!
1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. 🎉 Your app is live!

### 3.6 Update AUTH_URL
1. Copy your Vercel app URL (e.g., `https://sportograf-tl-abc123.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Edit `AUTH_URL` → Set to your actual Vercel URL
4. Redeploy (Vercel will auto-redeploy when you change env vars)

---

## Step 4: Seed Production Database

### Option A: Run Seed Script Locally (Recommended)

1. **Temporarily update `.env.local`**:
   ```bash
   # Use your production MongoDB URI
   MONGODB_URI="mongodb+srv://sportograf-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/sportograf-tl?retryWrites=true&w=majority"
   ```

2. **Run seed script**:
   ```bash
   npm run seed
   ```

3. **Verify**:
   - Login: `akt@sportograf.com` / `demo1234`
   - Event link: `https://your-app.vercel.app/e/sh4ng2026`

4. **Restore `.env.local`** to local MongoDB URI

### Option B: Create Seed API Route (Advanced)

Create a protected API route that runs the seed script:

```typescript
// src/app/api/admin/seed/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Run seed logic here
  // ... (copy from scripts/seed.ts)
  
  return NextResponse.json({ success: true });
}
```

Then call it via:
```bash
curl -X POST https://your-app.vercel.app/api/admin/seed \
  -H "Cookie: your-session-cookie"
```

---

## Step 5: Verify Deployment

### 5.1 Test Authentication
1. Visit your Vercel URL
2. Should redirect to `/login`
3. Login with `akt@sportograf.com` / `demo1234`
4. Should see dashboard with demo event

### 5.2 Test File Upload
1. Go to demo event
2. Go to Files tab
3. Upload a PDF or image
4. Should upload to Vercel Blob
5. Should display in viewer

### 5.3 Test Public Event Link
1. Open `/e/sh4ng2026` (no login)
2. Should see event details
3. Should see course map
4. Should see PDF viewer
5. Test on mobile device

### 5.4 Test All Features
- [ ] Create new event
- [ ] Add photographers
- [ ] Upload GPX
- [ ] Add positions
- [ ] Generate share link
- [ ] View as photographer
- [ ] Upload files
- [ ] Create Bookshelf template
- [ ] Search

---

## Step 6: Custom Domain (Optional)

### 6.1 Add Domain to Vercel
1. In Vercel project, go to **Settings** → **Domains**
2. Click "Add"
3. Enter your domain: `tl.sportograf.com`
4. Click "Add"

### 6.2 Configure DNS
Vercel will show you DNS records to add:

**For subdomain (tl.sportograf.com):**
- Type: `CNAME`
- Name: `tl`
- Value: `cname.vercel-dns.com`

**For root domain (sportograf.com):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

Add these records in your domain registrar (GoDaddy, Namecheap, etc.)

### 6.3 Update AUTH_URL
1. Go to **Settings** → **Environment Variables**
2. Edit `AUTH_URL` → Set to `https://tl.sportograf.com`
3. Redeploy

### 6.4 Wait for DNS Propagation
- Usually takes 5-60 minutes
- Vercel will auto-issue SSL certificate
- Your app will be live at your custom domain!

---

## Step 7: Production Checklist

### Security
- [ ] Change demo user passwords
- [ ] Restrict MongoDB IP whitelist to Vercel IPs
- [ ] Enable MongoDB Atlas encryption at rest
- [ ] Set up MongoDB Atlas backups
- [ ] Review Vercel security headers
- [ ] Enable Vercel authentication logs

### Performance
- [ ] Enable Vercel Analytics
- [ ] Set up Vercel Speed Insights
- [ ] Monitor MongoDB Atlas performance
- [ ] Set up MongoDB Atlas alerts
- [ ] Review Vercel function logs

### Monitoring
- [ ] Set up Vercel deployment notifications (Slack/email)
- [ ] Set up MongoDB Atlas alerts (high CPU, storage)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up error tracking (Sentry, LogRocket)

### Backups
- [ ] Enable MongoDB Atlas automated backups
- [ ] Export Vercel Blob files periodically
- [ ] Keep GitHub repository up to date
- [ ] Document recovery procedures

---

## Step 8: Create Production Users

### 8.1 Register Team Leaders
1. Go to `/register`
2. Create accounts for real Team Leaders:
   - Name: Full name
   - Acronym: 3-letter code (e.g., AKT, GIP, MAT)
   - Email: Work email
   - Password: Strong password

### 8.2 Delete Demo Users (Optional)
If you want to remove demo users:

1. Connect to MongoDB Atlas
2. Go to **Collections**
3. Select `users` collection
4. Delete demo users (akt@sportograf.com, gip@sportograf.com)
5. Delete demo event in `events` collection

Or keep them for testing!

---

## Step 9: Ongoing Maintenance

### Deploy Updates
```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push

# Vercel auto-deploys on push to main branch
```

### Rollback Deployment
1. Go to Vercel dashboard
2. Click **Deployments**
3. Find previous working deployment
4. Click "..." → "Promote to Production"

### Monitor Costs
- **Vercel**: Free tier includes 100GB bandwidth/month
- **MongoDB Atlas**: Free tier includes 512MB storage
- **Vercel Blob**: Free tier includes 500GB bandwidth/month

Upgrade if you exceed limits.

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Check `MONGODB_URI` in Vercel env vars
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check MongoDB Atlas user permissions

### "File upload fails"
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check Vercel Blob store exists
- Check file size limits (default: 10MB)

### "Authentication not working"
- Verify `AUTH_SECRET` is set
- Verify `AUTH_URL` matches your Vercel URL
- Check browser cookies are enabled

### "Share link 404"
- Verify event has `shareSlug` in database
- Check URL format: `/e/[slug]` not `/events/[id]`

### "Map not loading"
- Check browser console for errors
- Verify Leaflet CSS is loaded
- Check GPX file is valid

---

## Production URLs

After deployment, you'll have:

- **App**: `https://your-app.vercel.app`
- **Login**: `https://your-app.vercel.app/login`
- **Dashboard**: `https://your-app.vercel.app/dashboard`
- **Public Event**: `https://your-app.vercel.app/e/[slug]`

---

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Atlas Docs**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

## 🎉 Congratulations!

Your Sportograf TL Tool is now live in production!

**Next steps**:
1. Share the app URL with your team
2. Create real events
3. Build your Bookshelf templates
4. Start managing events like a pro!

**One event. One source of truth.** ✨
