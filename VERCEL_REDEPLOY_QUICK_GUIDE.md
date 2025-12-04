# 🚀 Vercel Redeploy Quick Guide

## Repository Changed
- **Old**: `shoreagents/bpoc-cloned`
- **New**: `StepTen2024/bpoc-stepten`

---

## Quick Steps to Redeploy

### 1. Connect Repository (2 minutes)
1. Go to https://vercel.com/dashboard
2. Select your project (or create new)
3. **Settings** → **Git** → **Connect Git Repository**
4. Select: `StepTen2024/bpoc-stepten`
5. Click **Connect**

### 2. Add Environment Variables (5 minutes) ⚠️ CRITICAL

Go to **Settings** → **Environment Variables** and add:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SHOREAGENTS_SUPABASE_URL
NEXT_PUBLIC_SHOREAGENTS_SUPABASE_ANON_KEY
SHOREAGENTS_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_APP_URL
DATABASE_URL
ANTHROPIC_API_KEY (or CLAUDE_API_KEY)
```

**⚠️ IMPORTANT**: 
- Set for **all environments** (Production, Preview, Development)
- Copy values from your old Vercel project or local `.env.local`
- Don't forget the `SHOREAGENTS_*` variables!

### 3. Deploy (automatic)
- Vercel will auto-deploy after connecting the repo
- Or manually: **Deployments** → **Deploy** → Select `main` branch

### 4. Verify
- Check deployment status in **Deployments** tab
- Visit your app URL
- Test auto-deploy: `git push origin main`

---

## Where to Find Your Environment Variables

### From Old Vercel Project:
1. Go to old project → **Settings** → **Environment Variables**
2. Copy all values

### From Local `.env.local`:
1. Open `.env.local` in your project
2. Copy values (don't copy the file itself - add individually in Vercel)

### From Supabase:
1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Common Issues

### ❌ Build Fails
- Check **Deployments** → Click failed deployment → View logs
- Usually missing environment variables

### ❌ Auto-deploy Not Working
- **Settings** → **Git** → Verify "Auto-deploy" is ON
- Check GitHub webhook: Repo → **Settings** → **Webhooks**

### ❌ App Not Working After Deploy
- Verify all environment variables are set
- Check deployment logs for errors
- Verify database connections are correct

---

## Need More Details?

See `VERCEL_AUTO_DEPLOY_SETUP.md` for complete instructions.

