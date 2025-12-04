# BPOC Migration Plan (UPDATED)
## Supabase Auth + Railway → Full Supabase with Prisma

---

## Your Actual Setup

```
CURRENT STATE
─────────────

┌─────────────────────────────────────────────────────────┐
│                     SUPABASE                            │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │              AUTH ✅                             │  │
│   │   auth.users (all users already here!)          │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   Data Tables: EMPTY                                    │
│   Storage: Maybe some files?                           │
│                                                         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ users.id = auth.users.id
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      RAILWAY                            │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │              PRISMA + POSTGRES                   │  │
│   │                                                  │  │
│   │   users, applications, job_requests,            │  │
│   │   saved_resumes, disc_personality_sessions,     │  │
│   │   typing_hero_sessions, members, etc...         │  │
│   │                                                  │  │
│   │   users.id references Supabase auth.users.id    │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘


TARGET STATE
────────────

┌─────────────────────────────────────────────────────────┐
│                     SUPABASE                            │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │              AUTH ✅ (unchanged)                 │  │
│   │   auth.users                                     │  │
│   └──────────────────────┬──────────────────────────┘  │
│                          │                              │
│                          │ FK reference                 │
│                          ▼                              │
│   ┌─────────────────────────────────────────────────┐  │
│   │           NEW CLEAN TABLES                       │  │
│   │                                                  │  │
│   │   candidates ──────► candidate_profiles          │  │
│   │       │                                          │  │
│   │       ├────────────► candidate_resumes           │  │
│   │       ├────────────► candidate_disc_assessments  │  │
│   │       ├────────────► candidate_typing_assessments│  │
│   │       └────────────► job_applications            │  │
│   │                            │                     │  │
│   │   agencies ──► agency_recruiters                 │  │
│   │       │                                          │  │
│   │       └──────► agency_clients ──► companies      │  │
│   │                     │                            │  │
│   │                     └──────────► jobs            │  │
│   │                                                  │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   Storage: Resumes, Avatars, etc.                      │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      RAILWAY                            │
│                                                         │
│                    🗑️ DELETED                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## What This Means

### ✅ No Auth Migration Needed
- All users already in Supabase `auth.users`
- No password re-hashing
- No email re-verification
- Sessions keep working

### ✅ User IDs Already Aligned
- Railway `users.id` = Supabase `auth.users.id`
- Foreign keys will work perfectly
- No ID remapping needed

### What We Actually Do
1. Create new tables in Supabase
2. Export data from Railway
3. Transform data (old shape → new shape)
4. Import into Supabase
5. Update Prisma to point to Supabase
6. Update code for new table/field names
7. Delete Railway

---

## Table of Contents

1. [Phase 1: Setup Supabase](#phase-1-setup-supabase)
2. [Phase 2: Create New Tables](#phase-2-create-new-tables)
3. [Phase 3: Export Railway Data](#phase-3-export-railway-data)
4. [Phase 4: Transform & Import Data](#phase-4-transform--import-data)
5. [Phase 5: Update Prisma Schema](#phase-5-update-prisma-schema)
6. [Phase 6: Update Code](#phase-6-update-code)
7. [Phase 7: Testing](#phase-7-testing)
8. [Phase 8: Cutover](#phase-8-cutover)
9. [Phase 9: Cleanup](#phase-9-cleanup)
10. [Rollback Plan](#rollback-plan)
11. [What Could Go Wrong](#what-could-go-wrong)

---

## Phase 1: Setup Supabase

### Duration: 30 minutes

### Step 1.1: Get Supabase Connection Strings

Go to: **Supabase Dashboard → Settings → Database**

You need TWO connection strings:

```env
# For Prisma (connection pooler - port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# For migrations (direct connection - port 5432)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### Step 1.2: Update Local Environment

```env
# .env.local

# OLD - Railway (keep for now, will use for export)
RAILWAY_DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"

# NEW - Supabase
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Supabase (already have these)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Step 1.3: Verify Supabase Auth Users Exist

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM auth.users;
-- Should show your existing user count

-- Verify some IDs match what's in Railway
SELECT id, email, created_at FROM auth.users LIMIT 5;
```

---

## Phase 2: Create New Tables

### Duration: 1-2 hours

### Step 2.1: Run Table Creation SQL

Use the SQL from `BPOC_Database_Migration_Schema.md` to create all tables.

**Run in Supabase SQL Editor in this order:**

```sql
-- 1. Helper function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Core entities (in order due to FK dependencies)
-- candidates
-- bpoc_users
-- agencies
-- companies

-- 3. Profiles
-- candidate_profiles
-- bpoc_profiles
-- agency_profiles
-- company_profiles

-- 4. Relationships
-- agency_recruiters
-- agency_clients

-- 5. Candidate data
-- candidate_resumes
-- candidate_ai_analysis
-- candidate_skills
-- candidate_educations
-- candidate_work_experiences
-- candidate_disc_assessments
-- candidate_typing_assessments

-- 6. Jobs
-- jobs
-- job_skills

-- 7. Applications
-- job_matches
-- job_applications
-- job_interviews
-- job_offers
```

### Step 2.2: Verify Tables Created

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables (23):**
```
agencies
agency_clients
agency_profiles
agency_recruiters
bpoc_profiles
bpoc_users
candidate_ai_analysis
candidate_disc_assessments
candidate_educations
candidate_profiles
candidate_resumes
candidate_skills
candidate_typing_assessments
candidate_work_experiences
candidates
companies
company_profiles
job_applications
job_interviews
job_matches
job_offers
job_skills
jobs
```

---

## Phase 3: Export Railway Data

### Duration: 30 minutes - 1 hour

### Step 3.1: Create Export Script

Create file: `/scripts/export-railway.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.RAILWAY_DATABASE_URL
    }
  }
});

async function exportData() {
  console.log('Starting Railway data export...');
  
  const exportDir = './migration-data';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  // Export each table
  const tables = [
    { name: 'users', query: () => prisma.users.findMany() },
    { name: 'members', query: () => prisma.members.findMany() },
    { name: 'user_work_status', query: () => prisma.user_work_status.findMany() },
    { name: 'privacy_settings', query: () => prisma.privacy_settings.findMany() },
    { name: 'user_leaderboard_scores', query: () => prisma.user_leaderboard_scores.findMany() },
    { name: 'resumes_extracted', query: () => prisma.resumes_extracted.findMany() },
    { name: 'resumes_generated', query: () => prisma.resumes_generated.findMany() },
    { name: 'saved_resumes', query: () => prisma.saved_resumes.findMany() },
    { name: 'ai_analysis_results', query: () => prisma.ai_analysis_results.findMany() },
    { name: 'disc_personality_sessions', query: () => prisma.disc_personality_sessions.findMany() },
    { name: 'disc_personality_stats', query: () => prisma.disc_personality_stats.findMany() },
    { name: 'typing_hero_sessions', query: () => prisma.typing_hero_sessions.findMany() },
    { name: 'typing_hero_stats', query: () => prisma.typing_hero_stats.findMany() },
    { name: 'job_requests', query: () => prisma.job_requests.findMany() },
    { name: 'processed_job_requests', query: () => prisma.processed_job_requests.findMany() },
    { name: 'applications', query: () => prisma.applications.findMany() },
    { name: 'job_match_results', query: () => prisma.job_match_results.findMany() },
    { name: 'agencies', query: () => prisma.agencies?.findMany() },
  ];

  for (const table of tables) {
    try {
      console.log(`Exporting ${table.name}...`);
      const data = await table.query();
      fs.writeFileSync(
        `${exportDir}/${table.name}.json`,
        JSON.stringify(data, null, 2)
      );
      console.log(`  ✓ ${data.length} records`);
    } catch (error) {
      console.log(`  ✗ ${table.name} not found or error:`, error.message);
    }
  }

  console.log('\nExport complete! Files saved to ./migration-data/');
  await prisma.$disconnect();
}

exportData().catch(console.error);
```

### Step 3.2: Run Export

```bash
# Make sure RAILWAY_DATABASE_URL is set
npx ts-node scripts/export-railway.ts
```

### Step 3.3: Verify Export

```bash
# Check files created
ls -la migration-data/

# Check record counts
for f in migration-data/*.json; do
  echo "$f: $(cat $f | jq length) records"
done
```

---

## Phase 4: Transform & Import Data

### Duration: 2-4 hours

### Step 4.1: Create Import Script

Create file: `/scripts/import-supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin access
);

function loadJson(filename: string) {
  try {
    const data = fs.readFileSync(`./migration-data/${filename}.json`, 'utf8');
    return JSON.parse(data);
  } catch {
    console.log(`  ⚠ ${filename}.json not found, skipping`);
    return [];
  }
}

async function importData() {
  console.log('Starting Supabase import...\n');

  // ============================================
  // 1. CANDIDATES (from users)
  // ============================================
  console.log('1. Importing candidates...');
  const users = loadJson('users');
  
  // Filter to non-admin users only
  const candidateUsers = users.filter((u: any) => 
    !u.admin_level || u.admin_level === 'user'
  );

  for (const user of candidateUsers) {
    const { error } = await supabase.from('candidates').upsert({
      id: user.id, // Same as auth.users.id ✓
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      username: user.username,
      slug: user.slug,
      is_active: true,
      email_verified: true, // They're in auth.users, so verified
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
    
    if (error) console.log(`  ✗ Candidate ${user.id}:`, error.message);
  }
  console.log(`  ✓ ${candidateUsers.length} candidates imported\n`);

  // ============================================
  // 2. BPOC USERS (admin users)
  // ============================================
  console.log('2. Importing BPOC users...');
  const adminUsers = users.filter((u: any) => 
    u.admin_level && u.admin_level !== 'user'
  );

  for (const user of adminUsers) {
    const { error } = await supabase.from('bpoc_users').upsert({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.admin_level === 'super' ? 'super_admin' : 'admin',
      is_active: true,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
    
    if (error) console.log(`  ✗ BPOC user ${user.id}:`, error.message);
  }
  console.log(`  ✓ ${adminUsers.length} BPOC users imported\n`);

  // ============================================
  // 3. COMPANIES (from members)
  // ============================================
  console.log('3. Importing companies...');
  const members = loadJson('members');
  const companyIdMap = new Map(); // old company_id -> new company_id

  for (const member of members) {
    const { data, error } = await supabase.from('companies').upsert({
      id: member.company_id, // Keep same ID if UUID
      name: member.company,
      slug: member.company.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      is_active: true,
      created_at: member.created_at,
      updated_at: member.updated_at,
    }).select().single();
    
    if (error) {
      console.log(`  ✗ Company ${member.company}:`, error.message);
    } else {
      companyIdMap.set(member.company_id, data.id);
    }
  }
  console.log(`  ✓ ${members.length} companies imported\n`);

  // ============================================
  // 4. CANDIDATE PROFILES
  // ============================================
  console.log('4. Importing candidate profiles...');
  const workStatuses = loadJson('user_work_status');
  const privacySettings = loadJson('privacy_settings');
  const leaderboardScores = loadJson('user_leaderboard_scores');

  // Create lookup maps
  const workStatusMap = new Map(workStatuses.map((w: any) => [w.user_id, w]));
  const privacyMap = new Map(privacySettings.map((p: any) => [p.user_id, p]));
  const leaderboardMap = new Map(leaderboardScores.map((l: any) => [l.user_id, l]));

  for (const user of candidateUsers) {
    const ws = workStatusMap.get(user.id);
    const ps = privacyMap.get(user.id);
    const lb = leaderboardMap.get(user.id);

    const { error } = await supabase.from('candidate_profiles').upsert({
      candidate_id: user.id,
      bio: user.bio,
      position: user.position,
      birthday: user.birthday,
      gender: user.gender,
      gender_custom: user.gender_custom,
      location: user.location,
      location_place_id: user.location_place_id,
      location_lat: user.location_lat,
      location_lng: user.location_lng,
      location_city: user.location_city,
      location_province: user.location_province,
      location_country: user.location_country,
      location_barangay: user.location_barangay,
      location_region: user.location_region,
      // From user_work_status
      work_status: ws?.work_status || ws?.work_status_new,
      current_employer: ws?.current_employer,
      current_position: ws?.current_position,
      current_salary: ws?.current_salary ? Number(ws.current_salary) : null,
      expected_salary_min: ws?.minimum_salary_range ? Number(ws.minimum_salary_range) : null,
      expected_salary_max: ws?.maximum_salary_range ? Number(ws.maximum_salary_range) : null,
      notice_period_days: ws?.notice_period_days,
      preferred_shift: ws?.preferred_shift,
      preferred_work_setup: mapWorkSetup(ws?.work_setup),
      // From privacy_settings (as JSON)
      privacy_settings: ps ? {
        username: ps.username || 'public',
        first_name: ps.first_name || 'public',
        last_name: ps.last_name || 'only-me',
        location: ps.location || 'public',
        job_title: ps.job_title || 'public',
        birthday: ps.birthday || 'only-me',
        resume_score: ps.resume_score || 'public',
        key_strengths: ps.key_strengths || 'only-me',
      } : {},
      // From leaderboard (as JSON)
      gamification: lb ? {
        total_xp: lb.overall_score || 0,
        tier: lb.tier || 'Bronze',
        rank_position: lb.rank_position || 0,
        typing_hero_score: lb.typing_hero_score || 0,
        disc_personality_score: lb.disc_personality_score || 0,
      } : { total_xp: 0, tier: 'Bronze', rank_position: 0 },
      profile_completed: user.completed_data || false,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });

    if (error) console.log(`  ✗ Profile ${user.id}:`, error.message);
  }
  console.log(`  ✓ ${candidateUsers.length} profiles imported\n`);

  // ============================================
  // 5. CANDIDATE RESUMES (from 3 tables)
  // ============================================
  console.log('5. Importing candidate resumes...');
  const savedResumes = loadJson('saved_resumes');
  const resumesExtracted = loadJson('resumes_extracted');
  const resumesGenerated = loadJson('resumes_generated');

  // Create lookup maps
  const extractedMap = new Map(resumesExtracted.map((r: any) => [r.user_id, r]));
  const generatedMap = new Map(resumesGenerated.map((r: any) => [r.user_id, r]));

  for (const resume of savedResumes) {
    const extracted = extractedMap.get(resume.user_id);
    const generated = generatedMap.get(resume.user_id);

    const { error } = await supabase.from('candidate_resumes').upsert({
      id: resume.id,
      candidate_id: resume.user_id,
      slug: resume.resume_slug,
      title: resume.resume_title,
      extracted_data: extracted?.resume_data,
      generated_data: generated?.generated_resume_data,
      resume_data: resume.resume_data,
      original_filename: extracted?.original_filename,
      template_used: resume.template_used,
      is_primary: true, // Mark first as primary
      is_public: resume.is_public ?? true,
      view_count: resume.view_count || 0,
      generation_metadata: generated?.generation_metadata,
      created_at: resume.created_at,
      updated_at: resume.updated_at,
    });

    if (error) console.log(`  ✗ Resume ${resume.id}:`, error.message);
  }
  console.log(`  ✓ ${savedResumes.length} resumes imported\n`);

  // ============================================
  // 6. CANDIDATE AI ANALYSIS
  // ============================================
  console.log('6. Importing AI analysis...');
  const aiResults = loadJson('ai_analysis_results');

  for (const ai of aiResults) {
    const { error } = await supabase.from('candidate_ai_analysis').upsert({
      id: ai.id,
      candidate_id: ai.user_id,
      session_id: ai.session_id,
      overall_score: ai.overall_score,
      ats_compatibility_score: ai.ats_compatibility_score,
      content_quality_score: ai.content_quality_score,
      professional_presentation_score: ai.professional_presentation_score,
      skills_alignment_score: ai.skills_alignment_score,
      key_strengths: ai.key_strengths,
      strengths_analysis: ai.strengths_analysis,
      improvements: ai.improvements,
      recommendations: ai.recommendations,
      section_analysis: ai.section_analysis,
      improved_summary: ai.improved_summary,
      salary_analysis: ai.salary_analysis,
      career_path: ai.career_path,
      candidate_profile_snapshot: ai.candidate_profile,
      skills_snapshot: ai.skills_snapshot,
      experience_snapshot: ai.experience_snapshot,
      education_snapshot: ai.education_snapshot,
      analysis_metadata: ai.analysis_metadata,
      portfolio_links: ai.portfolio_links,
      files_analyzed: ai.files_analyzed,
      created_at: ai.created_at,
      updated_at: ai.updated_at,
    });

    if (error) console.log(`  ✗ AI Analysis ${ai.id}:`, error.message);
  }
  console.log(`  ✓ ${aiResults.length} AI analyses imported\n`);

  // ============================================
  // 7. DISC ASSESSMENTS
  // ============================================
  console.log('7. Importing DISC assessments...');
  const discSessions = loadJson('disc_personality_sessions');
  const discStats = loadJson('disc_personality_stats');
  const discStatsMap = new Map(discStats.map((d: any) => [d.user_id, d]));

  for (const session of discSessions) {
    const stats = discStatsMap.get(session.user_id);

    const { error } = await supabase.from('candidate_disc_assessments').upsert({
      id: session.id,
      candidate_id: session.user_id,
      session_status: session.session_status || 'completed',
      started_at: session.started_at,
      finished_at: session.finished_at,
      duration_seconds: session.duration_seconds,
      total_questions: session.total_questions || 30,
      d_score: session.d_score || 0,
      i_score: session.i_score || 0,
      s_score: session.s_score || 0,
      c_score: session.c_score || 0,
      primary_type: session.primary_type,
      secondary_type: session.secondary_type,
      confidence_score: session.confidence_score || 0,
      consistency_index: session.consistency_index,
      cultural_alignment: session.cultural_alignment || 95,
      authenticity_score: stats?.authenticity_score,
      ai_assessment: session.ai_assessment || {},
      ai_bpo_roles: session.ai_bpo_roles || [],
      core_responses: session.core_responses || [],
      personalized_responses: session.personalized_responses || [],
      response_patterns: session.response_patterns || {},
      user_position: session.user_position,
      user_location: session.user_location,
      user_experience: session.user_experience,
      xp_earned: stats?.latest_session_xp || 0,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });

    if (error) console.log(`  ✗ DISC ${session.id}:`, error.message);
  }
  console.log(`  ✓ ${discSessions.length} DISC assessments imported\n`);

  // ============================================
  // 8. TYPING ASSESSMENTS
  // ============================================
  console.log('8. Importing Typing assessments...');
  const typingSessions = loadJson('typing_hero_sessions');
  const typingStats = loadJson('typing_hero_stats');
  const typingStatsMap = new Map(typingStats.map((t: any) => [t.user_id, t]));

  for (const session of typingSessions) {
    const stats = typingStatsMap.get(session.user_id);

    const { error } = await supabase.from('candidate_typing_assessments').upsert({
      id: session.id,
      candidate_id: session.user_id,
      session_status: session.session_status || 'completed',
      difficulty_level: session.difficulty_level || 'rockstar',
      elapsed_time: session.elapsed_time || 0,
      score: session.score || 0,
      wpm: session.wpm || 0,
      overall_accuracy: session.overall_accuracy || 0,
      longest_streak: session.longest_streak || 0,
      correct_words: session.correct_words || 0,
      wrong_words: session.wrong_words || 0,
      words_correct: session.words_correct || [],
      words_incorrect: session.words_incorrect || [],
      ai_analysis: session.ai_analysis || {},
      vocabulary_strengths: stats?.vocabulary_strengths || [],
      vocabulary_weaknesses: stats?.vocabulary_weaknesses || [],
      generated_story: stats?.generated_story,
      created_at: session.created_at,
      updated_at: session.updated_at,
    });

    if (error) console.log(`  ✗ Typing ${session.id}:`, error.message);
  }
  console.log(`  ✓ ${typingSessions.length} Typing assessments imported\n`);

  // ============================================
  // 9. AGENCIES (if exists, otherwise create default)
  // ============================================
  console.log('9. Setting up agencies...');
  
  // Create your default agency (ShoreAgents)
  const { data: agency, error: agencyError } = await supabase.from('agencies').upsert({
    name: 'ShoreAgents',
    slug: 'shoreagents',
    is_active: true,
    api_enabled: false,
  }).select().single();

  if (agencyError) {
    console.log('  ✗ Agency error:', agencyError.message);
  } else {
    console.log('  ✓ Agency created/updated\n');
  }

  // ============================================
  // 10. AGENCY CLIENTS (link agency to companies)
  // ============================================
  console.log('10. Linking agency to companies...');
  
  if (agency) {
    for (const member of members) {
      const { error } = await supabase.from('agency_clients').upsert({
        agency_id: agency.id,
        company_id: member.company_id,
        status: 'active',
        created_at: member.created_at,
      });

      if (error && !error.message.includes('duplicate')) {
        console.log(`  ✗ Agency client ${member.company}:`, error.message);
      }
    }
    console.log(`  ✓ ${members.length} agency-client links created\n`);
  }

  // ============================================
  // 11. JOBS (from processed_job_requests)
  // ============================================
  console.log('11. Importing jobs...');
  const jobRequests = loadJson('processed_job_requests');

  // Get agency_clients to map company_id -> agency_client_id
  const { data: agencyClients } = await supabase.from('agency_clients').select();
  const agencyClientMap = new Map(agencyClients?.map((ac: any) => [ac.company_id, ac.id]));

  const jobIdMap = new Map(); // old job id -> new job id

  for (const job of jobRequests) {
    const agencyClientId = agencyClientMap.get(job.company_id);
    
    if (!agencyClientId) {
      console.log(`  ⚠ Job ${job.id}: No agency_client for company ${job.company_id}`);
      continue;
    }

    const newJobId = crypto.randomUUID();
    jobIdMap.set(job.id, newJobId);

    const { error } = await supabase.from('jobs').upsert({
      id: newJobId,
      agency_client_id: agencyClientId,
      title: job.job_title,
      slug: `${job.job_title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.id}`,
      description: job.job_description,
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      benefits: job.benefits || [],
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_type: job.salary_type || 'monthly',
      currency: job.currency || 'PHP',
      work_arrangement: job.work_arrangement,
      work_type: job.work_type || 'full-time',
      shift: job.shift || 'day',
      experience_level: job.experience_level,
      industry: job.industry,
      department: job.department,
      status: mapJobStatus(job.status),
      priority: job.priority || 'medium',
      application_deadline: job.application_deadline,
      views: job.views || 0,
      applicants_count: job.applicants || 0,
      source: 'manual',
      external_id: String(job.id), // Store old ID for reference
      created_at: job.created_at,
      updated_at: job.updated_at,
    });

    if (error) console.log(`  ✗ Job ${job.id}:`, error.message);

    // Import job skills
    if (job.skills && job.skills.length > 0) {
      for (const skill of job.skills) {
        await supabase.from('job_skills').upsert({
          job_id: newJobId,
          name: skill,
          is_required: true,
        });
      }
    }
  }
  console.log(`  ✓ ${jobRequests.length} jobs imported\n`);

  // ============================================
  // 12. JOB MATCHES
  // ============================================
  console.log('12. Importing job matches...');
  const jobMatches = loadJson('job_match_results');

  for (const match of jobMatches) {
    const newJobId = jobIdMap.get(parseInt(match.job_id)) || jobIdMap.get(match.job_id);
    
    if (!newJobId) {
      console.log(`  ⚠ Match: No new job ID for old job ${match.job_id}`);
      continue;
    }

    const { error } = await supabase.from('job_matches').upsert({
      candidate_id: match.user_id,
      job_id: newJobId,
      overall_score: match.score,
      breakdown: match.breakdown || {},
      reasoning: match.reasoning,
      status: 'pending',
      analyzed_at: match.analyzed_at,
    });

    if (error && !error.message.includes('duplicate')) {
      console.log(`  ✗ Match ${match.user_id}/${match.job_id}:`, error.message);
    }
  }
  console.log(`  ✓ ${jobMatches.length} job matches imported\n`);

  // ============================================
  // 13. JOB APPLICATIONS
  // ============================================
  console.log('13. Importing applications...');
  const applications = loadJson('applications');

  // Get resumes for mapping
  const { data: resumes } = await supabase.from('candidate_resumes').select('id, slug');
  const resumeSlugMap = new Map(resumes?.map((r: any) => [r.slug, r.id]));

  for (const app of applications) {
    const newJobId = jobIdMap.get(app.job_id);
    
    if (!newJobId) {
      console.log(`  ⚠ Application: No new job ID for old job ${app.job_id}`);
      continue;
    }

    const { error } = await supabase.from('job_applications').upsert({
      id: app.id,
      candidate_id: app.user_id,
      job_id: newJobId,
      resume_id: resumeSlugMap.get(app.resume_slug),
      status: mapApplicationStatus(app.status),
      position: app.position || 0,
      created_at: app.created_at,
      updated_at: app.updated_at,
    });

    if (error) console.log(`  ✗ Application ${app.id}:`, error.message);
  }
  console.log(`  ✓ ${applications.length} applications imported\n`);

  console.log('========================================');
  console.log('Import complete!');
  console.log('========================================');
}

// Helper functions
function mapWorkSetup(old: string | null | undefined): string {
  const map: Record<string, string> = {
    'Work From Office': 'office',
    'Work From Home': 'remote',
    'Hybrid': 'hybrid',
  };
  return map[old || ''] || 'any';
}

function mapJobStatus(old: string): string {
  const map: Record<string, string> = {
    'active': 'active',
    'inactive': 'paused',
    'closed': 'closed',
    'processed': 'active',
  };
  return map[old] || 'active';
}

function mapApplicationStatus(old: string): string {
  const map: Record<string, string> = {
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
  };
  return map[old] || 'submitted';
}

importData().catch(console.error);
```

### Step 4.2: Run Import

```bash
npx ts-node scripts/import-supabase.ts
```

### Step 4.3: Verify Import

```sql
-- Run in Supabase SQL Editor
SELECT 
  'candidates' as table_name, COUNT(*) as count FROM candidates
UNION ALL SELECT 'candidate_profiles', COUNT(*) FROM candidate_profiles
UNION ALL SELECT 'candidate_resumes', COUNT(*) FROM candidate_resumes
UNION ALL SELECT 'candidate_disc_assessments', COUNT(*) FROM candidate_disc_assessments
UNION ALL SELECT 'candidate_typing_assessments', COUNT(*) FROM candidate_typing_assessments
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'job_applications', COUNT(*) FROM job_applications
UNION ALL SELECT 'job_matches', COUNT(*) FROM job_matches;
```

---

## Phase 5: Update Prisma Schema

### Duration: 1-2 hours

### Step 5.1: Update `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// CORE ENTITIES
// ============================================

model candidates {
  id              String   @id @db.Uuid
  email           String   @unique
  first_name      String
  last_name       String
  full_name       String
  phone           String?
  avatar_url      String?
  username        String?  @unique
  slug            String?  @unique
  is_active       Boolean  @default(true)
  email_verified  Boolean  @default(false)
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  updated_at      DateTime @default(now()) @db.Timestamptz(6)

  // Relations
  profile              candidate_profiles?
  resumes              candidate_resumes[]
  ai_analyses          candidate_ai_analysis[]
  skills               candidate_skills[]
  educations           candidate_educations[]
  work_experiences     candidate_work_experiences[]
  disc_assessments     candidate_disc_assessments[]
  typing_assessments   candidate_typing_assessments[]
  job_matches          job_matches[]
  job_applications     job_applications[]

  @@index([email])
  @@index([username])
  @@index([slug])
}

model bpoc_users {
  id          String   @id @db.Uuid
  email       String   @unique
  first_name  String
  last_name   String
  full_name   String
  phone       String?
  avatar_url  String?
  role        String   @default("admin")
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @db.Timestamptz(6)

  profile     bpoc_profiles?
}

model agencies {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  slug        String   @unique
  email       String?  @unique
  phone       String?
  logo_url    String?
  website     String?
  is_active   Boolean  @default(true)
  api_key     String?  @unique
  api_enabled Boolean  @default(false)
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @db.Timestamptz(6)

  profile     agency_profiles?
  recruiters  agency_recruiters[]
  clients     agency_clients[]
}

model companies {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String
  slug         String?  @unique
  email        String?
  phone        String?
  logo_url     String?
  website      String?
  industry     String?
  company_size String?
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now()) @db.Timestamptz(6)
  updated_at   DateTime @default(now()) @db.Timestamptz(6)

  profile        company_profiles?
  agency_clients agency_clients[]
}

// ============================================
// PROFILES
// ============================================

model candidate_profiles {
  id                           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id                 String   @unique @db.Uuid
  bio                          String?
  position                     String?
  birthday                     DateTime? @db.Date
  gender                       String?
  gender_custom                String?
  location                     String?
  location_place_id            String?
  location_lat                 Float?
  location_lng                 Float?
  location_city                String?
  location_province            String?
  location_country             String?
  location_barangay            String?
  location_region              String?
  work_status                  String?
  current_employer             String?
  current_position             String?
  current_salary               Decimal? @db.Decimal(12, 2)
  expected_salary_min          Decimal? @db.Decimal(12, 2)
  expected_salary_max          Decimal? @db.Decimal(12, 2)
  notice_period_days           Int?
  preferred_shift              String?
  preferred_work_setup         String?
  privacy_settings             Json     @default("{}")
  gamification                 Json     @default("{\"total_xp\": 0, \"tier\": \"Bronze\"}")
  profile_completed            Boolean  @default(false)
  profile_completion_percentage Int     @default(0)
  created_at                   DateTime @default(now()) @db.Timestamptz(6)
  updated_at                   DateTime @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@index([candidate_id])
  @@index([location_city])
  @@index([work_status])
}

model bpoc_profiles {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bpoc_user_id String   @unique @db.Uuid
  bio          String?
  department   String?
  permissions  Json     @default("[]")
  created_at   DateTime @default(now()) @db.Timestamptz(6)
  updated_at   DateTime @default(now()) @db.Timestamptz(6)

  bpoc_user bpoc_users @relation(fields: [bpoc_user_id], references: [id], onDelete: Cascade)
}

model agency_profiles {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agency_id      String   @unique @db.Uuid
  description    String?
  founded_year   Int?
  employee_count String?
  address_line1  String?
  address_line2  String?
  city           String?
  state          String?
  country        String?
  postal_code    String?
  settings       Json     @default("{}")
  branding       Json     @default("{\"primary_color\": \"#000000\"}")
  linkedin_url   String?
  facebook_url   String?
  twitter_url    String?
  created_at     DateTime @default(now()) @db.Timestamptz(6)
  updated_at     DateTime @default(now()) @db.Timestamptz(6)

  agency agencies @relation(fields: [agency_id], references: [id], onDelete: Cascade)
}

model company_profiles {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  company_id    String   @unique @db.Uuid
  description   String?
  founded_year  Int?
  employee_count String?
  headquarters  String?
  address_line1 String?
  address_line2 String?
  city          String?
  state         String?
  country       String?
  postal_code   String?
  culture       String?
  benefits      Json     @default("[]")
  tech_stack    Json     @default("[]")
  linkedin_url  String?
  glassdoor_url String?
  created_at    DateTime @default(now()) @db.Timestamptz(6)
  updated_at    DateTime @default(now()) @db.Timestamptz(6)

  company companies @relation(fields: [company_id], references: [id], onDelete: Cascade)
}

// ============================================
// RELATIONSHIPS
// ============================================

model agency_recruiters {
  id                      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id                 String   @db.Uuid
  agency_id               String   @db.Uuid
  email                   String
  first_name              String
  last_name               String
  full_name               String
  phone                   String?
  avatar_url              String?
  role                    String   @default("recruiter")
  is_active               Boolean  @default(true)
  can_post_jobs           Boolean  @default(true)
  can_manage_applications Boolean  @default(true)
  can_invite_recruiters   Boolean  @default(false)
  can_manage_clients      Boolean  @default(false)
  invited_by              String?  @db.Uuid
  invited_at              DateTime? @db.Timestamptz(6)
  joined_at               DateTime  @default(now()) @db.Timestamptz(6)
  created_at              DateTime  @default(now()) @db.Timestamptz(6)
  updated_at              DateTime  @default(now()) @db.Timestamptz(6)

  agency              agencies            @relation(fields: [agency_id], references: [id], onDelete: Cascade)
  inviter             agency_recruiters?  @relation("RecruiterInvites", fields: [invited_by], references: [id])
  invitees            agency_recruiters[] @relation("RecruiterInvites")
  jobs_posted         jobs[]
  applications_reviewed job_applications[]
  interviews_conducted  job_interviews[]
  offers_created        job_offers[]
  clients_added         agency_clients[]

  @@unique([user_id, agency_id])
  @@index([agency_id])
  @@index([user_id])
}

model agency_clients {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agency_id             String    @db.Uuid
  company_id            String    @db.Uuid
  status                String    @default("active")
  contract_start        DateTime? @db.Date
  contract_end          DateTime? @db.Date
  contract_value        Decimal?  @db.Decimal(12, 2)
  billing_type          String?
  primary_contact_name  String?
  primary_contact_email String?
  primary_contact_phone String?
  notes                 String?
  added_by              String?   @db.Uuid
  created_at            DateTime  @default(now()) @db.Timestamptz(6)
  updated_at            DateTime  @default(now()) @db.Timestamptz(6)

  agency    agencies           @relation(fields: [agency_id], references: [id], onDelete: Cascade)
  company   companies          @relation(fields: [company_id], references: [id], onDelete: Cascade)
  added_by_recruiter agency_recruiters? @relation(fields: [added_by], references: [id])
  jobs      jobs[]

  @@unique([agency_id, company_id])
  @@index([agency_id])
  @@index([company_id])
}

// ============================================
// CANDIDATE DATA
// ============================================

model candidate_resumes {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id        String   @db.Uuid
  slug                String   @unique
  title               String
  extracted_data      Json?
  generated_data      Json?
  resume_data         Json
  original_filename   String?
  file_url            String?
  template_used       String?
  is_primary          Boolean  @default(false)
  is_public           Boolean  @default(true)
  view_count          Int      @default(0)
  generation_metadata Json?
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  candidate    candidates         @relation(fields: [candidate_id], references: [id], onDelete: Cascade)
  ai_analyses  candidate_ai_analysis[]
  applications job_applications[]

  @@index([candidate_id])
  @@index([slug])
  @@index([is_primary])
}

model candidate_ai_analysis {
  id                           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id                 String   @db.Uuid
  resume_id                    String?  @db.Uuid
  session_id                   String
  overall_score                Int
  ats_compatibility_score      Int?
  content_quality_score        Int?
  professional_presentation_score Int?
  skills_alignment_score       Int?
  key_strengths                Json     @default("[]")
  strengths_analysis           Json     @default("{}")
  improvements                 Json     @default("[]")
  recommendations              Json     @default("[]")
  section_analysis             Json     @default("{}")
  improved_summary             String?
  salary_analysis              Json?
  career_path                  Json?
  candidate_profile_snapshot   Json?
  skills_snapshot              Json?
  experience_snapshot          Json?
  education_snapshot           Json?
  analysis_metadata            Json?
  portfolio_links              Json?
  files_analyzed               Json?
  created_at                   DateTime @default(now()) @db.Timestamptz(6)
  updated_at                   DateTime @default(now()) @db.Timestamptz(6)

  candidate candidates         @relation(fields: [candidate_id], references: [id], onDelete: Cascade)
  resume    candidate_resumes? @relation(fields: [resume_id], references: [id], onDelete: SetNull)

  @@index([candidate_id])
  @@index([resume_id])
  @@index([overall_score])
}

model candidate_skills {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id      String    @db.Uuid
  name              String
  category          String?
  proficiency_level String?
  years_experience  Decimal?  @db.Decimal(4, 1)
  is_primary        Boolean   @default(false)
  verified          Boolean   @default(false)
  verified_at       DateTime? @db.Timestamptz(6)
  created_at        DateTime  @default(now()) @db.Timestamptz(6)
  updated_at        DateTime  @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@unique([candidate_id, name])
  @@index([candidate_id])
  @@index([name])
}

model candidate_educations {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id   String    @db.Uuid
  institution    String
  degree         String?
  field_of_study String?
  start_date     DateTime? @db.Date
  end_date       DateTime? @db.Date
  is_current     Boolean   @default(false)
  grade          String?
  description    String?
  created_at     DateTime  @default(now()) @db.Timestamptz(6)
  updated_at     DateTime  @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@index([candidate_id])
}

model candidate_work_experiences {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id     String    @db.Uuid
  company_name     String
  job_title        String
  location         String?
  start_date       DateTime? @db.Date
  end_date         DateTime? @db.Date
  is_current       Boolean   @default(false)
  description      String?
  responsibilities Json      @default("[]")
  achievements     Json      @default("[]")
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@index([candidate_id])
}

model candidate_disc_assessments {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id          String    @db.Uuid
  session_status        String    @default("completed")
  started_at            DateTime? @db.Timestamptz(6)
  finished_at           DateTime? @db.Timestamptz(6)
  duration_seconds      Int?
  total_questions       Int       @default(30)
  d_score               Int       @default(0)
  i_score               Int       @default(0)
  s_score               Int       @default(0)
  c_score               Int       @default(0)
  primary_type          String
  secondary_type        String?
  confidence_score      Int       @default(0)
  consistency_index     Decimal?  @db.Decimal(5, 2)
  cultural_alignment    Int       @default(95)
  authenticity_score    Int?
  ai_assessment         Json      @default("{}")
  ai_bpo_roles          Json      @default("[]")
  core_responses        Json      @default("[]")
  personalized_responses Json     @default("[]")
  response_patterns     Json      @default("{}")
  user_position         String?
  user_location         String?
  user_experience       String?
  xp_earned             Int       @default(0)
  created_at            DateTime  @default(now()) @db.Timestamptz(6)
  updated_at            DateTime  @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@index([candidate_id])
  @@index([primary_type])
  @@index([created_at])
}

model candidate_typing_assessments {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id          String   @db.Uuid
  session_status        String   @default("completed")
  difficulty_level      String   @default("rockstar")
  elapsed_time          Int      @default(0)
  score                 Int      @default(0)
  wpm                   Int      @default(0)
  overall_accuracy      Decimal  @default(0) @db.Decimal(5, 2)
  longest_streak        Int      @default(0)
  correct_words         Int      @default(0)
  wrong_words           Int      @default(0)
  words_correct         Json     @default("[]")
  words_incorrect       Json     @default("[]")
  ai_analysis           Json     @default("{}")
  vocabulary_strengths  Json     @default("[]")
  vocabulary_weaknesses Json     @default("[]")
  generated_story       String?
  created_at            DateTime @default(now()) @db.Timestamptz(6)
  updated_at            DateTime @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)

  @@index([candidate_id])
  @@index([wpm])
  @@index([score])
}

// ============================================
// JOBS
// ============================================

model jobs {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agency_client_id     String    @db.Uuid
  posted_by            String?   @db.Uuid
  title                String
  slug                 String?   @unique
  description          String
  requirements         Json      @default("[]")
  responsibilities     Json      @default("[]")
  benefits             Json      @default("[]")
  salary_min           Int?
  salary_max           Int?
  salary_type          String    @default("monthly")
  currency             String    @default("PHP")
  work_arrangement     String?
  work_type            String    @default("full-time")
  shift                String    @default("day")
  experience_level     String?
  industry             String?
  department           String?
  status               String    @default("active")
  priority             String    @default("medium")
  application_deadline DateTime? @db.Date
  views                Int       @default(0)
  applicants_count     Int       @default(0)
  source               String    @default("manual")
  external_id          String?
  created_at           DateTime  @default(now()) @db.Timestamptz(6)
  updated_at           DateTime  @default(now()) @db.Timestamptz(6)

  agency_client agency_clients      @relation(fields: [agency_client_id], references: [id], onDelete: Cascade)
  poster        agency_recruiters?  @relation(fields: [posted_by], references: [id])
  skills        job_skills[]
  matches       job_matches[]
  applications  job_applications[]

  @@index([agency_client_id])
  @@index([posted_by])
  @@index([status])
  @@index([created_at])
}

model job_skills {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_id              String   @db.Uuid
  name                String
  is_required         Boolean  @default(true)
  min_years_experience Decimal? @db.Decimal(4, 1)
  created_at          DateTime @default(now()) @db.Timestamptz(6)

  job jobs @relation(fields: [job_id], references: [id], onDelete: Cascade)

  @@unique([job_id, name])
  @@index([job_id])
  @@index([name])
}

// ============================================
// APPLICATIONS
// ============================================

model job_matches {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id       String    @db.Uuid
  job_id             String    @db.Uuid
  overall_score      Int
  breakdown          Json      @default("{}")
  reasoning          String?
  status             String    @default("pending")
  candidate_viewed_at DateTime? @db.Timestamptz(6)
  candidate_action_at DateTime? @db.Timestamptz(6)
  analyzed_at        DateTime  @default(now()) @db.Timestamptz(6)
  created_at         DateTime  @default(now()) @db.Timestamptz(6)
  updated_at         DateTime  @default(now()) @db.Timestamptz(6)

  candidate candidates @relation(fields: [candidate_id], references: [id], onDelete: Cascade)
  job       jobs       @relation(fields: [job_id], references: [id], onDelete: Cascade)

  @@unique([candidate_id, job_id])
  @@index([candidate_id])
  @@index([job_id])
  @@index([overall_score])
}

model job_applications {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id     String    @db.Uuid
  job_id           String    @db.Uuid
  resume_id        String?   @db.Uuid
  status           String    @default("submitted")
  position         Int       @default(0)
  reviewed_by      String?   @db.Uuid
  reviewed_at      DateTime? @db.Timestamptz(6)
  recruiter_notes  String?
  rejection_reason String?
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  candidate  candidates          @relation(fields: [candidate_id], references: [id], onDelete: Cascade)
  job        jobs                @relation(fields: [job_id], references: [id], onDelete: Cascade)
  resume     candidate_resumes?  @relation(fields: [resume_id], references: [id])
  reviewer   agency_recruiters?  @relation(fields: [reviewed_by], references: [id])
  interviews job_interviews[]
  offers     job_offers[]

  @@unique([candidate_id, job_id])
  @@index([candidate_id])
  @@index([job_id])
  @@index([status])
}

model job_interviews {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id   String    @db.Uuid
  interview_type   String
  interview_round  Int       @default(1)
  scheduled_at     DateTime? @db.Timestamptz(6)
  duration_minutes Int       @default(60)
  location         String?
  meeting_link     String?
  interviewer_id   String?   @db.Uuid
  interviewer_notes String?
  status           String    @default("scheduled")
  outcome          String?
  feedback         Json      @default("{}")
  rating           Int?
  started_at       DateTime? @db.Timestamptz(6)
  ended_at         DateTime? @db.Timestamptz(6)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  application job_applications   @relation(fields: [application_id], references: [id], onDelete: Cascade)
  interviewer agency_recruiters? @relation(fields: [interviewer_id], references: [id])

  @@index([application_id])
  @@index([scheduled_at])
}

model job_offers {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id   String    @db.Uuid
  salary_offered   Decimal   @db.Decimal(12, 2)
  salary_type      String    @default("monthly")
  currency         String    @default("PHP")
  start_date       DateTime? @db.Date
  benefits_offered Json      @default("[]")
  additional_terms String?
  status           String    @default("draft")
  sent_at          DateTime? @db.Timestamptz(6)
  viewed_at        DateTime? @db.Timestamptz(6)
  responded_at     DateTime? @db.Timestamptz(6)
  expires_at       DateTime? @db.Timestamptz(6)
  candidate_response String?
  rejection_reason String?
  created_by       String?   @db.Uuid
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)

  application job_applications   @relation(fields: [application_id], references: [id], onDelete: Cascade)
  creator     agency_recruiters? @relation(fields: [created_by], references: [id])

  @@index([application_id])
  @@index([status])
}
```

### Step 5.2: Introspect & Generate

```bash
# Don't run migrate - tables already exist!
# Instead, pull existing schema
npx prisma db pull

# Generate client
npx prisma generate
```

### Step 5.3: Verify Prisma Connection

```typescript
// Quick test script
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const count = await prisma.candidates.count();
  console.log(`Candidates in Supabase: ${count}`);
}

test();
```

---

## Phase 6: Update Code

### Duration: 2-4 hours (depends on codebase size)

### Step 6.1: Find & Replace Table Names

| Old | New |
|-----|-----|
| `prisma.users` | `prisma.candidates` |
| `prisma.members` | `prisma.companies` |
| `prisma.applications` | `prisma.job_applications` |
| `prisma.job_requests` | `prisma.jobs` |
| `prisma.processed_job_requests` | `prisma.jobs` |
| `prisma.saved_resumes` | `prisma.candidate_resumes` |
| `prisma.resumes_extracted` | `prisma.candidate_resumes` (use `.extracted_data`) |
| `prisma.resumes_generated` | `prisma.candidate_resumes` (use `.generated_data`) |
| `prisma.ai_analysis_results` | `prisma.candidate_ai_analysis` |
| `prisma.disc_personality_sessions` | `prisma.candidate_disc_assessments` |
| `prisma.disc_personality_stats` | (merged into assessments) |
| `prisma.typing_hero_sessions` | `prisma.candidate_typing_assessments` |
| `prisma.typing_hero_stats` | (merged into assessments) |
| `prisma.user_work_status` | `prisma.candidate_profiles` |
| `prisma.privacy_settings` | `prisma.candidate_profiles.privacy_settings` |
| `prisma.user_leaderboard_scores` | `prisma.candidate_profiles.gamification` |
| `prisma.job_match_results` | `prisma.job_matches` |

### Step 6.2: Find & Replace Field Names

| Old | New |
|-----|-----|
| `user_id` | `candidate_id` |
| `job_title` (on jobs) | `title` |
| `job_description` | `description` |
| `company_id` (on jobs) | `agency_client_id` |
| `resume_slug` | `slug` (on resumes) |
| `resume_title` | `title` (on resumes) |
| `resume_data` | `resume_data` (same, but check structure) |

### Step 6.3: Update Relationship Queries

**Jobs with Company (OLD):**
```typescript
const job = await prisma.job_requests.findUnique({
  where: { id },
  include: { members: true }
});
const companyName = job.members.company;
```

**Jobs with Company (NEW):**
```typescript
const job = await prisma.jobs.findUnique({
  where: { id },
  include: {
    agency_client: {
      include: {
        company: true,
        agency: true
      }
    }
  }
});
const companyName = job.agency_client.company.name;
const agencyName = job.agency_client.agency.name;
```

### Step 6.4: Search Codebase

```bash
# Find all Prisma usage
grep -r "prisma\." --include="*.ts" --include="*.tsx" src/
grep -r "prisma\." --include="*.ts" --include="*.tsx" app/

# Find specific old table names
grep -r "\.users" --include="*.ts" --include="*.tsx" .
grep -r "\.members" --include="*.ts" --include="*.tsx" .
grep -r "\.job_requests" --include="*.ts" --include="*.tsx" .
grep -r "user_id" --include="*.ts" --include="*.tsx" .
```

### Step 6.5: Common Patterns to Update

**Get User Profile:**
```typescript
// OLD
const user = await prisma.users.findUnique({
  where: { id },
  include: { user_work_status: true, privacy_settings: true }
});

// NEW
const candidate = await prisma.candidates.findUnique({
  where: { id },
  include: { profile: true }
});
// Access: candidate.profile.privacy_settings (JSON)
```

**Get User's Resumes:**
```typescript
// OLD
const resumes = await prisma.saved_resumes.findMany({
  where: { user_id: userId }
});

// NEW
const resumes = await prisma.candidate_resumes.findMany({
  where: { candidate_id: userId }
});
```

**Get Jobs:**
```typescript
// OLD
const jobs = await prisma.processed_job_requests.findMany({
  include: { members: true }
});

// NEW
const jobs = await prisma.jobs.findMany({
  include: {
    agency_client: {
      include: {
        company: true
      }
    }
  }
});
```

**Create Application:**
```typescript
// OLD
const app = await prisma.applications.create({
  data: {
    user_id: userId,
    job_id: jobId,
    resume_id: resumeId,
    resume_slug: slug,
    status: 'submitted'
  }
});

// NEW
const app = await prisma.job_applications.create({
  data: {
    candidate_id: userId,
    job_id: jobId,
    resume_id: resumeId,
    status: 'submitted'
  }
});
```

---

## Phase 7: Testing

### Duration: 1-2 days

### Step 7.1: Unit Tests

```bash
# Run existing tests
npm test

# Fix any failures due to schema changes
```

### Step 7.2: Manual Testing Checklist

```
AUTH (should work unchanged)
□ Sign up new user
□ Log in existing user
□ Log out
□ Password reset

CANDIDATE FLOW
□ View profile
□ Edit profile
□ Update location
□ Update work status
□ Upload resume
□ Generate resume
□ View AI analysis
□ Play Typing Hero
□ Complete DISC test
□ View assessment results
□ Browse jobs
□ Apply to job
□ View applications

RECRUITER FLOW
□ View dashboard
□ View candidates
□ View applications
□ Update application status
□ Schedule interview
□ Send offer
□ View job postings
□ Create job posting

AGENCY FLOW
□ View clients
□ View jobs by client
□ View recruiters
□ Agency settings
```

### Step 7.3: Data Verification

```sql
-- Compare counts
SELECT 'Railway users' as source, COUNT(*) as count FROM old_users
UNION ALL
SELECT 'Supabase candidates', COUNT(*) FROM candidates;

-- Verify specific user data
SELECT * FROM candidates WHERE email = 'test@example.com';
SELECT * FROM candidate_profiles WHERE candidate_id = 'xxx';
```

---

## Phase 8: Cutover

### Duration: 1-2 hours

### Pre-Cutover Checklist

```
□ All tests passing
□ All manual testing complete
□ Data counts match
□ Team notified
□ Backup of Railway database taken
□ Rollback plan ready
```

### Cutover Steps

```bash
# 1. Put site in maintenance mode (optional)
# - Show "We're upgrading, back in 30 minutes"

# 2. Final data sync (if any new data since import)
npx ts-node scripts/sync-final-data.ts

# 3. Update production environment variables
# In Vercel:
# DATABASE_URL = Supabase connection string
# DIRECT_URL = Supabase direct connection

# 4. Deploy to Vercel
vercel --prod

# 5. Verify production is working
# - Test login
# - Test key flows

# 6. Remove maintenance mode

# 7. Monitor for 24-48 hours
```

---

## Phase 9: Cleanup

### Duration: After 1-2 weeks stable

### Step 9.1: Keep Railway as Backup

```
□ Keep Railway running for 2 weeks
□ Monitor for any issues
□ If issues, can quickly point back to Railway
```

### Step 9.2: Delete Old Tables from Supabase

If you had any old tables in Supabase from before:

```sql
-- Only if you had old tables in Supabase
DROP TABLE IF EXISTS old_table_name CASCADE;
```

### Step 9.3: Shutdown Railway

```
□ Export final backup
□ Download backup file
□ Store backup securely
□ Delete Railway database
□ Cancel Railway billing
```

### Step 9.4: Clean Up Code

```bash
# Remove any migration scripts
rm -rf scripts/export-railway.ts
rm -rf scripts/import-supabase.ts
rm -rf migration-data/

# Remove old Prisma schema backup
rm -rf prisma/schema.prisma.old
```

---

## Rollback Plan

### If Something Goes Wrong Before Cutover

```bash
# Just don't deploy!
# Keep using Railway
# Fix issues and try again
```

### If Something Goes Wrong After Cutover

```bash
# 1. Revert environment variables in Vercel
DATABASE_URL = Railway connection string
DIRECT_URL = Railway connection string

# 2. Redeploy
vercel --prod

# 3. You're back on Railway
```

### If Data Is Corrupted

```bash
# 1. Restore from Railway (it's still running)
# 2. Fix import script
# 3. Re-run import
# 4. Test thoroughly before cutting over again
```

---

## What Could Go Wrong

### ID Type Issues

**Problem:** Old job IDs are INTEGER, new are UUID

**Solution:** Already handled - we generate new UUIDs and store old ID in `external_id`

### NULL Values

**Problem:** Old data has NULLs where new schema requires values

**Solution:** Import script uses defaults: `|| 0`, `|| 'Bronze'`, `|| []`

### Duplicate Slugs

**Problem:** Old data might have duplicate slugs

**Solution:** Run this before import:
```sql
SELECT slug, COUNT(*) FROM saved_resumes GROUP BY slug HAVING COUNT(*) > 1;
```

### Job → Company Relationship

**Problem:** Jobs now need `agency_client_id` not `company_id`

**Solution:** Import script creates agency_clients and maps correctly

### Missing Resumes

**Problem:** Some users might have extracted/generated data but no saved_resumes

**Solution:** Import script handles missing data gracefully

---

## Quick Reference

### Connection Strings

```env
# Supabase Pooler (for Prisma)
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct (for migrations)
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### Commands

```bash
# Export from Railway
npx ts-node scripts/export-railway.ts

# Import to Supabase
npx ts-node scripts/import-supabase.ts

# Generate Prisma client
npx prisma generate

# Pull schema (don't migrate!)
npx prisma db pull
```

### Table Name Changes

| Old (Railway) | New (Supabase) |
|---------------|----------------|
| users | candidates |
| members | companies |
| applications | job_applications |
| job_requests/processed_job_requests | jobs |
| saved_resumes + resumes_* | candidate_resumes |
| ai_analysis_results | candidate_ai_analysis |
| disc_personality_sessions | candidate_disc_assessments |
| typing_hero_sessions | candidate_typing_assessments |
| user_work_status + privacy_settings | candidate_profiles |
| job_match_results | job_matches |

---

*You've got this! 🚀*
