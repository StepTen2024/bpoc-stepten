# Complete Supabase Migration Plan
## Remove ALL Railway Dependencies - Everything Goes to Supabase

## Migration Strategy

### Phase 1: Create Supabase Abstraction Layers ✅ (In Progress)
- [x] `candidates` - DONE
- [x] `candidate_profiles` - DONE  
- [ ] `candidate_resumes` - TODO
- [ ] `candidate_ai_analysis` - TODO
- [ ] `job_applications` - TODO
- [ ] `jobs` - TODO
- [ ] `job_matches` - TODO
- [ ] `companies` - TODO
- [ ] `agencies` - TODO
- [ ] `agency_recruiters` - TODO
- [ ] Game assessments (DISC, typing-hero, etc.) - TODO

### Phase 2: Update API Routes by Category

#### User Routes (Priority 1)
- [x] `/api/user/sync` - DONE
- [x] `/api/user/profile` - DONE
- [ ] `/api/user/update-profile` - TODO
- [ ] `/api/user/work-status` - TODO
- [ ] `/api/user/update-work-status` - TODO
- [ ] `/api/user/saved-resumes` - TODO
- [ ] `/api/user/resumes-generated` - TODO
- [ ] `/api/user/applications` - TODO
- [ ] `/api/user/job-matches-count` - TODO
- [ ] `/api/user/games-count` - TODO
- [ ] `/api/user/extracted-resume` - TODO
- [ ] `/api/user/check-username` - TODO
- [ ] `/api/user/analysis-results` - TODO

#### Resume Routes (Priority 2)
- [ ] `/api/save-resume` - TODO
- [ ] `/api/save-resume-to-profile` - TODO
- [ ] `/api/save-generated-resume` - TODO
- [ ] `/api/analyze-resume` - TODO
- [ ] `/api/get-saved-resume/[slug]` - TODO

#### Job Routes (Priority 3)
- [ ] `/api/jobs/active` - TODO
- [ ] `/api/jobs/match` - TODO
- [ ] `/api/jobs/combined` - TODO
- [ ] `/api/public/jobs` - TODO

#### Application Routes (Priority 4)
- [ ] `/api/applications` - TODO
- [ ] `/api/applications/[id]/withdraw` - TODO
- [ ] `/api/recruiter/applicants` - TODO

#### Recruiter Routes (Priority 5)
- [ ] `/api/recruiter/jobs` - TODO
- [ ] `/api/recruiter/candidates` - TODO
- [ ] `/api/recruiter/applicants` - TODO
- [ ] `/api/recruiter/signup` - TODO

#### Admin Routes (Priority 6)
- [ ] `/api/admin/users` - TODO
- [ ] `/api/admin/jobs` - TODO
- [ ] `/api/admin/resumes` - TODO
- [ ] `/api/admin/dashboard-stats` - TODO

#### Game Routes (Priority 7)
- [ ] `/api/games/disc/session` - TODO
- [ ] `/api/games/typing-hero/session` - TODO
- [ ] `/api/games/ultimate/session` - TODO
- [ ] `/api/games/bpoc-cultural/session` - TODO

### Phase 3: Remove Railway Dependencies
- [ ] Remove `src/lib/database.ts` (pool)
- [ ] Remove `prismaRailway` imports
- [ ] Remove `DATABASE_URL` env var usage
- [ ] Update all direct SQL queries to Supabase

## Supabase Tables Reference

### Core Tables
- `candidates` - User basic info
- `candidate_profiles` - Extended profile
- `candidate_resumes` - Resume data
- `candidate_ai_analysis` - AI analysis results
- `candidate_skills` - Skills
- `candidate_educations` - Education
- `candidate_work_experiences` - Work experience

### Job Tables
- `jobs` - Job postings
- `job_applications` - Applications
- `job_matches` - Job matches
- `companies` - Companies
- `agencies` - Agencies
- `agency_recruiters` - Recruiters
- `agency_clients` - Agency clients

### Game Tables
- `candidate_disc_assessments` - DISC results
- `candidate_typing_assessments` - Typing hero results
- `candidate_ultimate_assessments` - Ultimate game results
- `candidate_cultural_assessments` - Cultural game results

## Migration Pattern

For each route:
1. Replace `pool.query()` with Supabase client
2. Replace `prismaRailway` with Supabase queries
3. Update table names (e.g., `users` → `candidates`)
4. Update column names to match Supabase schema
5. Test route functionality


