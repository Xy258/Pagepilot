# Deployment Guide: Artisan Workshop

## Overview
This guide deploys both frontend and backend:
- **Frontend:** React + Vite → Vercel
- **Backend:** Node.js/Express → Railway (or Render)

---

## Step 1: Prepare Local Code for Production

### 1.1 Build Frontend Locally (Test)
```powershell
cd frontend
npm run build
cd ..
```

### 1.2 Ensure Backend is Production-Ready
The backend is ready. MongoDB Atlas connection is working ✅

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Sign Up / Login to Vercel
1. Go to [https://vercel.com](https://vercel.com)
2. Sign in (or create account) with GitHub/GitLab/Bitbucket

### 2.2 Import Project
1. Click **"New Project"**
2. Select **"Import Git Repository"**
3. Connect your GitHub account
4. Search and select `artisan-workshop` repo
5. Click **"Import"**

### 2.3 Configure Build Settings
Vercel should auto-detect:
- **Build Command:** `cd frontend && npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install --legacy-peer-deps`

If not auto-detected, set manually.

### 2.4 Add Environment Variables
In Vercel Project Settings → **Environment Variables**, add:

```
VITE_API_BASE_URL = https://your-backend.railway.app/api
GEMINI_API_KEY = <set as a server-side secret>
GEMINI_API_KEY_2 = <set as a server-side secret>
GEMINI_API_KEY_3 = <set as a server-side secret>
GEMINI_API_KEY_4 = <set as a server-side secret>
GEMINI_API_KEY_5 = <set as a server-side secret>
GEMINI_API_KEY_6 = <set as a server-side secret>
OPENAI_API_KEY = <set as a server-side secret>
GROQ_API_KEY = <set as a server-side secret>
UNSPLASH_ACCESS_KEY = <set as a server-side secret>
PEXELS_API_KEY = <set as a server-side secret>
VIDEO_AUDIO_API_KEY = <set as a server-side secret>
ELEVENLABS_API_KEY = <set as a server-side secret>
PIXABAY_API_KEY = <set as a server-side secret>
```

> **Important:** Update `VITE_API_BASE_URL` with your Railway backend URL + `/api` (e.g., `https://your-backend.railway.app/api`). This will be set after Step 3.

### 2.5 Deploy
Click **"Deploy"** and wait for completion. Your frontend will be live at:
```
https://your-project.vercel.app
```

---

## Step 3: Deploy Backend to Railway

### 3.1 Sign Up to Railway
1. Go to [https://railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Select your `artisan-workshop` repository

### 3.2 Configure Backend Service
1. Railway will detect multiple services
2. Select **`backend`** folder
3. Click **"Deploy"**

### 3.3 Add Environment Variables
In Railway → Your Project → **Variables**, add:

```
MONGODB_URI = <set your database connection string in the backend environment>
PUBLIC_API_URL = https://your-backend.railway.app
FRONTEND_URL = https://your-project.vercel.app
GEMINI_API_KEY = <set as a server-side secret>
GEMINI_API_KEY_2 = <set as a server-side secret>
GEMINI_API_KEY_3 = <set as a server-side secret>
GEMINI_API_KEY_4 = <set as a server-side secret>
GEMINI_API_KEY_5 = <set as a server-side secret>
GEMINI_API_KEY_6 = <set as a server-side secret>
OPENAI_API_KEY = sk-proj-...
GROQ_API_KEY = <set as a server-side secret>
UNSPLASH_ACCESS_KEY = <set as a server-side secret>
PEXELS_API_KEY = <set as a server-side secret>
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 465
SMTP_USER = pc0050272005@gmail.com
SMTP_PASS = <set through secret environment variables>
FRONTEND_URL = https://your-project.vercel.app
VIDEO_AUDIO_API_KEY = <set as a server-side secret>
ELEVENLABS_API_KEY = <set as a server-side secret>
PIXABAY_API_KEY = <set as a server-side secret>
```

### 3.4 Get Backend URL
After deployment succeeds:
1. Go to **Settings** → **Domains**
2. Copy the public URL (looks like: `https://artisan-workshop-prod-railway.railway.app`)

### 3.5 Update Vercel Environment
1. Go back to Vercel Project Settings → Environment Variables
2. Update `VITE_API_BASE_URL` to: `https://your-railway-url/api`
3. Vercel will automatically redeploy with the new environment variable

---

## Step 4: Update MongoDB IP Whitelist

For production, add Railway's outgoing IPs to MongoDB Atlas:

1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com/)
2. Network Access → Add IP Address
3. Add: `0.0.0.0/0` (or specific Railway IPs if needed)

---

## Step 5: Verification

After all steps complete:
- ✅ Frontend live at: https://your-project.vercel.app
- ✅ Backend live at: https://your-backend.railway.app
- ✅ Database connected: MongoDB Atlas ✓
- ✅ All API calls working

---

## Troubleshooting

### Frontend shows "Cannot GET /"
- Ensure `outputDirectory` is set to `frontend/dist` in vercel.json
- Check build logs in Vercel dashboard

### Backend connection errors
- Verify MONGODB_URI is correct in Railway
- Check MongoDB Atlas IP whitelist
- Test connection: `node testAtlas.mjs`

### CORS errors
- Update backend CORS settings if needed
- Add frontend URL to Railway environment: `FRONTEND_URL`

---

## Redeploy After Changes

**Frontend:**
```powershell
git add .
git commit -m "Update deployment"
git push origin main
# Vercel auto-deploys on push
```

**Backend:**
```powershell
git add .
git commit -m "Update backend"
git push origin main
# Railway auto-deploys on push
```
