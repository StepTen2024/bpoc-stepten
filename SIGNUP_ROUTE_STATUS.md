# Signup Route Status

## 🔍 Current Situation

**Answer: Routes are going to Railway (OLD database)**

### Signup Flow:
1. ✅ **Auth**: Supabase (`auth.users`) - User authenticates via Supabase
2. ❌ **User Data**: Railway (`users` table) - User record created via `/api/user/sync`
3. ❌ **Profile Fetch**: Railway - Reads from Railway via `/api/user/profile`

### Evidence:
- Logs show: `✅ User synced to database successfully`
- Test confirms: User `stephen@stepten.io` exists in Railway
- `/api/user/sync` uses `syncUserToDatabaseServer()` → Direct SQL to Railway

## ✅ What I Just Fixed

**Created new sync function that respects feature flags:**

1. ✅ Created `user-sync-server-v2.ts` - Uses abstraction layer
2. ✅ Updated `/api/user/sync` - Now checks feature flags
3. ✅ When `FEATURE_SUPABASE_CANDIDATES=true` → Uses Supabase
4. ✅ When `FEATURE_SUPABASE_CANDIDATES=false` → Uses Railway (current)

## 🎯 How to Switch to Supabase

**Enable feature flag in `.env.local`:**
```env
USE_SUPABASE=true
FEATURE_SUPABASE_CANDIDATES=true
FEATURE_SUPABASE_PROFILES=true
```

**Then restart server** - Signups will go to Supabase!

## 📊 Current vs New Behavior

| Feature Flag | Signup Destination | Profile Fetch |
|--------------|-------------------|---------------|
| `false` (current) | Railway `users` table | Railway |
| `true` (new) | Supabase `candidates` table | Supabase |

## ⚠️ Important Notes

- **Auth is ALWAYS Supabase** - `auth.users` table
- **User data follows feature flag** - Railway or Supabase
- **Both work simultaneously** - Can test both side-by-side
- **Easy rollback** - Just flip the flag


