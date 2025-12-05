# 🎯 REBUILD PLAN - Candidate Flow

## ✅ KEEP (What's Working)

### 1. Sign Up ✅
- **Location:** `src/components/shared/auth/SignUpForm.tsx`
- **Status:** Working - Creates Supabase auth + candidate record
- **Keep:** Yes - Don't touch

### 2. Resume Builder ✅
- **Location:** `src/app/(public)/resume-builder/`
- **Status:** Working - Full resume builder with templates
- **Keep:** Yes - Don't touch

### 3. Typing Hero Game ✅
- **Location:** `src/app/(public)/career-tools/games/typing-hero/`
- **Status:** Working - Full game with stats
- **Keep:** Yes - Don't touch

### 4. DISC Personality Game ✅
- **Location:** `src/app/(public)/career-tools/games/disc-personality/`
- **Status:** Working - Full assessment with results
- **Keep:** Yes - Don't touch

---

## 🔧 REBUILD (What's Broken/Missing)

### 1. Candidate Dashboard ❌
**Current:** Basic stats, no real flow
**Needs:** Complete dashboard with application tracking

### 2. Complete Candidate Flow ❌
**Missing:** The entire journey from signup to job offer

---

## 🎯 TARGET CANDIDATE FLOW

```
1. SIGN UP ✅ (Keep)
   └─> Creates candidate in Supabase ✅

2. COMPLETE PROFILE ✅ (Keep)
   └─> Profile completion modal ✅

3. BUILD RESUME ✅ (Keep)
   └─> Resume builder works ✅

4. TAKE ASSESSMENTS ✅ (Keep)
   └─> DISC + Typing Hero ✅

5. JOB MATCHING 🔧 (Rebuild)
   └─> Match candidate to jobs
   └─> Show match scores
   └─> Filter by match %

6. APPLY TO JOBS 🔧 (Rebuild)
   └─> One-click apply
   └─> Use resume + profile
   └─> Track application status

7. APPLICATION STATUS 🔧 (Rebuild)
   └─> See all applications
   └─> Status: Applied → Under Review → Interview Requested → Interview Scheduled → Offer Sent → Offer Accepted

8. INTERVIEW MANAGEMENT 🔧 (Build NEW)
   └─> Recruiter sends interview request with times
   └─> Candidate sees request
   └─> Candidate can:
       - Accept suggested time
       - Decline and suggest other times
       - Choose from multiple options
   └─> Once time selected → Locked in
   └─> Calendar integration

9. JOB OFFER 🔧 (Build NEW)
   └─> Recruiter sends offer via API
   └─> Candidate sees offer
   └─> Candidate can:
       - Accept offer
       - Decline offer
       - Request changes
   └─> Once accepted → Journey ends ✅

10. DASHBOARD 🔧 (Rebuild)
    └─> Show all of above in one place
    └─> Application timeline
    └─> Interview calendar
    └─> Offer notifications
```

---

## 📋 REBUILD CHECKLIST

### Phase 1: Fix Dashboard
- [ ] Rebuild candidate dashboard with proper stats
- [ ] Show application count
- [ ] Show interview requests
- [ ] Show pending offers
- [ ] Quick actions to key features

### Phase 2: Job Matching (Rebuild)
- [ ] Match algorithm using Supabase
- [ ] Show match scores
- [ ] Filter jobs by match %
- [ ] One-click apply

### Phase 3: Application Tracking (Rebuild)
- [ ] Application list page
- [ ] Application detail page
- [ ] Status tracking
- [ ] Timeline view

### Phase 4: Interview Management (Build NEW)
- [ ] Interview request page
- [ ] Time selection interface
- [ ] Accept/decline with alternatives
- [ ] Calendar integration
- [ ] Lock-in confirmation

### Phase 5: Job Offers (Build NEW)
- [ ] Offer notification
- [ ] Offer detail page
- [ ] Accept/decline offer
- [ ] Journey completion

### Phase 6: APIs (Build NEW)
- [ ] `/api/candidate/applications` - Get all applications
- [ ] `/api/candidate/applications/[id]` - Get application details
- [ ] `/api/candidate/interviews` - Get interview requests
- [ ] `/api/candidate/interviews/[id]/respond` - Respond to interview
- [ ] `/api/candidate/offers` - Get job offers
- [ ] `/api/candidate/offers/[id]/respond` - Accept/decline offer

---

## 🗂️ NEW FILE STRUCTURE

```
src/app/(candidate)/
├── dashboard/
│   └── page.tsx (REBUILD - Complete dashboard)
├── jobs/
│   └── page.tsx (REBUILD - Job matching with apply)
├── applications/
│   ├── page.tsx (REBUILD - Application list)
│   └── [id]/
│       └── page.tsx (NEW - Application detail)
├── interviews/
│   ├── page.tsx (NEW - Interview requests)
│   └── [id]/
│       └── page.tsx (NEW - Interview time selection)
└── offers/
    ├── page.tsx (NEW - Job offers list)
    └── [id]/
        └── page.tsx (NEW - Offer detail & accept)

src/app/api/candidate/
├── applications/
│   ├── route.ts (NEW - Get all applications)
│   └── [id]/
│       └── route.ts (NEW - Get application details)
├── interviews/
│   ├── route.ts (NEW - Get interview requests)
│   └── [id]/
│       └── respond/
│           └── route.ts (NEW - Respond to interview)
└── offers/
    ├── route.ts (NEW - Get job offers)
    └── [id]/
        └── respond/
            └── route.ts (NEW - Accept/decline offer)
```

---

## 🎨 DATABASE SCHEMA (Already Exists)

✅ `candidates` - Candidate records
✅ `candidate_profiles` - Profile data
✅ `candidate_resumes` - Resumes
✅ `jobs` - Job postings
✅ `job_applications` - Applications
✅ `job_interviews` - Interview scheduling
✅ `job_offers` - Job offers

**All tables exist in Supabase - just need to use them!**

---

## 🚀 PRIORITY ORDER

1. **Dashboard** - Make it useful
2. **Job Matching** - Fix matching + apply
3. **Application Tracking** - Show status
4. **Interview Management** - NEW feature
5. **Job Offers** - NEW feature

---

## ✅ WHAT TO KEEP INTACT

- Sign Up flow
- Resume Builder
- Typing Hero
- DISC Personality
- All game APIs
- All resume APIs
- Auth system

**DON'T TOUCH THESE - THEY WORK!**

