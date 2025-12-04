# Example: Updating API Routes to Use New Database

## Before & After Examples

### Example 1: Get User Profile

**BEFORE** (`src/app/api/user/profile/route.ts`):
```typescript
import pool from '@/lib/database'

export async function GET(request: NextRequest) {
  const userId = searchParams.get('userId')
  
  const query = `
    SELECT u.*, uls.overall_score
    FROM users u
    LEFT JOIN user_leaderboard_scores uls ON u.id = uls.user_id
    WHERE u.id = $1
  `
  
  const result = await pool.query(query, [userId])
  const user = result.rows[0]
  
  return NextResponse.json({ user })
}
```

**AFTER** (using new abstraction layer):
```typescript
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(request: NextRequest) {
  const userId = searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }
  
  // Get candidate (basic info)
  const candidate = await getCandidateById(userId)
  if (!candidate) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Get profile (extended info)
  const profile = await getProfileByCandidate(userId)
  
  // Combine into expected shape
  const user = {
    ...candidate,
    ...profile,
    overall_score: profile?.gamification?.total_xp || 0,
  }
  
  return NextResponse.json({ user })
}
```

### Example 2: Update User Profile

**BEFORE**:
```typescript
import pool from '@/lib/database'

export async function PUT(request: NextRequest) {
  const { userId, bio, position, location } = await request.json()
  
  await pool.query(
    `UPDATE users SET bio = $1, position = $2, location = $3 WHERE id = $4`,
    [bio, position, location, userId]
  )
  
  // Also update work_status table...
  // Also update privacy_settings table...
  // Complex multi-table updates...
}
```

**AFTER**:
```typescript
import { updateProfile } from '@/lib/db/profiles'

export async function PUT(request: NextRequest) {
  const { userId, ...updateData } = await request.json()
  
  const profile = await updateProfile(userId, {
    bio: updateData.bio,
    position: updateData.position,
    location: updateData.location,
    // All fields in one call - handles multiple tables automatically
  })
  
  if (!profile) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  
  return NextResponse.json({ profile })
}
```

## Key Benefits

1. **Single Function Call** - No more complex SQL joins
2. **Automatic Table Mapping** - Handles multiple old tables automatically
3. **Feature Flag Control** - Switch between old/new with env variable
4. **Type Safety** - TypeScript types ensure correct data shape
5. **Consistent API** - Same function signature regardless of backend

## Migration Checklist

For each API route:

- [ ] Replace `pool.query()` with abstraction layer functions
- [ ] Replace `prisma.user.findUnique()` with `getCandidateById()`
- [ ] Replace complex SQL joins with single function calls
- [ ] Test with `FEATURE_SUPABASE_*=false` (old system)
- [ ] Test with `FEATURE_SUPABASE_*=true` (new system)
- [ ] Verify response shape matches frontend expectations
- [ ] Check error handling
- [ ] Update any TypeScript types

## Next Routes to Update

Priority order:
1. `/api/user/profile` - Most used
2. `/api/user/[id]` - User lookup
3. `/api/auth/signup` - User creation
4. `/api/user/update-profile` - Profile updates
5. `/api/user/work-status` - Work status updates


