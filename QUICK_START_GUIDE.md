# Quick Start Guide: Using the New Supabase Database

## 🎯 What's Been Set Up

✅ **Complete foundation** for using Supabase database with feature flags
✅ **Database abstraction layer** - Switch between Railway and Supabase seamlessly
✅ **Type-safe queries** - TypeScript ensures correctness
✅ **Zero breaking changes** - Same API, different backend

## 🚀 Quick Start (3 Steps)

### Step 1: Enable Feature Flags

Add to `.env.local`:
```env
# Master switch
USE_SUPABASE=true

# Enable features one at a time
FEATURE_SUPABASE_CANDIDATES=true
FEATURE_SUPABASE_PROFILES=true
```

### Step 2: Update an API Route

**Example: Update `/api/user/[id]/route.ts`**

```typescript
// OLD WAY (direct database)
import pool from '@/lib/database'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [params.id])
  return Response.json({ user: result.rows[0] })
}

// NEW WAY (abstraction layer)
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const candidate = await getCandidateById(params.id)
  if (!candidate) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  
  const profile = await getProfileByCandidate(params.id)
  
  return Response.json({
    user: {
      ...candidate,
      ...profile,
      overall_score: profile?.gamification?.total_xp || 0,
    }
  })
}
```

### Step 3: Test

```bash
# Test with Railway (flags OFF)
FEATURE_SUPABASE_CANDIDATES=false npm run dev

# Test with Supabase (flags ON)
FEATURE_SUPABASE_CANDIDATES=true npm run dev
```

## 📚 Available Functions

### Candidates
```typescript
import { 
  getCandidateById, 
  getCandidateByEmail,
  createCandidate,
  updateCandidate,
  deleteCandidate 
} from '@/lib/db/candidates'

// Get candidate
const candidate = await getCandidateById(userId)

// Create candidate
const newCandidate = await createCandidate({
  id: authUser.id,
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
})

// Update candidate
const updated = await updateCandidate(userId, {
  first_name: 'Jane',
  avatar_url: 'https://...',
})
```

### Profiles
```typescript
import { 
  getProfileByCandidate,
  updateProfile,
  createProfile 
} from '@/lib/db/profiles'

// Get full profile (includes work_status, privacy_settings, gamification)
const profile = await getProfileByCandidate(userId)

// Update profile (handles multiple tables automatically)
const updated = await updateProfile(userId, {
  bio: 'New bio',
  position: 'Developer',
  work_status: 'employed',
  current_employer: 'Company Inc',
  privacy_settings: { username: 'public' },
})
```

## 🔄 How It Works

1. **Feature Flag Check** - `useSupabase('candidates')` checks env variable
2. **Route to Backend** - Routes to Prisma (Railway) or Supabase
3. **Transform Data** - Both return same shape
4. **Return Result** - API route gets consistent data

## 🛡️ Safety Features

- **Instant Rollback** - Set flag to `false`
- **No Breaking Changes** - Same function signatures
- **Gradual Migration** - Enable one feature at a time
- **Parallel Running** - Both databases work simultaneously

## 📋 Migration Checklist

For each API route:

- [ ] Import abstraction layer functions
- [ ] Replace `pool.query()` calls
- [ ] Replace `prisma.user.findUnique()` calls
- [ ] Test with flags OFF (Railway)
- [ ] Test with flags ON (Supabase)
- [ ] Verify response shape
- [ ] Check error handling

## 🎯 Next: Update These Routes

Priority order:
1. `/api/user/[id]` - User lookup
2. `/api/user/profile` - Profile fetch
3. `/api/user/update-profile` - Profile update
4. `/api/auth/signup` - User creation
5. `/api/auth/login` - User authentication

## 📖 Full Documentation

- `IMPLEMENTATION_GUIDE.md` - Detailed guide
- `EXAMPLE_API_UPDATE.md` - Before/after examples
- `SUPABASE_IMPLEMENTATION_STATUS.md` - Current status
- `master plan/BPOC_Implementation_Plan.md` - Complete plan

