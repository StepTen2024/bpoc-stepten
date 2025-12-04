# Signup Route Analysis

## 🔍 Current Flow

**User Signup Process:**
1. ✅ User signs up via Supabase Auth → Creates `auth.users` record in **Supabase**
2. ✅ `/api/user/sync` endpoint called → Uses `syncUserToDatabaseServer()`
3. ❌ `syncUserToDatabaseServer()` writes directly to **Railway** using `pool.query()`
4. ❌ Profile fetch uses `/api/user/profile` → Reads from **Railway**

## 📊 Where Data Goes

| Step | Destination | Database |
|------|-------------|----------|
| Auth Signup | Supabase | `auth.users` ✅ |
| User Sync | **Railway** | `users` table ❌ |
| Profile Fetch | **Railway** | `users` table ❌ |

## ⚠️ Problem

**Signup routes are going to Railway, NOT Supabase!**

- `syncUserToDatabaseServer()` uses direct SQL: `pool.query('INSERT INTO users...')`
- This bypasses the new abstraction layer
- Feature flags are NOT being used
- Data is split: Auth in Supabase, User data in Railway

## ✅ Solution

Update `/api/user/sync` to use the new abstraction layer:

```typescript
// BEFORE (current)
import { syncUserToDatabaseServer } from '@/lib/user-sync-server'
// Uses pool.query() → Railway

// AFTER (should be)
import { createCandidate } from '@/lib/db/candidates'
import { createProfile } from '@/lib/db/profiles'
// Uses abstraction layer → Respects feature flags
```

## 🎯 Next Steps

1. Update `syncUserToDatabaseServer()` to use abstraction layer
2. Or create new sync function that uses `createCandidate()`
3. Update `/api/user/sync` route to use new function
4. Test with feature flags ON/OFF


