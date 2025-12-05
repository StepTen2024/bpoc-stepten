# BPOC Supabase Implementation Guide

## ✅ Foundation Setup Complete

### Created Files

1. **Supabase Clients**
   - `src/lib/supabase/client.ts` - Browser client
   - `src/lib/supabase/server.ts` - Server client (API routes)
   - `src/lib/supabase/admin.ts` - Admin client (bypasses RLS)

2. **Feature Flags**
   - `src/lib/config/features.ts` - Feature flag configuration

3. **Database Abstraction Layer**
   - `src/lib/db/candidates/queries.prisma.ts` - Prisma wrapper (old DB)
   - `src/lib/db/candidates/queries.supabase.ts` - Supabase queries (new DB)
   - `src/lib/db/candidates/index.ts` - Feature flag switcher

## 🚀 How to Use the New Database

### Step 1: Enable Feature Flags

Add to `.env.local`:

```env
# Master switch
USE_SUPABASE=true

# Feature flags (enable one at a time for testing)
FEATURE_SUPABASE_CANDIDATES=true
FEATURE_SUPABASE_PROFILES=false
FEATURE_SUPABASE_RESUMES=false
FEATURE_SUPABASE_ASSESSMENTS=false
FEATURE_SUPABASE_JOBS=false
FEATURE_SUPABASE_APPLICATIONS=false
```

### Step 2: Update API Routes

**BEFORE** (direct Prisma/database access):
```typescript
// src/app/api/user/[id]/route.ts
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id }
  })
  return Response.json({ user })
}
```

**AFTER** (using abstraction layer):
```typescript
// src/app/api/user/[id]/route.ts
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const candidate = await getCandidateById(params.id)
  
  if (!candidate) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  
  return Response.json({ user: candidate })
}
```

### Step 3: The Magic ✨

The `getCandidateById` function automatically:
- Uses **Supabase** if `FEATURE_SUPABASE_CANDIDATES=true`
- Uses **Prisma/Railway** if flag is `false`
- Returns the **same data shape** regardless of source

## 📋 Next Steps

### Phase 1: Candidates (✅ Foundation Ready)

1. **Update Auth Routes**
   - `/app/api/auth/signup/route.ts` - Use `createCandidate()`
   - `/app/api/auth/login/route.ts` - Use `getCandidateByEmail()`
   - `/app/api/user/[id]/route.ts` - Use `getCandidateById()`

2. **Test**
   - Set `FEATURE_SUPABASE_CANDIDATES=false` → Test old system
   - Set `FEATURE_SUPABASE_CANDIDATES=true` → Test new system
   - Verify both return same data shape

### Phase 2: Profiles (Next)

Create similar structure for profiles:
- `src/lib/db/profiles/queries.prisma.ts`
- `src/lib/db/profiles/queries.supabase.ts`
- `src/lib/db/profiles/index.ts`

### Phase 3-7: Continue Per Plan

Follow the same pattern for:
- Resumes
- Assessments (DISC, Typing)
- Agencies & Companies
- Jobs
- Applications

## 🔄 Migration Strategy

1. **Start with flags OFF** - Everything uses Railway
2. **Enable one feature flag** - Test thoroughly
3. **Monitor for issues** - Check logs, errors
4. **Enable next feature** - Repeat
5. **When all enabled** - Set `USE_SUPABASE=true` globally
6. **After 1 week stable** - Remove Prisma code

## 🛡️ Safety Features

- **Instant Rollback** - Just flip the flag
- **No Breaking Changes** - Same API, different backend
- **Gradual Migration** - One feature at a time
- **Parallel Running** - Both databases work simultaneously

## 📊 Current Status

- ✅ Supabase clients created
- ✅ Feature flags configured
- ✅ Candidates abstraction layer ready
- ⏭️ Ready to update API routes
- ⏭️ Ready to test Phase 1

## 🎯 Example: Updating an API Route

Let's update `/app/api/user/[id]/route.ts`:

```typescript
// OLD WAY
import pool from '@/lib/database'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [params.id])
  return Response.json({ user: result.rows[0] })
}

// NEW WAY
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const candidate = await getCandidateById(params.id)
  if (!candidate) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ user: candidate })
}
```

That's it! The feature flag handles the rest.


