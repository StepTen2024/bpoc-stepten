# 🧹 Cleanup Instructions for stephen@stepten.io

## Current Situation

**You deleted the auth user but still have a session cookie!**

- ✅ No data in Supabase `candidates` table
- ✅ No data in Supabase `candidate_profiles` table  
- ❌ Still have Supabase Auth **SESSION COOKIE** (browser thinks you're logged in)
- ❌ Auth user was deleted, so foreign key constraint fails

## Why You're Still Being "Found"

The system is **NOT** finding you in Railway. Here's what's happening:

1. **Browser has session cookie** → Frontend thinks you're logged in
2. **Frontend calls `/api/user/profile`** → Returns 404 (not found) ✅ Correct
3. **Frontend tries to sync** → Calls `/api/user/sync`
4. **Sync fails** → Foreign key constraint: `candidates.id` must reference `auth.users.id`
5. **Error**: User doesn't exist in `auth.users` (you deleted it)

## Solution: Start Fresh

### Option 1: Sign Out & Clear Cookies (Recommended)

1. **Sign out** from the app (click logout button)
2. **Clear browser cookies** for `localhost:3000`:
   - Chrome: DevTools → Application → Cookies → Delete all
   - Or use incognito/private window
3. **Sign up again** as a new user

### Option 2: Delete Auth User via Script

If auth user still exists, run:

```bash
npx tsx cleanup-user-data.ts stephen@stepten.io
```

This will:
- Delete all candidate data from Supabase
- Delete auth user from `auth.users`
- Clean everything up

### Option 3: Manual Cleanup via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Find `stephen@stepten.io` and delete
3. Go to Table Editor → `candidates` table
4. Delete any records with email `stephen@stepten.io`
5. Clear browser cookies
6. Sign up fresh

## Verify Clean State

After cleanup, verify:

```bash
# Check Supabase
npx tsx cleanup-user-data.ts stephen@stepten.io
# Should show: "No user found"
```

## Then Sign Up Fresh

1. Clear cookies
2. Go to signup page
3. Create new account
4. Should work perfectly! ✅


