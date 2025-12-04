# BPOC Implementation Plan
## Post-Schema Migration Guide

**Assumes:** All Supabase tables are created and ready

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Setup](#pre-migration-setup)
3. [Phase 1: Foundation & Auth](#phase-1-foundation--auth)
4. [Phase 2: Candidate Profiles](#phase-2-candidate-profiles)
5. [Phase 3: Resume System](#phase-3-resume-system)
6. [Phase 4: Assessments](#phase-4-assessments)
7. [Phase 5: Agency & Recruiter](#phase-5-agency--recruiter)
8. [Phase 6: Jobs](#phase-6-jobs)
9. [Phase 7: Applications Flow](#phase-7-applications-flow)
10. [Phase 8: Data Migration](#phase-8-data-migration)
11. [Phase 9: Cutover & Cleanup](#phase-9-cutover--cleanup)
12. [Rollback Procedures](#rollback-procedures)
13. [Testing Checklists](#testing-checklists)

---

## Overview

### Timeline

```
┌────────────────────────────────────────────────────────────────┐
│  WEEK 1        │  WEEK 2        │  WEEK 3        │  WEEK 4     │
├────────────────────────────────────────────────────────────────┤
│  Setup         │  Profiles      │  Agencies      │  Cutover    │
│  Auth          │  Resumes       │  Jobs          │  Cleanup    │
│  Candidates    │  Assessments   │  Applications  │  Monitor    │
└────────────────────────────────────────────────────────────────┘
```

### Strategy

1. **Feature Flags** - Toggle between old/new per feature
2. **Parallel Running** - Both databases work simultaneously
3. **Gradual Migration** - Move one feature at a time
4. **Easy Rollback** - Flip a flag to revert instantly

---

## Pre-Migration Setup

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 2: Environment Variables

```env
# .env.local

# === MASTER SWITCH ===
USE_SUPABASE=false

# === FEATURE FLAGS ===
FEATURE_SUPABASE_AUTH=false
FEATURE_SUPABASE_CANDIDATES=false
FEATURE_SUPABASE_PROFILES=false
FEATURE_SUPABASE_RESUMES=false
FEATURE_SUPABASE_ASSESSMENTS=false
FEATURE_SUPABASE_AGENCIES=false
FEATURE_SUPABASE_JOBS=false
FEATURE_SUPABASE_APPLICATIONS=false

# === OLD DATABASE (Keep working) ===
DATABASE_URL="postgresql://..."

# === NEW DATABASE (Supabase) ===
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Step 3: Create File Structure

```
/lib/
├── supabase/
│   ├── client.ts           # Browser client
│   ├── server.ts           # Server client  
│   └── admin.ts            # Admin client (bypasses RLS)
│
├── config/
│   └── features.ts         # Feature flag utility
│
└── db/
    ├── index.ts            # Main exports
    ├── types.ts            # All TypeScript types
    │
    ├── candidates/
    │   ├── index.ts        # Exports with feature flag logic
    │   ├── queries.prisma.ts
    │   └── queries.supabase.ts
    │
    ├── profiles/
    │   ├── index.ts
    │   ├── queries.prisma.ts
    │   └── queries.supabase.ts
    │
    ├── resumes/
    │   └── ...
    │
    ├── assessments/
    │   └── ...
    │
    ├── agencies/
    │   └── ...
    │
    ├── jobs/
    │   └── ...
    │
    └── applications/
        └── ...
```

### Step 4: Create Base Files

**Create: `/lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Create: `/lib/supabase/server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
```

**Create: `/lib/supabase/admin.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

**Create: `/lib/config/features.ts`**
```typescript
export const features = {
  supabase: {
    enabled: process.env.USE_SUPABASE === 'true',
    auth: process.env.FEATURE_SUPABASE_AUTH === 'true',
    candidates: process.env.FEATURE_SUPABASE_CANDIDATES === 'true',
    profiles: process.env.FEATURE_SUPABASE_PROFILES === 'true',
    resumes: process.env.FEATURE_SUPABASE_RESUMES === 'true',
    assessments: process.env.FEATURE_SUPABASE_ASSESSMENTS === 'true',
    agencies: process.env.FEATURE_SUPABASE_AGENCIES === 'true',
    jobs: process.env.FEATURE_SUPABASE_JOBS === 'true',
    applications: process.env.FEATURE_SUPABASE_APPLICATIONS === 'true',
  }
}

export function useSupabase(feature: keyof typeof features.supabase): boolean {
  if (!features.supabase.enabled) return false
  return features.supabase[feature] ?? false
}
```

---

## Phase 1: Foundation & Auth

### Duration: 2-3 Days

### Files to Create

| File | Purpose |
|------|---------|
| `/lib/db/candidates/queries.prisma.ts` | Old Prisma queries wrapped |
| `/lib/db/candidates/queries.supabase.ts` | New Supabase queries |
| `/lib/db/candidates/index.ts` | Feature flag switcher |

### Prisma Wrapper Example

```typescript
// /lib/db/candidates/queries.prisma.ts
import { prisma } from '@/lib/prisma'

export async function getCandidateById(id: string) {
  const user = await prisma.users.findUnique({
    where: { id },
    include: { user_work_status: true }
  })
  
  if (!user) return null
  
  // Transform OLD shape → NEW shape
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name,
    phone: user.phone,
    avatar_url: user.avatar_url,
    username: user.username,
    slug: user.slug,
    is_active: true,
    created_at: user.created_at?.toISOString(),
    updated_at: user.updated_at?.toISOString(),
  }
}

export async function createCandidate(data: {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
}) {
  const user = await prisma.users.create({
    data: {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      location: '', // Required in old schema
      phone: data.phone,
    }
  })
  
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name,
    phone: user.phone,
    avatar_url: user.avatar_url,
    username: user.username,
    slug: user.slug,
    is_active: true,
    created_at: user.created_at?.toISOString(),
    updated_at: user.updated_at?.toISOString(),
  }
}

export async function updateCandidate(id: string, data: {
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  username?: string
}) {
  const user = await prisma.users.update({
    where: { id },
    data: {
      ...data,
      full_name: data.first_name && data.last_name 
        ? `${data.first_name} ${data.last_name}` 
        : undefined,
    }
  })
  
  return getCandidateById(user.id)
}

export async function deleteCandidate(id: string) {
  await prisma.users.delete({ where: { id } })
  return true
}
```

### Supabase Queries Example

```typescript
// /lib/db/candidates/queries.supabase.ts
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function getCandidateById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) return null
  return data
}

export async function createCandidate(data: {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
}) {
  const { data: candidate, error } = await supabaseAdmin
    .from('candidates')
    .insert({
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return candidate
}

export async function updateCandidate(id: string, data: {
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  username?: string
}) {
  const supabase = await createClient()
  
  const { data: candidate, error } = await supabase
    .from('candidates')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  if (error) return null
  return candidate
}

export async function deleteCandidate(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  return !error
}
```

### Feature Flag Switcher

```typescript
// /lib/db/candidates/index.ts
import { useSupabase } from '@/lib/config/features'
import * as prisma from './queries.prisma'
import * as supabase from './queries.supabase'

export const getCandidateById = (id: string) =>
  useSupabase('candidates') ? supabase.getCandidateById(id) : prisma.getCandidateById(id)

export const createCandidate = (data: Parameters<typeof prisma.createCandidate>[0]) =>
  useSupabase('candidates') ? supabase.createCandidate(data) : prisma.createCandidate(data)

export const updateCandidate = (id: string, data: Parameters<typeof prisma.updateCandidate>[1]) =>
  useSupabase('candidates') ? supabase.updateCandidate(id, data) : prisma.updateCandidate(id, data)

export const deleteCandidate = (id: string) =>
  useSupabase('candidates') ? supabase.deleteCandidate(id) : prisma.deleteCandidate(id)
```

### API Routes to Update

Find and replace direct Prisma calls:

```typescript
// BEFORE - /app/api/auth/signup/route.ts
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { email, firstName, lastName } = await req.json()
  
  // Old auth logic...
  
  const user = await prisma.users.create({
    data: {
      id: authUser.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      location: '',
    }
  })
  
  return Response.json({ user })
}
```

```typescript
// AFTER - /app/api/auth/signup/route.ts
import { createCandidate } from '@/lib/db/candidates'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, password, firstName, lastName } = await req.json()
  
  // Supabase Auth
  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error || !authData.user) {
    return Response.json({ error: error?.message }, { status: 400 })
  }
  
  // Create candidate (uses feature flag internally)
  const candidate = await createCandidate({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
  })
  
  return Response.json({ user: candidate })
}
```

### Files to Update - Phase 1

```
□ /app/api/auth/signup/route.ts
□ /app/api/auth/login/route.ts
□ /app/api/auth/logout/route.ts
□ /app/api/auth/callback/route.ts
□ /app/api/users/[id]/route.ts
□ /app/api/users/me/route.ts
□ Any middleware checking auth
□ Any components using useUser or similar hooks
```

### Testing Checklist - Phase 1

```
□ With flags OFF (old system):
  □ Signup works
  □ Login works
  □ Logout works
  □ Get user by ID works
  □ Update user works

□ With flags ON (new system):
  □ Signup creates user in Supabase auth.users
  □ Signup creates record in candidates table
  □ Login works with Supabase Auth
  □ Session persists correctly
  □ Get user returns correct shape
  □ Update user works

□ Rollback test:
  □ Turn flags OFF
  □ Everything still works with old system
```

---

## Phase 2: Candidate Profiles

### Duration: 2-3 Days

### Old Tables → New Table Mapping

```
OLD                          NEW
───                          ───
users.bio                 →  candidate_profiles.bio
users.position            →  candidate_profiles.position
users.birthday            →  candidate_profiles.birthday
users.gender              →  candidate_profiles.gender
users.location_*          →  candidate_profiles.location_*
user_work_status.*        →  candidate_profiles.*
privacy_settings.*        →  candidate_profiles.privacy_settings (JSON)
user_leaderboard_scores.* →  candidate_profiles.gamification (JSON)
```

### Files to Create

```
□ /lib/db/profiles/queries.prisma.ts
□ /lib/db/profiles/queries.supabase.ts
□ /lib/db/profiles/index.ts
```

### Prisma Query (Maps Multiple Tables)

```typescript
// /lib/db/profiles/queries.prisma.ts
import { prisma } from '@/lib/prisma'

export async function getProfileByCandidate(candidateId: string) {
  const user = await prisma.users.findUnique({
    where: { id: candidateId },
    include: {
      user_work_status: true,
      privacy_settings: true,
      user_leaderboard_scores: true,
    }
  })
  
  if (!user) return null
  
  // Transform to new unified shape
  return {
    id: user.user_work_status?.id || candidateId,
    candidate_id: candidateId,
    bio: user.bio,
    position: user.position,
    birthday: user.birthday?.toISOString().split('T')[0],
    gender: user.gender,
    location: user.location,
    location_city: user.location_city,
    location_province: user.location_province,
    location_country: user.location_country,
    work_status: user.user_work_status?.work_status,
    current_employer: user.user_work_status?.current_employer,
    current_position: user.user_work_status?.current_position,
    current_salary: user.user_work_status?.current_salary ? Number(user.user_work_status.current_salary) : null,
    expected_salary_min: user.user_work_status?.minimum_salary_range ? Number(user.user_work_status.minimum_salary_range) : null,
    expected_salary_max: user.user_work_status?.maximum_salary_range ? Number(user.user_work_status.maximum_salary_range) : null,
    preferred_shift: user.user_work_status?.preferred_shift,
    preferred_work_setup: mapWorkSetup(user.user_work_status?.work_setup),
    privacy_settings: {
      username: user.privacy_settings?.username || 'public',
      first_name: user.privacy_settings?.first_name || 'public',
      last_name: user.privacy_settings?.last_name || 'only-me',
      // ... rest of privacy fields
    },
    gamification: {
      total_xp: user.user_leaderboard_scores?.overall_score || 0,
      tier: user.user_leaderboard_scores?.tier || 'Bronze',
      rank_position: user.user_leaderboard_scores?.rank_position || 0,
    },
    profile_completed: user.completed_data,
    created_at: user.created_at?.toISOString(),
    updated_at: user.updated_at?.toISOString(),
  }
}

function mapWorkSetup(old: string | null | undefined): string {
  const map: Record<string, string> = {
    'Work From Office': 'office',
    'Work From Home': 'remote',
    'Hybrid': 'hybrid',
  }
  return map[old || ''] || 'any'
}

export async function updateProfile(candidateId: string, data: any) {
  // Update multiple old tables
  await prisma.$transaction([
    prisma.users.update({
      where: { id: candidateId },
      data: {
        bio: data.bio,
        position: data.position,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
        gender: data.gender,
        location: data.location,
        location_city: data.location_city,
        location_province: data.location_province,
        location_country: data.location_country,
      }
    }),
    prisma.user_work_status.upsert({
      where: { user_id: candidateId },
      create: {
        user_id: candidateId,
        work_status: data.work_status,
        current_employer: data.current_employer,
        current_position: data.current_position,
        // ... etc
      },
      update: {
        work_status: data.work_status,
        current_employer: data.current_employer,
        current_position: data.current_position,
        // ... etc
      }
    })
  ])
  
  return getProfileByCandidate(candidateId)
}
```

### Supabase Query (Single Table)

```typescript
// /lib/db/profiles/queries.supabase.ts
import { createClient } from '@/lib/supabase/server'

export async function getProfileByCandidate(candidateId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('candidate_id', candidateId)
    .single()
  
  if (error) return null
  return data
}

export async function updateProfile(candidateId: string, data: any) {
  const supabase = await createClient()
  
  const { data: profile, error } = await supabase
    .from('candidate_profiles')
    .update(data)
    .eq('candidate_id', candidateId)
    .select()
    .single()
  
  if (error) return null
  return profile
}

export async function createProfile(candidateId: string, data: any) {
  const supabase = await createClient()
  
  const { data: profile, error } = await supabase
    .from('candidate_profiles')
    .insert({ candidate_id: candidateId, ...data })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return profile
}
```

### Files to Update - Phase 2

```
□ /app/api/users/[id]/profile/route.ts
□ /app/api/users/[id]/work-status/route.ts
□ /app/api/users/[id]/privacy/route.ts
□ /app/api/users/[id]/location/route.ts
□ Any profile page components
□ Any profile edit forms
```

### Testing Checklist - Phase 2

```
□ Get profile returns all fields
□ Update bio works
□ Update location works  
□ Update work status works
□ Update privacy settings works
□ Profile completion percentage calculates
□ Gamification data loads
```

---

## Phase 3: Resume System

### Duration: 3-4 Days

### Old Tables → New Table Mapping

```
OLD                              NEW
───                              ───
resumes_extracted.resume_data →  candidate_resumes.extracted_data
resumes_generated.*           →  candidate_resumes.generated_data
saved_resumes.*               →  candidate_resumes.resume_data
ai_analysis_results.*         →  candidate_ai_analysis.*
```

### Key Changes

1. **3 tables → 1 table** for resumes
2. AI analysis is separate (not on resume)
3. One candidate can have multiple resumes
4. Only one can be `is_primary = true`

### Files to Create

```
□ /lib/db/resumes/queries.prisma.ts
□ /lib/db/resumes/queries.supabase.ts
□ /lib/db/resumes/index.ts
□ /lib/db/ai-analysis/queries.prisma.ts
□ /lib/db/ai-analysis/queries.supabase.ts
□ /lib/db/ai-analysis/index.ts
```

### Files to Update - Phase 3

```
□ /app/api/resumes/route.ts
□ /app/api/resumes/[slug]/route.ts
□ /app/api/resumes/upload/route.ts
□ /app/api/resumes/generate/route.ts
□ /app/api/resumes/extract/route.ts
□ /app/api/ai-analysis/route.ts
□ Resume builder pages
□ Resume display components
```

---

## Phase 4: Assessments

### Duration: 2-3 Days

### Old Tables → New Table Mapping

```
OLD                                NEW
───                                ───
disc_personality_sessions.*     →  candidate_disc_assessments.*
disc_personality_stats.*        →  (merged into assessments)
typing_hero_sessions.*          →  candidate_typing_assessments.*
typing_hero_stats.*             →  (merged into assessments)
```

### Key Changes

1. Sessions + Stats merged into single assessments table
2. All historical sessions are preserved
3. "Latest" stats computed from most recent assessment

### Files to Create

```
□ /lib/db/assessments/disc/queries.prisma.ts
□ /lib/db/assessments/disc/queries.supabase.ts
□ /lib/db/assessments/disc/index.ts
□ /lib/db/assessments/typing/queries.prisma.ts
□ /lib/db/assessments/typing/queries.supabase.ts
□ /lib/db/assessments/typing/index.ts
```

### Files to Update - Phase 4

```
□ /app/api/disc/route.ts
□ /app/api/disc/session/route.ts
□ /app/api/disc/submit/route.ts
□ /app/api/disc/results/[id]/route.ts
□ /app/api/typing-hero/route.ts
□ /app/api/typing-hero/session/route.ts
□ /app/api/typing-hero/submit/route.ts
□ /app/api/typing-hero/stats/route.ts
□ DISC test pages
□ Typing Hero game components
□ Results display components
```

---

## Phase 5: Agency & Recruiter

### Duration: 3-4 Days

### Old Tables → New Table Mapping

```
OLD                NEW
───                ───
(none)          →  agencies
(none)          →  agency_profiles
(none)          →  agency_recruiters
members         →  companies + company_profiles + agency_clients
(admin users)   →  bpoc_users + bpoc_profiles
```

### Key Changes

1. `members` was just company names - now full entities
2. Agency ↔ Company relationship via `agency_clients`
3. Recruiters belong to agencies
4. BPOC admins are separate from candidates

### Files to Create

```
□ /lib/db/agencies/queries.prisma.ts (mostly empty - new tables)
□ /lib/db/agencies/queries.supabase.ts
□ /lib/db/agencies/index.ts
□ /lib/db/companies/queries.prisma.ts
□ /lib/db/companies/queries.supabase.ts
□ /lib/db/companies/index.ts
□ /lib/db/recruiters/queries.prisma.ts
□ /lib/db/recruiters/queries.supabase.ts
□ /lib/db/recruiters/index.ts
□ /lib/db/agency-clients/queries.supabase.ts
□ /lib/db/agency-clients/index.ts
```

### Files to Update - Phase 5

```
□ /app/api/agencies/route.ts
□ /app/api/agencies/[id]/route.ts
□ /app/api/companies/route.ts
□ /app/api/companies/[id]/route.ts
□ /app/api/recruiters/route.ts
□ /app/api/recruiters/invite/route.ts
□ Agency dashboard pages
□ Recruiter management pages
□ Client management pages
```

---

## Phase 6: Jobs

### Duration: 3-4 Days

### Old Tables → New Table Mapping

```
OLD                          NEW
───                          ───
job_requests              →  jobs
processed_job_requests    →  jobs (merged)
(skills in array)         →  job_skills (separate table)
```

### Key Changes

1. Jobs link to `agency_clients` not directly to companies
2. Skills are in separate table for better querying
3. No more job_requests vs processed_job_requests split

### Relationship Change

```typescript
// OLD: Job → Company directly
job.company_id → members.company_id

// NEW: Job → AgencyClient → Company
job.agency_client_id → agency_clients.id → companies.id
                                        → agencies.id
```

### Files to Create

```
□ /lib/db/jobs/queries.prisma.ts
□ /lib/db/jobs/queries.supabase.ts  
□ /lib/db/jobs/index.ts
□ /lib/db/job-skills/queries.supabase.ts
□ /lib/db/job-skills/index.ts
```

### Supabase Query with Relations

```typescript
// /lib/db/jobs/queries.supabase.ts
export async function getJobById(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      skills:job_skills(*),
      agency_client:agency_clients(
        *,
        company:companies(*),
        agency:agencies(*)
      ),
      posted_by:agency_recruiters(*)
    `)
    .eq('id', id)
    .single()
  
  return data
}

export async function getJobsForAgency(agencyId: string) {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('jobs')
    .select(`
      *,
      skills:job_skills(*),
      agency_client:agency_clients!inner(
        company:companies(name, logo_url)
      )
    `)
    .eq('agency_client.agency_id', agencyId)
    .order('created_at', { ascending: false })
  
  return data
}
```

### Files to Update - Phase 6

```
□ /app/api/jobs/route.ts
□ /app/api/jobs/[id]/route.ts
□ /app/api/jobs/search/route.ts
□ /app/api/jobs/post/route.ts
□ Job listing pages
□ Job detail pages
□ Job posting forms
□ Job search/filter components
```

---

## Phase 7: Applications Flow

### Duration: 4-5 Days

### Old Tables → New Table Mapping

```
OLD                    NEW
───                    ───
applications        →  job_applications
job_match_results   →  job_matches
(none)              →  job_interviews (NEW)
(none)              →  job_offers (NEW)
```

### Status Mapping

```typescript
const STATUS_MAP: Record<string, string> = {
  // Old status → New status
  'submitted': 'submitted',
  'qualified': 'shortlisted',
  'for verification': 'under_review',
  'verified': 'shortlisted',
  'initial interview': 'interview_scheduled',
  'final interview': 'interviewed',
  'not qualified': 'rejected',
  'passed': 'offer_pending',
  'rejected': 'rejected',
  'withdrawn': 'withdrawn',
  'hired': 'hired',
  'closed': 'rejected',
  'failed': 'rejected',
}
```

### Files to Create

```
□ /lib/db/applications/queries.prisma.ts
□ /lib/db/applications/queries.supabase.ts
□ /lib/db/applications/index.ts
□ /lib/db/matches/queries.prisma.ts
□ /lib/db/matches/queries.supabase.ts
□ /lib/db/matches/index.ts
□ /lib/db/interviews/queries.supabase.ts (NEW - no Prisma)
□ /lib/db/interviews/index.ts
□ /lib/db/offers/queries.supabase.ts (NEW - no Prisma)
□ /lib/db/offers/index.ts
```

### Files to Update - Phase 7

```
□ /app/api/applications/route.ts
□ /app/api/applications/[id]/route.ts
□ /app/api/applications/[id]/status/route.ts
□ /app/api/matches/route.ts
□ /app/api/matches/[jobId]/route.ts
□ /app/api/interviews/route.ts (NEW)
□ /app/api/interviews/[id]/route.ts (NEW)
□ /app/api/offers/route.ts (NEW)
□ /app/api/offers/[id]/route.ts (NEW)
□ Application pages
□ Recruiter application review
□ Interview scheduling
□ Offer management
```

---

## Phase 8: Data Migration

### Duration: 1-2 Days (After all phases complete)

### Order of Migration

```
1. candidates           (from users)
2. candidate_profiles   (from users + user_work_status + privacy_settings)
3. bpoc_users          (from users where admin)
4. agencies            (manual/new)
5. agency_profiles     (manual/new)
6. companies           (from members)
7. company_profiles    (new)
8. agency_clients      (new - link agencies to companies)
9. agency_recruiters   (new)
10. candidate_resumes   (from saved_resumes + resumes_extracted + resumes_generated)
11. candidate_ai_analysis (from ai_analysis_results)
12. candidate_disc_assessments (from disc_personality_sessions)
13. candidate_typing_assessments (from typing_hero_sessions)
14. jobs               (from processed_job_requests)
15. job_skills         (from jobs.skills array)
16. job_matches        (from job_match_results)
17. job_applications   (from applications)
18. job_interviews     (new)
19. job_offers         (new)
```

### Migration Script Location

Create: `/scripts/migrate-data.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function migrateData() {
  console.log('Starting data migration...')
  
  // 1. Migrate candidates
  await migrateCandidates()
  
  // 2. Migrate profiles
  await migrateProfiles()
  
  // ... etc
  
  console.log('Migration complete!')
}

async function migrateCandidates() {
  console.log('Migrating candidates...')
  
  const users = await prisma.users.findMany({
    where: {
      OR: [
        { admin_level: 'user' },
        { admin_level: null }
      ]
    }
  })
  
  for (const user of users) {
    const { error } = await supabaseAdmin
      .from('candidates')
      .upsert({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        username: user.username,
        slug: user.slug,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
    
    if (error) {
      console.error(`Failed to migrate user ${user.id}:`, error.message)
    }
  }
  
  console.log(`Migrated ${users.length} candidates`)
}

// ... more migration functions
```

### Run Migration

```bash
# Test with small batch first
npx ts-node scripts/migrate-data.ts --dry-run

# Run actual migration
npx ts-node scripts/migrate-data.ts

# Verify counts
npx ts-node scripts/verify-migration.ts
```

---

## Phase 9: Cutover & Cleanup

### Duration: 1-2 Days

### Pre-Cutover Checklist

```
□ All feature flags have been TRUE for 24+ hours
□ All tests passing
□ No errors in logs
□ Data counts match between old and new
□ Performance is acceptable
□ Team notified of cutover
□ Backup of both databases taken
```

### Cutover Steps

```bash
# 1. Final data sync
npx ts-node scripts/migrate-data.ts --final

# 2. Verify data
npx ts-node scripts/verify-migration.ts

# 3. Update .env
USE_SUPABASE=true
# Remove individual feature flags (optional)

# 4. Deploy

# 5. Monitor for 24-48 hours
```

### Post-Cutover Cleanup

```bash
# After 1 week of stable operation:

# 1. Remove Prisma
npm uninstall @prisma/client prisma

# 2. Delete old files
rm -rf prisma/
rm -rf lib/db/*/queries.prisma.ts

# 3. Simplify db index files
# Remove feature flag logic, export Supabase directly

# 4. Remove feature flags from .env

# 5. Archive Railway database (keep 30 days)

# 6. Delete Railway database
```

### Files to Delete After Cutover

```
□ /prisma/ (entire directory)
□ /lib/prisma.ts
□ /lib/db/*/queries.prisma.ts (all Prisma query files)
□ Feature flag references in index.ts files
```

### Simplified Index File (After Cutover)

```typescript
// /lib/db/candidates/index.ts

// BEFORE (with feature flags)
import { useSupabase } from '@/lib/config/features'
import * as prisma from './queries.prisma'
import * as supabase from './queries.supabase'

export const getCandidateById = (id: string) =>
  useSupabase('candidates') 
    ? supabase.getCandidateById(id) 
    : prisma.getCandidateById(id)

// AFTER (Supabase only)
export {
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from './queries.supabase'
```

---

## Rollback Procedures

### Instant Rollback (Any Phase)

```bash
# In .env, set the feature flag to false
FEATURE_SUPABASE_CANDIDATES=false

# Restart server
npm run dev
# or redeploy
```

### Full Rollback

```bash
# .env
USE_SUPABASE=false
FEATURE_SUPABASE_AUTH=false
FEATURE_SUPABASE_CANDIDATES=false
FEATURE_SUPABASE_PROFILES=false
FEATURE_SUPABASE_RESUMES=false
FEATURE_SUPABASE_ASSESSMENTS=false
FEATURE_SUPABASE_AGENCIES=false
FEATURE_SUPABASE_JOBS=false
FEATURE_SUPABASE_APPLICATIONS=false

# Restart - 100% back to Railway/Prisma
```

### Data Rollback

If data corruption occurs:

```bash
# 1. Disable Supabase writes
USE_SUPABASE=false

# 2. Restore from Railway backup (it's still running)
# No action needed - data is still there

# 3. If needed, restore Supabase from backup
# Supabase Dashboard → Database → Backups → Restore
```

---

## Testing Checklists

### Phase 1: Auth & Candidates

```
□ Signup - new user created in correct database
□ Login - returns correct user data
□ Logout - clears session
□ Get user by ID - returns correct shape
□ Update user - persists changes
□ Delete user - removes record
```

### Phase 2: Profiles

```
□ Get profile - all fields present
□ Update profile - changes persist
□ Location update - coordinates save
□ Work status update - all fields save
□ Privacy settings - JSON saves correctly
□ Profile completion - calculates correctly
```

### Phase 3: Resumes

```
□ Upload resume - extracts data
□ Generate resume - creates generated_data
□ Save resume - creates record
□ Get resume by slug - returns full data
□ Update resume - changes persist
□ Delete resume - removes record
□ AI analysis - creates analysis record
□ Get analysis - returns correct data
```

### Phase 4: Assessments

```
□ Start DISC session - creates record
□ Submit DISC answers - calculates scores
□ Get DISC results - returns full analysis
□ Start typing session - creates record
□ Submit typing results - saves metrics
□ Get typing stats - returns all data
□ Get latest assessment - returns most recent
```

### Phase 5: Agencies

```
□ Create agency - record created
□ Get agency - returns full data
□ Update agency - changes persist
□ Add recruiter - creates recruiter record
□ Recruiter login - correct permissions
□ Add client - creates agency_client link
□ Get clients - returns linked companies
```

### Phase 6: Jobs

```
□ Create job - linked to agency_client
□ Get job - includes company & agency
□ Update job - changes persist
□ Add skills - creates job_skills
□ Search jobs - filters work correctly
□ Get jobs by agency - returns correct jobs
□ Get jobs by company - returns correct jobs
```

### Phase 7: Applications

```
□ Apply to job - creates application
□ Get applications - returns with job data
□ Update status - changes persist
□ AI matching - creates job_matches
□ Get matches - returns scores
□ Schedule interview - creates record
□ Update interview - changes persist
□ Create offer - creates record
□ Respond to offer - updates status
```

---

## Quick Reference: File Mapping

### API Routes to Update (All Phases)

| Route | Phase | Old Table | New Table |
|-------|-------|-----------|-----------|
| `/api/auth/*` | 1 | users | candidates |
| `/api/users/[id]` | 1 | users | candidates |
| `/api/users/[id]/profile` | 2 | users + user_work_status | candidate_profiles |
| `/api/resumes/*` | 3 | saved_resumes + resumes_* | candidate_resumes |
| `/api/ai-analysis/*` | 3 | ai_analysis_results | candidate_ai_analysis |
| `/api/disc/*` | 4 | disc_personality_* | candidate_disc_assessments |
| `/api/typing-hero/*` | 4 | typing_hero_* | candidate_typing_assessments |
| `/api/agencies/*` | 5 | (new) | agencies |
| `/api/companies/*` | 5 | members | companies |
| `/api/recruiters/*` | 5 | (new) | agency_recruiters |
| `/api/jobs/*` | 6 | job_requests | jobs |
| `/api/applications/*` | 7 | applications | job_applications |
| `/api/matches/*` | 7 | job_match_results | job_matches |
| `/api/interviews/*` | 7 | (new) | job_interviews |
| `/api/offers/*` | 7 | (new) | job_offers |

---

## Summary

### What You're Doing

1. **Setup** - Install Supabase, create clients, set up feature flags
2. **Wrap** - Create Prisma queries that return NEW shape
3. **Create** - Create Supabase queries for each feature
4. **Switch** - Feature flag index files choose which to use
5. **Update** - Change API routes to use new db functions
6. **Test** - Verify each phase works in both modes
7. **Migrate** - Run data migration script
8. **Cutover** - Set all flags to true
9. **Cleanup** - Remove Prisma, simplify code

### Key Principles

- **Never break production** - old system always available
- **One feature at a time** - isolated changes
- **Same shape** - both Prisma and Supabase return identical data
- **Easy rollback** - flip a flag
- **Test everything** - each phase verified before moving on

---

*Good luck with the migration! 🚀*
