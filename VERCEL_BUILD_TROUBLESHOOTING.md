# Build Error Troubleshooting - Vercel Deployment

## ✅ What I Fixed

1. **Updated `.gitignore`** - Ensures `.env.local` files are properly tracked
2. **Updated `vercel.json`** - Proper build configuration for Vercel
3. **Verified frontend builds locally** - dist/ directory created successfully

---

## 🔴 Common Vercel Build Errors

### Error: "exited with 1"
This generic error means the build command failed. Common causes:

#### 1. **Missing Dependencies**
```bash
npm install --legacy-peer-deps  # In root
cd frontend && npm install --legacy-peer-deps  # In frontend
```

#### 2. **TypeScript/Type Errors**
```bash
cd frontend && npm run lint
npm run build
```

#### 3. **Environment Variables Not Set**
Go to Vercel Dashboard → Project Settings → Environment Variables
Add these:
```
VITE_API_BASE_URL = https://your-backend.railway.app/api
VITE_GEMINI_API_KEY = (your key)
VITE_OPENAI_API_KEY = (your key)
VITE_GROQ_API_KEY = (your key)
VITE_UNSPLASH_ACCESS_KEY = (your key)
VITE_PEXELS_API_KEY = (your key)
VITE_VIDEO_AUDIO_API_KEY = (your key)
VITE_ELEVENLABS_API_KEY = (your key)
VITE_PIXABAY_API_KEY = (your key)
```

#### 4. **Node Version Mismatch**
Set Node version in `vercel.json`:
```json
{
  "nodeVersion": "20.x"
}
```

---

## 🚀 Pre-Deployment Checklist

Before pushing to Vercel:

```bash
# 1. Clean install dependencies
rm -rf node_modules frontend/node_modules
npm install --legacy-peer-deps
cd frontend && npm install --legacy-peer-deps

# 2. Type check
npm run lint

# 3. Build locally
npm run build

# 4. Check build output
ls -la frontend/dist/

# 5. Verify .gitignore is correct
cat .gitignore

# 6. Commit and push
git add .
git commit -m "Fix: Build configuration for Vercel"
git push origin main
```

---

## 📋 Vercel Deployment Steps

### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select `artisan-workshop`

### Step 2: Configure Project
Vercel should auto-detect:
- **Build Command:** `cd frontend && npm run build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install --legacy-peer-deps`

If not, set them in Project Settings.

### Step 3: Add Environment Variables
1. Go to Project Settings → **Environment Variables**
2. Add all the variables listed above
3. **Important:** Set them for "Production" environment

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for build to complete
3. Check Deployment Logs if it fails

---

## 🔍 Debug Deployment Issues

### View Vercel Build Logs
1. Go to Vercel Dashboard → Your Project
2. Click on the failed deployment
3. Scroll down to "Build Logs"
4. Look for error messages

### Common Vercel Log Errors

**"Cannot find module 'react-quill-new'"**
→ Solution: `npm install --legacy-peer-deps`

**"VITE_* environment variable undefined"**
→ Solution: Add in Vercel Environment Variables

**"Cannot GET /"**
→ Solution: Check `outputDirectory` is `frontend/dist`

---

## ✅ Successful Deployment Signs

After Vercel deployment completes:
- ✓ Green checkmark shows deployment succeeded
- ✓ Vercel assigns you a URL (e.g., `https://artisan-workshop.vercel.app`)
- ✓ Visiting the URL shows your app
- ✓ No 404 errors on page refresh

---

## 🐛 Troubleshooting Fails

If still failing, try:

### 1. Check Local Build Works
```bash
cd frontend && npm run build
```

### 2. Clear Vercel Cache
- Go to Project Settings → **Git**
- Click "Disconnect Project"
- Re-connect and deploy

### 3. Check Node Version
In `vercel.json`:
```json
{
  "nodeVersion": "20.x"
}
```

### 4. Add Debug Output
Temporarily add to `vercel.json`:
```json
{
  "buildCommand": "node --version && npm --version && cd frontend && npm run build"
}
```

---

## Next Steps

1. **Push these changes:**
   ```bash
   git add .
   git commit -m "Fix: Deployment configuration"
   git push origin main
   ```

2. **Go to Vercel and deploy:**
   - Vercel will auto-deploy on push (if connected)
   - Or manually trigger deployment from dashboard

3. **Monitor build:**
   - Check Vercel dashboard for build status
   - Check build logs if it fails

Need help? Check the [full deployment guide](DEPLOYMENT_GUIDE.md).
