# 🔍 Migration Gaps Analysis - End-to-End Process Review

## Critical Missing Tables

### 1. ❌ `privacy_settings` - **MISSING**
**Used in:**
- `/api/public/user-by-slug` (line 31)
- Frontend expects privacy settings for profile visibility

**Current Status:**
- Route tries to query `privacy_settings` table
- Falls back to default values if not found
- **GAP**: Table doesn't exist in Supabase schema

**Solution:**
- Privacy settings are stored in `candidate_profiles.privacy_settings` JSONB column
- Need to update route to read from `candidate_profiles.privacy_settings` instead

---

### 2. ❌ `resumes_generated` - **MISSING**
**Used in:**
- `/api/user/resumes-generated` (GET & DELETE)
- `/api/save-generated-resume` (creates records)
- `/api/save-resume-to-profile` (queries table)

**Current Status:**
- Routes have error handling for missing table
- Returns `hasGeneratedResume: false` if table doesn't exist
- **GAP**: Table doesn't exist in Supabase schema

**Solution Options:**
- Option A: Create `resumes_generated` table in Supabase
- Option B: Store in `candidate_resumes` with a flag/type field
- Option C: Use `candidate_resumes` and add `generation_metadata` JSONB field

---

### 3. ⚠️ `ai_analysis_results` vs `candidate_ai_analysis` - **NAME MISMATCH**
**Used in:**
- `/api/user/analysis-results` (queries `ai_analysis_results`)
- `/api/analyze-resume` (inserts into `ai_analysis_results`)
- Multiple other routes reference `ai_analysis_results`

**Current Status:**
- Supabase schema has `candidate_ai_analysis` table
- Routes reference `ai_analysis_results` (old Railway name)
- **GAP**: Table name mismatch

**Solution:**
- Update all routes to use `candidate_ai_analysis` instead of `ai_analysis_results`
- Or create alias/view in Supabase

---

### 4. ❌ `user_leaderboard_scores` - **MISSING**
**Used in:**
- `/api/leaderboards` (main leaderboard query)
- `/api/leaderboards/user/[id]` (user breakdown)
- `/api/talent-search` (joins with leaderboard scores)

**Current Status:**
- Table doesn't exist in Supabase schema
- Leaderboard data should be computed from:
  - `candidate_profiles.gamification` (total_xp, tier, badges)
  - `candidate_disc_assessments` (DISC scores)
  - `candidate_typing_assessments` (typing scores)
  - `candidate_profiles.profile_completion_percentage`
  - `job_applications` count (application activity)

**Solution:**
- Create materialized view or computed table
- Or compute on-the-fly from source tables

---

## Column Mapping Gaps

### 1. `candidate_profiles` Column Mappings

**Missing/Incorrect Mappings:**

| Railway Column | Supabase Column | Status | Notes |
|---------------|-----------------|--------|-------|
| `current_mood` | ❌ Missing | **GAP** | Used in work status updates |
| `expected_salary` | `expected_salary_min` / `expected_salary_max` | ⚠️ Split | Need to handle both |
| `minimum_salary_range` | `expected_salary_min` | ⚠️ Mapped | OK |
| `maximum_salary_range` | `expected_salary_max` | ⚠️ Mapped | OK |
| `work_setup` | `preferred_work_setup` | ⚠️ Name change | Need to map enum |

**Routes Affected:**
- `/api/user/update-work-status` - tries to set `current_mood`
- `/api/user/work-status` - reads `current_mood`
- `/api/public/user-by-slug` - reads `current_mood`

---

### 2. `candidate_resumes` Column Gaps

**Missing Columns:**

| Column | Status | Used In |
|--------|--------|---------|
| `slug` | ✅ Exists | Resume viewing by slug |
| `is_primary` | ✅ Exists | Primary resume flag |
| `is_public` | ✅ Exists | Public visibility |
| `original_filename` | ✅ Exists | File tracking |
| `resume_data` | ✅ Exists | JSONB resume content |

**Gap Found:**
- Routes use `candidate_resumes` correctly ✅
- No major gaps here

---

### 3. `job_applications` Column Gaps

**Missing Columns:**

| Column | Status | Notes |
|--------|--------|-------|
| `resume_id` | ✅ Exists | Links to resume |
| `status` | ✅ Exists | Application status enum |
| `cover_letter` | ❌ Missing | **GAP** - Used in recruiter routes |
| `notes` | ❌ Missing | **GAP** - Used in recruiter routes |

**Routes Affected:**
- `/api/recruiter/applicants` - tries to read `cover_letter` and `notes`
- Currently returns `null` for these fields

---

## Data Flow Gaps

### 1. Signup → Profile Creation Flow

**Current Flow:**
1. ✅ User signs up → `auth.users` (Supabase Auth)
2. ✅ `/api/user/sync` → Creates `candidates` + `candidate_profiles`
3. ✅ Profile data saved correctly

**Gaps:**
- ❌ Privacy settings not initialized (should use defaults from schema)
- ❌ Gamification not initialized (should set initial values)

---

### 2. Resume Analysis Flow

**Current Flow:**
1. ✅ `/api/analyze-resume` → Tries to save to `ai_analysis_results`
2. ❌ Table name mismatch (`ai_analysis_results` vs `candidate_ai_analysis`)
3. ✅ `/api/user/analysis-results` → Tries to read from `ai_analysis_results`

**Gaps:**
- ❌ Table name mismatch prevents saving/reading
- Need to update all references

---

### 3. Resume Generation Flow

**Current Flow:**
1. ✅ User generates resume → Frontend stores locally
2. ❌ `/api/save-generated-resume` → Tries to save to `resumes_generated`
3. ❌ Table doesn't exist

**Gaps:**
- ❌ Generated resumes not persisted
- Need to decide: new table or use `candidate_resumes`?

---

### 4. Leaderboard Flow

**Current Flow:**
1. ❌ `/api/leaderboards` → Queries `user_leaderboard_scores`
2. ❌ Table doesn't exist
3. ✅ Data exists in `candidate_profiles.gamification` JSONB

**Gaps:**
- ❌ Leaderboards completely broken
- Need to compute from source tables or create view

---

## Priority Fix List

### 🔴 Critical (Breaks Core Functionality)

1. **Fix `ai_analysis_results` → `candidate_ai_analysis`**
   - Update `/api/user/analysis-results`
   - Update `/api/analyze-resume`
   - Update all other references

2. **Add `current_mood` to `candidate_profiles`**
   - Add column to schema
   - Update migration
   - Or map to existing field

3. **Fix `privacy_settings` table reference**
   - Update `/api/public/user-by-slug` to read from `candidate_profiles.privacy_settings`

### 🟡 High Priority (Affects Features)

4. **Create `resumes_generated` table OR migrate to `candidate_resumes`**
   - Decide on approach
   - Update routes accordingly

5. **Add `cover_letter` and `notes` to `job_applications`**
   - Add columns to schema
   - Update migration

6. **Create leaderboard computation**
   - Create materialized view OR
   - Compute on-the-fly from source tables

### 🟢 Medium Priority (Nice to Have)

7. **Initialize privacy_settings on profile creation**
8. **Initialize gamification on profile creation**
9. **Add missing enum mappings for work_setup**

---

## Quick Fixes Needed

### Fix 1: Update `ai_analysis_results` references
```typescript
// BEFORE
.from('ai_analysis_results')

// AFTER  
.from('candidate_ai_analysis')
```

### Fix 2: Update privacy_settings read
```typescript
// BEFORE
.from('privacy_settings')
.eq('candidate_id', candidate.id)

// AFTER
const profile = await getProfileByCandidate(candidate.id)
const privacySettings = profile?.privacy_settings || defaultPrivacySettings
```

### Fix 3: Add current_mood column
```sql
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS current_mood TEXT 
CHECK (current_mood IN ('Happy', 'Satisfied', 'Sad', 'Undecided'));
```

### Fix 4: Add job_applications columns
```sql
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;
```

---

## Summary

**Total Gaps Found: 7**
- ❌ Missing Tables: 3 (`privacy_settings`, `resumes_generated`, `user_leaderboard_scores`)
- ⚠️ Name Mismatches: 1 (`ai_analysis_results` vs `candidate_ai_analysis`)
- ❌ Missing Columns: 3 (`current_mood`, `cover_letter`, `notes`)

**Impact:**
- 🔴 Critical: Resume analysis broken
- 🔴 Critical: Privacy settings not working
- 🟡 High: Generated resumes not saved
- 🟡 High: Leaderboards broken
- 🟡 High: Recruiter notes/cover letters missing


