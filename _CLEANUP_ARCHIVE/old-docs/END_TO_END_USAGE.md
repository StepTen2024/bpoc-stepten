# End-to-End Usage Guide: New Supabase Database

## 🎯 Overview

You now have a **complete database abstraction layer** that lets you use Supabase seamlessly while keeping Railway as backup. The system uses **feature flags** to switch between databases.

## 📁 What's Been Created

### Foundation Files
```
src/lib/
├── supabase/
│   ├── client.ts          ✅ Browser client
│   ├── server.ts          ✅ Server client  
│   └── admin.ts           ✅ Admin client
├── config/
│   └── features.ts        ✅ Feature flags
└── db/
    ├── candidates/        ✅ Complete module
    │   ├── queries.prisma.ts
    │   ├── queries.supabase.ts
    │   └── index.ts
    └── profiles/          ✅ Complete module
        ├── queries.prisma.ts
        ├── queries.supabase.ts
        └── index.ts
```

## 🚀 How to Use (End-to-End)

### 1. Enable Feature Flags

Edit `.env.local`:
```env
# Master switch - must be true to use any Supabase features
USE_SUPABASE=true

# Enable specific features (start with one)
FEATURE_SUPABASE_CANDIDATES=true
FEATURE_SUPABASE_PROFILES=true

# Keep others OFF until ready
FEATURE_SUPABASE_RESUMES=false
FEATURE_SUPABASE_ASSESSMENTS=false
FEATURE_SUPABASE_JOBS=false
FEATURE_SUPABASE_APPLICATIONS=false
```

### 2. Update API Routes

**Example: Update `/api/user/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params)
    
    // Get candidate (basic info)
    const candidate = await getCandidateById(id)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Get profile (extended info - work_status, privacy, gamification)
    const profile = await getProfileByCandidate(id)
    
    // Combine into expected shape
    const user = {
      ...candidate,
      bio: profile?.bio,
      position: profile?.position,
      location: profile?.location,
      work_status: profile?.work_status,
      current_employer: profile?.current_employer,
      privacy_settings: profile?.privacy_settings,
      overall_score: profile?.gamification?.total_xp || 0,
      // ... all other fields
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3. Test Both Systems

**Test Railway (flags OFF):**
```bash
# .env.local
FEATURE_SUPABASE_CANDIDATES=false
FEATURE_SUPABASE_PROFILES=false

npm run dev
# Visit /api/user/[id] - uses Railway
```

**Test Supabase (flags ON):**
```bash
# .env.local
FEATURE_SUPABASE_CANDIDATES=true
FEATURE_SUPABASE_PROFILES=true

npm run dev
# Visit /api/user/[id] - uses Supabase
```

## 🔄 Complete Flow Example

### User Signup Flow

```typescript
// src/app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server'
import { createCandidate } from '@/lib/db/candidates'
import { createProfile } from '@/lib/db/profiles'

export async function POST(request: Request) {
  const { email, password, firstName, lastName } = await request.json()
  
  // 1. Create auth user in Supabase
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (authError || !authData.user) {
    return Response.json({ error: authError?.message }, { status: 400 })
  }
  
  // 2. Create candidate record (uses feature flag)
  const candidate = await createCandidate({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
  })
  
  // 3. Create profile (uses feature flag)
  await createProfile(authData.user.id, {
    profile_completed: false,
    profile_completion_percentage: 0,
  })
  
  return Response.json({ user: candidate })
}
```

### Get User Profile Flow

```typescript
// src/app/api/user/profile/route.ts
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(request: Request) {
  const userId = searchParams.get('userId')
  
  // Get both candidate and profile
  const [candidate, profile] = await Promise.all([
    getCandidateById(userId!),
    getProfileByCandidate(userId!),
  ])
  
  if (!candidate) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  
  // Combine into expected shape
  return Response.json({
    user: {
      ...candidate,
      ...profile,
      overall_score: profile?.gamification?.total_xp || 0,
    }
  })
}
```

## 🎯 Key Benefits

1. **Same Code, Different Backend** - Feature flag handles routing
2. **Type Safety** - TypeScript ensures correct types
3. **Simplified Queries** - No more complex SQL joins
4. **Easy Testing** - Test both systems side-by-side
5. **Instant Rollback** - Flip flag to revert

## 📊 Data Flow

```
Frontend Request
    ↓
API Route
    ↓
Abstraction Layer (getCandidateById, getProfileByCandidate)
    ↓
Feature Flag Check (useSupabase('candidates'))
    ├─→ FALSE: Prisma Query → Railway Database
    └─→ TRUE: Supabase Query → Supabase Database
    ↓
Data Transformation (to unified shape)
    ↓
Return to API Route
    ↓
Response to Frontend
```

## 🛠️ Next Steps

1. **Update Auth Routes** - Signup, login, logout
2. **Update User Routes** - Profile, update profile
3. **Create Resume Module** - Add resume abstraction layer
4. **Create Assessment Modules** - DISC, Typing Hero
5. **Create Job Modules** - Jobs, applications, matches
6. **Test Each Phase** - Enable flags one at a time
7. **Full Cutover** - Enable all flags
8. **Cleanup** - Remove Prisma code

## 📝 Files Created

- ✅ `src/lib/supabase/client.ts` - Browser client
- ✅ `src/lib/supabase/server.ts` - Server client
- ✅ `src/lib/supabase/admin.ts` - Admin client
- ✅ `src/lib/config/features.ts` - Feature flags
- ✅ `src/lib/db/candidates/` - Candidates module
- ✅ `src/lib/db/profiles/` - Profiles module
- ✅ `IMPLEMENTATION_GUIDE.md` - Usage guide
- ✅ `EXAMPLE_API_UPDATE.md` - Examples
- ✅ `QUICK_START_GUIDE.md` - Quick reference

## ✅ Ready to Use!

The foundation is complete. You can now:
1. Start updating API routes
2. Test with feature flags
3. Gradually migrate features
4. Roll back instantly if needed

**Everything is ready - just start updating your API routes!** 🚀
