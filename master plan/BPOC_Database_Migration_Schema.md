# BPOC Database Migration Schema
## Railway (Prisma) → Supabase Migration Guide

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Phase 1: Core Entities](#phase-1-core-entities)
3. [Phase 2: Profiles](#phase-2-profiles)
4. [Phase 3: Relationships](#phase-3-relationships)
5. [Phase 4: Candidate Data](#phase-4-candidate-data)
6. [Phase 5: Jobs](#phase-5-jobs)
7. [Phase 6: Application Flow](#phase-6-application-flow)
8. [Data Migration Scripts](#data-migration-scripts)
9. [Enums](#enums)
10. [Row Level Security (RLS)](#row-level-security-rls)

---

## Platform Overview

```
BPOC (Platform)
├── 👑 bpoc_users / bpoc_profiles (Platform Admins)
│
└── 🏢 agencies (e.g., "ShoreAgents")
    ├── 👤 agency_recruiters (recruitment team)
    └── 🏭 agency_clients → companies (clients they recruit for)
        └── 💼 jobs

👥 candidates (talent pool)
├── candidate_profiles
├── candidate_resumes
├── candidate_ai_analysis
├── candidate_skills
├── candidate_educations
├── candidate_work_experiences
├── candidate_disc_assessments
└── candidate_typing_assessments
```

---

## Phase 1: Core Entities

### 1.1 `candidates`
**Maps from:** `users` table (filtered to non-admin users)

```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  avatar_url TEXT,
  username TEXT UNIQUE,
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_username ON candidates(username);
CREATE INDEX idx_candidates_slug ON candidates(slug);
CREATE INDEX idx_candidates_created_at ON candidates(created_at);

-- Updated at trigger
CREATE TRIGGER set_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Migration from OLD `users`:**
```sql
INSERT INTO candidates (id, email, first_name, last_name, phone, avatar_url, username, slug, created_at, updated_at)
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone,
  avatar_url,
  username,
  slug,
  created_at,
  updated_at
FROM old_users
WHERE admin_level = 'user' OR admin_level IS NULL;
```

---

### 1.2 `bpoc_users`
**Maps from:** `users` table (filtered to admin users)

```sql
CREATE TABLE bpoc_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bpoc_users_email ON bpoc_users(email);
CREATE INDEX idx_bpoc_users_role ON bpoc_users(role);
```

**Migration from OLD `users`:**
```sql
INSERT INTO bpoc_users (id, email, first_name, last_name, phone, avatar_url, role, created_at, updated_at)
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone,
  avatar_url,
  CASE 
    WHEN admin_level = 'admin' THEN 'admin'
    WHEN admin_level = 'super' THEN 'super_admin'
    ELSE 'admin'
  END,
  created_at,
  updated_at
FROM old_users
WHERE admin_level IS NOT NULL AND admin_level != 'user';
```

---

### 1.3 `agencies`
**Maps from:** `agencies` table (if existed) - likely NEW

```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  logo_url TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  api_key TEXT UNIQUE,
  api_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agencies_slug ON agencies(slug);
CREATE INDEX idx_agencies_api_key ON agencies(api_key);
CREATE INDEX idx_agencies_is_active ON agencies(is_active);

-- Generate unique API key function
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'bpoc_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
```

---

### 1.4 `companies`
**Maps from:** `members` table

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_is_active ON companies(is_active);
```

**Migration from OLD `members`:**
```sql
INSERT INTO companies (id, name, created_at, updated_at)
SELECT 
  company_id,
  company,
  created_at,
  updated_at
FROM old_members;
```

---

## Phase 2: Profiles

### 2.1 `candidate_profiles`
**Maps from:** `users` (extended fields) + `privacy_settings` + `user_work_status`

```sql
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Personal Info
  bio TEXT,
  position TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  gender_custom TEXT,
  
  -- Location
  location TEXT,
  location_place_id TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_city TEXT,
  location_province TEXT,
  location_country TEXT,
  location_barangay TEXT,
  location_region TEXT,
  
  -- Work Preferences (from user_work_status)
  work_status TEXT CHECK (work_status IN ('employed', 'unemployed', 'freelancer', 'part_time', 'student')),
  current_employer TEXT,
  current_position TEXT,
  current_salary DECIMAL(12, 2),
  expected_salary_min DECIMAL(12, 2),
  expected_salary_max DECIMAL(12, 2),
  notice_period_days INTEGER,
  preferred_shift TEXT CHECK (preferred_shift IN ('day', 'night', 'both')),
  preferred_work_setup TEXT CHECK (preferred_work_setup IN ('office', 'remote', 'hybrid', 'any')),
  
  -- Privacy Settings (embedded JSON instead of separate table)
  privacy_settings JSONB DEFAULT '{
    "username": "public",
    "first_name": "public",
    "last_name": "only-me",
    "location": "public",
    "job_title": "public",
    "birthday": "only-me",
    "age": "only-me",
    "gender": "only-me",
    "resume_score": "public",
    "key_strengths": "only-me"
  }'::jsonb,
  
  -- Gamification (from user_leaderboard_scores)
  gamification JSONB DEFAULT '{
    "total_xp": 0,
    "tier": "Bronze",
    "badges": [],
    "rank_position": 0
  }'::jsonb,
  
  -- Completion tracking
  profile_completed BOOLEAN DEFAULT false,
  profile_completion_percentage INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_profiles_candidate_id ON candidate_profiles(candidate_id);
CREATE INDEX idx_candidate_profiles_location_city ON candidate_profiles(location_city);
CREATE INDEX idx_candidate_profiles_work_status ON candidate_profiles(work_status);
CREATE INDEX idx_candidate_profiles_preferred_shift ON candidate_profiles(preferred_shift);
```

**Migration from OLD tables:**
```sql
INSERT INTO candidate_profiles (
  candidate_id, bio, position, birthday, gender, gender_custom,
  location, location_place_id, location_lat, location_lng, 
  location_city, location_province, location_country, location_barangay, location_region,
  work_status, current_employer, current_position, current_salary,
  expected_salary_min, expected_salary_max, notice_period_days,
  preferred_shift, preferred_work_setup, privacy_settings, gamification,
  created_at, updated_at
)
SELECT 
  u.id,
  u.bio,
  u.position,
  u.birthday,
  u.gender,
  u.gender_custom,
  u.location,
  u.location_place_id,
  u.location_lat,
  u.location_lng,
  u.location_city,
  u.location_province,
  u.location_country,
  u.location_barangay,
  u.location_region,
  -- From user_work_status
  COALESCE(uws.work_status::text, uws.work_status_new::text),
  uws.current_employer,
  uws.current_position,
  uws.current_salary,
  uws.minimum_salary_range,
  uws.maximum_salary_range,
  uws.notice_period_days,
  uws.preferred_shift::text,
  CASE uws.work_setup
    WHEN 'Work From Office' THEN 'office'
    WHEN 'Work From Home' THEN 'remote'
    WHEN 'Hybrid' THEN 'hybrid'
    ELSE 'any'
  END,
  -- Privacy settings as JSON
  jsonb_build_object(
    'username', COALESCE(ps.username, 'public'),
    'first_name', COALESCE(ps.first_name, 'public'),
    'last_name', COALESCE(ps.last_name, 'only-me'),
    'location', COALESCE(ps.location, 'public'),
    'job_title', COALESCE(ps.job_title, 'public'),
    'birthday', COALESCE(ps.birthday, 'only-me'),
    'resume_score', COALESCE(ps.resume_score, 'public'),
    'key_strengths', COALESCE(ps.key_strengths, 'only-me')
  ),
  -- Gamification from leaderboard
  COALESCE(
    jsonb_build_object(
      'total_xp', uls.overall_score,
      'tier', uls.tier,
      'rank_position', uls.rank_position,
      'metrics', uls.metrics
    ),
    '{"total_xp": 0, "tier": "Bronze", "badges": [], "rank_position": 0}'::jsonb
  ),
  u.created_at,
  u.updated_at
FROM old_users u
LEFT JOIN old_user_work_status uws ON u.id = uws.user_id
LEFT JOIN old_privacy_settings ps ON u.id = ps.user_id
LEFT JOIN old_user_leaderboard_scores uls ON u.id = uls.user_id
WHERE u.admin_level = 'user' OR u.admin_level IS NULL;
```

---

### 2.2 `bpoc_profiles`

```sql
CREATE TABLE bpoc_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bpoc_user_id UUID UNIQUE NOT NULL REFERENCES bpoc_users(id) ON DELETE CASCADE,
  bio TEXT,
  department TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.3 `agency_profiles`

```sql
CREATE TABLE agency_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID UNIQUE NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Business Info
  description TEXT,
  founded_year INTEGER,
  employee_count TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{
    "primary_color": "#000000",
    "secondary_color": "#ffffff"
  }'::jsonb,
  
  -- Social
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.4 `company_profiles`

```sql
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Business Info
  description TEXT,
  founded_year INTEGER,
  employee_count TEXT,
  headquarters TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  
  -- Culture & Benefits
  culture TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  
  -- Social
  linkedin_url TEXT,
  glassdoor_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 3: Relationships

### 3.1 `agency_recruiters`

```sql
CREATE TABLE agency_recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  avatar_url TEXT,
  
  role TEXT DEFAULT 'recruiter' CHECK (role IN ('owner', 'admin', 'recruiter', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  
  -- Permissions
  can_post_jobs BOOLEAN DEFAULT true,
  can_manage_applications BOOLEAN DEFAULT true,
  can_invite_recruiters BOOLEAN DEFAULT false,
  can_manage_clients BOOLEAN DEFAULT false,
  
  invited_by UUID REFERENCES agency_recruiters(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, agency_id)
);

-- Indexes
CREATE INDEX idx_agency_recruiters_user_id ON agency_recruiters(user_id);
CREATE INDEX idx_agency_recruiters_agency_id ON agency_recruiters(agency_id);
CREATE INDEX idx_agency_recruiters_role ON agency_recruiters(role);
```

---

### 3.2 `agency_clients`
**Junction table:** Which agency works with which company

```sql
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'churned')),
  
  -- Contract Info
  contract_start DATE,
  contract_end DATE,
  contract_value DECIMAL(12, 2),
  billing_type TEXT CHECK (billing_type IN ('per_hire', 'retainer', 'project')),
  
  -- Relationship
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  
  notes TEXT,
  
  added_by UUID REFERENCES agency_recruiters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agency_id, company_id)
);

-- Indexes
CREATE INDEX idx_agency_clients_agency_id ON agency_clients(agency_id);
CREATE INDEX idx_agency_clients_company_id ON agency_clients(company_id);
CREATE INDEX idx_agency_clients_status ON agency_clients(status);
```

---

## Phase 4: Candidate Data

### 4.1 `candidate_resumes`
**Maps from:** `resumes_extracted` + `resumes_generated` + `saved_resumes`

```sql
CREATE TABLE candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Resume Identity
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  
  -- Resume Data
  extracted_data JSONB,          -- From resumes_extracted
  generated_data JSONB,          -- From resumes_generated
  resume_data JSONB NOT NULL,    -- Final/saved data
  
  -- File Info
  original_filename TEXT,
  file_url TEXT,
  
  -- Template & Display
  template_used TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  
  -- Generation Metadata
  generation_metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_resumes_candidate_id ON candidate_resumes(candidate_id);
CREATE INDEX idx_candidate_resumes_slug ON candidate_resumes(slug);
CREATE INDEX idx_candidate_resumes_is_primary ON candidate_resumes(is_primary);
CREATE INDEX idx_candidate_resumes_is_public ON candidate_resumes(is_public);

-- Ensure only one primary resume per candidate
CREATE UNIQUE INDEX idx_candidate_resumes_primary 
ON candidate_resumes(candidate_id) 
WHERE is_primary = true;
```

**Migration from OLD tables:**
```sql
INSERT INTO candidate_resumes (
  candidate_id, slug, title, extracted_data, generated_data, resume_data,
  original_filename, template_used, is_public, view_count, generation_metadata,
  created_at, updated_at
)
SELECT 
  sr.user_id,
  sr.resume_slug,
  sr.resume_title,
  re.resume_data,
  rg.generated_resume_data,
  sr.resume_data,
  re.original_filename,
  sr.template_used,
  sr.is_public,
  sr.view_count,
  rg.generation_metadata,
  sr.created_at,
  sr.updated_at
FROM old_saved_resumes sr
LEFT JOIN old_resumes_extracted re ON sr.user_id = re.user_id
LEFT JOIN old_resumes_generated rg ON sr.user_id = rg.user_id;
```

---

### 4.2 `candidate_ai_analysis` (NEW)
**Maps from:** `ai_analysis_results`

```sql
CREATE TABLE candidate_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES candidate_resumes(id) ON DELETE SET NULL,
  
  session_id TEXT NOT NULL,
  
  -- Scores
  overall_score INTEGER NOT NULL,
  ats_compatibility_score INTEGER,
  content_quality_score INTEGER,
  professional_presentation_score INTEGER,
  skills_alignment_score INTEGER,
  
  -- Analysis Results
  key_strengths JSONB DEFAULT '[]'::jsonb,
  strengths_analysis JSONB DEFAULT '{}'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  section_analysis JSONB DEFAULT '{}'::jsonb,
  
  -- AI Generated Content
  improved_summary TEXT,
  salary_analysis JSONB,
  career_path JSONB,
  
  -- Snapshots at time of analysis
  candidate_profile_snapshot JSONB,
  skills_snapshot JSONB,
  experience_snapshot JSONB,
  education_snapshot JSONB,
  
  -- Metadata
  analysis_metadata JSONB,
  portfolio_links JSONB,
  files_analyzed JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_ai_analysis_candidate_id ON candidate_ai_analysis(candidate_id);
CREATE INDEX idx_candidate_ai_analysis_resume_id ON candidate_ai_analysis(resume_id);
CREATE INDEX idx_candidate_ai_analysis_overall_score ON candidate_ai_analysis(overall_score);
CREATE INDEX idx_candidate_ai_analysis_session_id ON candidate_ai_analysis(session_id);
```

**Migration from OLD `ai_analysis_results`:**
```sql
INSERT INTO candidate_ai_analysis (
  candidate_id, session_id, overall_score, ats_compatibility_score,
  content_quality_score, professional_presentation_score, skills_alignment_score,
  key_strengths, strengths_analysis, improvements, recommendations, section_analysis,
  improved_summary, salary_analysis, career_path,
  candidate_profile_snapshot, skills_snapshot, experience_snapshot, education_snapshot,
  analysis_metadata, portfolio_links, files_analyzed, created_at, updated_at
)
SELECT 
  user_id,
  session_id,
  overall_score,
  ats_compatibility_score,
  content_quality_score,
  professional_presentation_score,
  skills_alignment_score,
  key_strengths,
  strengths_analysis,
  improvements,
  recommendations,
  section_analysis,
  improved_summary,
  salary_analysis,
  career_path,
  candidate_profile,
  skills_snapshot,
  experience_snapshot,
  education_snapshot,
  analysis_metadata,
  portfolio_links,
  files_analyzed,
  created_at,
  updated_at
FROM old_ai_analysis_results;
```

---

### 4.3 `candidate_skills`

```sql
CREATE TABLE candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT,  -- 'technical', 'soft', 'language', 'tool'
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience DECIMAL(4, 1),
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(candidate_id, name)
);

-- Indexes
CREATE INDEX idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX idx_candidate_skills_name ON candidate_skills(name);
CREATE INDEX idx_candidate_skills_category ON candidate_skills(category);
```

---

### 4.4 `candidate_educations`

```sql
CREATE TABLE candidate_educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  grade TEXT,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_educations_candidate_id ON candidate_educations(candidate_id);
```

---

### 4.5 `candidate_work_experiences`

```sql
CREATE TABLE candidate_work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  responsibilities JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_work_experiences_candidate_id ON candidate_work_experiences(candidate_id);
CREATE INDEX idx_candidate_work_experiences_is_current ON candidate_work_experiences(is_current);
```

---

### 4.6 `candidate_disc_assessments`
**Maps from:** `disc_personality_sessions` + `disc_personality_stats`

```sql
CREATE TABLE candidate_disc_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Session Info
  session_status TEXT DEFAULT 'completed' CHECK (session_status IN ('started', 'in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_questions INTEGER DEFAULT 30,
  
  -- DISC Scores
  d_score INTEGER DEFAULT 0,
  i_score INTEGER DEFAULT 0,
  s_score INTEGER DEFAULT 0,
  c_score INTEGER DEFAULT 0,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  
  -- Quality Metrics
  confidence_score INTEGER DEFAULT 0,
  consistency_index DECIMAL(5, 2),
  cultural_alignment INTEGER DEFAULT 95,
  authenticity_score INTEGER,
  
  -- AI Analysis
  ai_assessment JSONB DEFAULT '{}'::jsonb,
  ai_bpo_roles JSONB DEFAULT '[]'::jsonb,
  
  -- Responses
  core_responses JSONB DEFAULT '[]'::jsonb,
  personalized_responses JSONB DEFAULT '[]'::jsonb,
  response_patterns JSONB DEFAULT '{}'::jsonb,
  
  -- Context at time of assessment
  user_position TEXT,
  user_location TEXT,
  user_experience TEXT,
  
  -- XP/Gamification
  xp_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_disc_assessments_candidate_id ON candidate_disc_assessments(candidate_id);
CREATE INDEX idx_candidate_disc_assessments_primary_type ON candidate_disc_assessments(primary_type);
CREATE INDEX idx_candidate_disc_assessments_confidence ON candidate_disc_assessments(confidence_score);
CREATE INDEX idx_candidate_disc_assessments_created_at ON candidate_disc_assessments(created_at);
```

**Migration from OLD tables:**
```sql
INSERT INTO candidate_disc_assessments (
  candidate_id, session_status, started_at, finished_at, duration_seconds, total_questions,
  d_score, i_score, s_score, c_score, primary_type, secondary_type,
  confidence_score, consistency_index, cultural_alignment,
  ai_assessment, ai_bpo_roles, core_responses, personalized_responses, response_patterns,
  user_position, user_location, user_experience, xp_earned, created_at, updated_at
)
SELECT 
  s.user_id,
  s.session_status,
  s.started_at,
  s.finished_at,
  s.duration_seconds,
  s.total_questions,
  s.d_score,
  s.i_score,
  s.s_score,
  s.c_score,
  s.primary_type,
  s.secondary_type,
  s.confidence_score,
  s.consistency_index,
  s.cultural_alignment,
  s.ai_assessment,
  s.ai_bpo_roles,
  s.core_responses,
  s.personalized_responses,
  s.response_patterns,
  s.user_position,
  s.user_location,
  s.user_experience,
  COALESCE(st.latest_session_xp, 0),
  s.created_at,
  s.updated_at
FROM old_disc_personality_sessions s
LEFT JOIN old_disc_personality_stats st ON s.user_id = st.user_id;
```

---

### 4.7 `candidate_typing_assessments`
**Maps from:** `typing_hero_sessions` + `typing_hero_stats`

```sql
CREATE TABLE candidate_typing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Session Info
  session_status TEXT DEFAULT 'completed' CHECK (session_status IN ('started', 'in_progress', 'completed', 'abandoned')),
  difficulty_level TEXT DEFAULT 'rockstar',
  elapsed_time INTEGER DEFAULT 0,
  
  -- Performance Metrics
  score INTEGER DEFAULT 0,
  wpm INTEGER DEFAULT 0,
  overall_accuracy DECIMAL(5, 2) DEFAULT 0.00,
  longest_streak INTEGER DEFAULT 0,
  correct_words INTEGER DEFAULT 0,
  wrong_words INTEGER DEFAULT 0,
  
  -- Word Tracking
  words_correct JSONB DEFAULT '[]'::jsonb,
  words_incorrect JSONB DEFAULT '[]'::jsonb,
  
  -- AI Analysis
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  vocabulary_strengths JSONB DEFAULT '[]'::jsonb,
  vocabulary_weaknesses JSONB DEFAULT '[]'::jsonb,
  generated_story TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_candidate_typing_assessments_candidate_id ON candidate_typing_assessments(candidate_id);
CREATE INDEX idx_candidate_typing_assessments_wpm ON candidate_typing_assessments(wpm);
CREATE INDEX idx_candidate_typing_assessments_score ON candidate_typing_assessments(score);
CREATE INDEX idx_candidate_typing_assessments_accuracy ON candidate_typing_assessments(overall_accuracy);
CREATE INDEX idx_candidate_typing_assessments_created_at ON candidate_typing_assessments(created_at);
```

**Migration from OLD tables:**
```sql
INSERT INTO candidate_typing_assessments (
  candidate_id, session_status, difficulty_level, elapsed_time,
  score, wpm, overall_accuracy, longest_streak, correct_words, wrong_words,
  words_correct, words_incorrect, ai_analysis, vocabulary_strengths, vocabulary_weaknesses,
  generated_story, created_at, updated_at
)
SELECT 
  s.user_id,
  s.session_status,
  s.difficulty_level,
  s.elapsed_time,
  s.score,
  s.wpm,
  s.overall_accuracy,
  s.longest_streak,
  s.correct_words,
  s.wrong_words,
  s.words_correct,
  s.words_incorrect,
  s.ai_analysis,
  COALESCE(st.vocabulary_strengths, '[]'::jsonb),
  COALESCE(st.vocabulary_weaknesses, '[]'::jsonb),
  st.generated_story,
  s.created_at,
  s.updated_at
FROM old_typing_hero_sessions s
LEFT JOIN old_typing_hero_stats st ON s.user_id = st.user_id;
```

---

## Phase 5: Jobs

### 5.1 `jobs`
**Maps from:** `job_requests` + `processed_job_requests`

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  agency_client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  posted_by UUID REFERENCES agency_recruiters(id),
  
  -- Job Identity
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  
  -- Job Details
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '[]'::jsonb,
  responsibilities JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,
  
  -- Compensation
  salary_min INTEGER,
  salary_max INTEGER,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('hourly', 'monthly', 'yearly')),
  currency TEXT DEFAULT 'PHP',
  
  -- Work Details
  work_arrangement TEXT CHECK (work_arrangement IN ('onsite', 'remote', 'hybrid')),
  work_type TEXT DEFAULT 'full-time' CHECK (work_type IN ('full-time', 'part-time', 'contract', 'internship')),
  shift TEXT DEFAULT 'day' CHECK (shift IN ('day', 'night', 'both')),
  experience_level TEXT CHECK (experience_level IN ('entry-level', 'mid-level', 'senior-level')),
  
  -- Classification
  industry TEXT,
  department TEXT,
  
  -- Status & Priority
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Dates
  application_deadline DATE,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  applicants_count INTEGER DEFAULT 0,
  
  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'import')),
  external_id TEXT,  -- For API-posted jobs
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_agency_client_id ON jobs(agency_client_id);
CREATE INDEX idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_work_arrangement ON jobs(work_arrangement);
CREATE INDEX idx_jobs_shift ON jobs(shift);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_priority ON jobs(priority);
```

**Migration from OLD tables:**
```sql
-- First, we need to create agency_clients records for the old members
-- Then migrate jobs

INSERT INTO jobs (
  agency_client_id, title, slug, description, requirements, responsibilities, benefits,
  salary_min, salary_max, salary_type, currency,
  work_arrangement, work_type, shift, experience_level,
  industry, department, status, priority, application_deadline,
  views, applicants_count, source, created_at, updated_at
)
SELECT 
  ac.id,  -- agency_client_id from new agency_clients table
  jr.job_title,
  -- generate slug
  lower(regexp_replace(jr.job_title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || jr.id,
  jr.job_description,
  to_jsonb(jr.requirements),
  to_jsonb(jr.responsibilities),
  to_jsonb(jr.benefits),
  jr.salary_min,
  jr.salary_max,
  jr.salary_type,
  jr.currency,
  jr.work_arrangement::text,
  jr.work_type,
  jr.shift::text,
  jr.experience_level::text,
  jr.industry,
  jr.department,
  jr.status::text,
  jr.priority::text,
  jr.application_deadline,
  jr.views,
  jr.applicants,
  'manual',
  jr.created_at,
  jr.updated_at
FROM old_processed_job_requests jr
JOIN agency_clients ac ON ac.company_id = jr.company_id;
```

---

### 5.2 `job_skills`

```sql
CREATE TABLE job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  min_years_experience DECIMAL(4, 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(job_id, name)
);

-- Indexes
CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX idx_job_skills_name ON job_skills(name);
```

---

## Phase 6: Application Flow

### 6.1 `job_matches`
**Maps from:** `job_match_results`

```sql
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Match Scores
  overall_score INTEGER NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'interested', 'not_interested', 'applied')),
  
  -- Candidate Action
  candidate_viewed_at TIMESTAMPTZ,
  candidate_action_at TIMESTAMPTZ,
  
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(candidate_id, job_id)
);

-- Indexes
CREATE INDEX idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX idx_job_matches_score ON job_matches(overall_score);
CREATE INDEX idx_job_matches_status ON job_matches(status);
```

**Migration from OLD `job_match_results`:**
```sql
INSERT INTO job_matches (
  candidate_id, job_id, overall_score, breakdown, reasoning, analyzed_at
)
SELECT 
  user_id,
  -- Need to map old job_id (text) to new jobs.id (uuid)
  j.id,
  score,
  breakdown,
  reasoning,
  analyzed_at
FROM old_job_match_results jmr
JOIN jobs j ON j.external_id = jmr.job_id;
```

---

### 6.2 `job_applications`
**Maps from:** `applications`

```sql
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES candidate_resumes(id),
  
  -- Status Flow
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'interviewed',
    'offer_pending',
    'offer_sent',
    'offer_accepted',
    'hired',
    'rejected',
    'withdrawn'
  )),
  
  -- Tracking
  position INTEGER DEFAULT 0,  -- Order in queue
  
  -- Recruiter handling
  reviewed_by UUID REFERENCES agency_recruiters(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Notes
  recruiter_notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(candidate_id, job_id)
);

-- Indexes
CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_reviewed_by ON job_applications(reviewed_by);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at);
```

**Migration from OLD `applications`:**
```sql
INSERT INTO job_applications (
  candidate_id, job_id, resume_id, status, position, created_at, updated_at
)
SELECT 
  a.user_id,
  j.id,  -- Map to new job
  cr.id,  -- Map to new resume
  CASE a.status
    WHEN 'submitted' THEN 'submitted'
    WHEN 'qualified' THEN 'shortlisted'
    WHEN 'for verification' THEN 'under_review'
    WHEN 'verified' THEN 'shortlisted'
    WHEN 'initial interview' THEN 'interview_scheduled'
    WHEN 'final interview' THEN 'interviewed'
    WHEN 'not qualified' THEN 'rejected'
    WHEN 'passed' THEN 'offer_pending'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    WHEN 'hired' THEN 'hired'
    WHEN 'closed' THEN 'rejected'
    WHEN 'failed' THEN 'rejected'
    ELSE 'submitted'
  END,
  a.position,
  a.created_at,
  a.updated_at
FROM old_applications a
JOIN jobs j ON j.external_id = a.job_id::text
LEFT JOIN candidate_resumes cr ON cr.slug = a.resume_slug;
```

---

### 6.3 `job_interviews` (NEW)

```sql
CREATE TABLE job_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  
  -- Interview Details
  interview_type TEXT NOT NULL CHECK (interview_type IN ('screening', 'technical', 'behavioral', 'final', 'other')),
  interview_round INTEGER DEFAULT 1,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,  -- Can be URL for video calls
  meeting_link TEXT,
  
  -- Participants
  interviewer_id UUID REFERENCES agency_recruiters(id),
  interviewer_notes TEXT,
  
  -- Outcome
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  outcome TEXT CHECK (outcome IN ('passed', 'failed', 'pending_decision', 'needs_followup')),
  
  -- Feedback
  feedback JSONB DEFAULT '{}'::jsonb,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_interviews_application_id ON job_interviews(application_id);
CREATE INDEX idx_job_interviews_interviewer_id ON job_interviews(interviewer_id);
CREATE INDEX idx_job_interviews_scheduled_at ON job_interviews(scheduled_at);
CREATE INDEX idx_job_interviews_status ON job_interviews(status);
```

---

### 6.4 `job_offers` (NEW)

```sql
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  
  -- Offer Details
  salary_offered DECIMAL(12, 2) NOT NULL,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('hourly', 'monthly', 'yearly')),
  currency TEXT DEFAULT 'PHP',
  
  start_date DATE,
  
  -- Additional Benefits
  benefits_offered JSONB DEFAULT '[]'::jsonb,
  additional_terms TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn')),
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Response
  candidate_response TEXT,
  rejection_reason TEXT,
  
  -- Who handled it
  created_by UUID REFERENCES agency_recruiters(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_offers_application_id ON job_offers(application_id);
CREATE INDEX idx_job_offers_status ON job_offers(status);
CREATE INDEX idx_job_offers_created_by ON job_offers(created_by);
```

---

## Data Migration Scripts

### Step-by-Step Migration Order

```sql
-- ============================================
-- MIGRATION ORDER - RUN IN THIS SEQUENCE
-- ============================================

-- 1. Create helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create all tables in order (use CREATE TABLE statements above)
-- Phase 1: candidates, bpoc_users, agencies, companies
-- Phase 2: candidate_profiles, bpoc_profiles, agency_profiles, company_profiles
-- Phase 3: agency_recruiters, agency_clients
-- Phase 4: candidate_resumes, candidate_ai_analysis, candidate_skills, candidate_educations, candidate_work_experiences, candidate_disc_assessments, candidate_typing_assessments
-- Phase 5: jobs, job_skills
-- Phase 6: job_matches, job_applications, job_interviews, job_offers

-- 3. BEFORE migrating data, prefix old tables
ALTER TABLE users RENAME TO old_users;
ALTER TABLE members RENAME TO old_members;
ALTER TABLE applications RENAME TO old_applications;
ALTER TABLE job_requests RENAME TO old_job_requests;
ALTER TABLE processed_job_requests RENAME TO old_processed_job_requests;
ALTER TABLE disc_personality_sessions RENAME TO old_disc_personality_sessions;
ALTER TABLE disc_personality_stats RENAME TO old_disc_personality_stats;
ALTER TABLE typing_hero_sessions RENAME TO old_typing_hero_sessions;
ALTER TABLE typing_hero_stats RENAME TO old_typing_hero_stats;
ALTER TABLE resumes_extracted RENAME TO old_resumes_extracted;
ALTER TABLE resumes_generated RENAME TO old_resumes_generated;
ALTER TABLE saved_resumes RENAME TO old_saved_resumes;
ALTER TABLE ai_analysis_results RENAME TO old_ai_analysis_results;
ALTER TABLE job_match_results RENAME TO old_job_match_results;
ALTER TABLE user_work_status RENAME TO old_user_work_status;
ALTER TABLE privacy_settings RENAME TO old_privacy_settings;
ALTER TABLE user_leaderboard_scores RENAME TO old_user_leaderboard_scores;

-- 4. Run INSERT migrations (use migration queries from each table section above)

-- 5. Verify data counts
SELECT 
  (SELECT COUNT(*) FROM candidates) as new_candidates,
  (SELECT COUNT(*) FROM old_users WHERE admin_level = 'user' OR admin_level IS NULL) as old_users;

-- 6. After verification, drop old tables (OPTIONAL - keep as backup)
-- DROP TABLE old_users CASCADE;
-- etc.
```

---

## Enums

If you prefer PostgreSQL enums over CHECK constraints:

```sql
-- Create enums
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'support');
CREATE TYPE recruiter_role AS ENUM ('owner', 'admin', 'recruiter', 'viewer');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE work_status AS ENUM ('employed', 'unemployed', 'freelancer', 'part_time', 'student');
CREATE TYPE shift_type AS ENUM ('day', 'night', 'both');
CREATE TYPE work_setup AS ENUM ('office', 'remote', 'hybrid', 'any');
CREATE TYPE work_arrangement AS ENUM ('onsite', 'remote', 'hybrid');
CREATE TYPE work_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');
CREATE TYPE experience_level AS ENUM ('entry-level', 'mid-level', 'senior-level');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed', 'filled');
CREATE TYPE priority_type AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE application_status AS ENUM (
  'submitted', 'under_review', 'shortlisted', 'interview_scheduled', 
  'interviewed', 'offer_pending', 'offer_sent', 'offer_accepted', 
  'hired', 'rejected', 'withdrawn'
);
CREATE TYPE interview_type AS ENUM ('screening', 'technical', 'behavioral', 'final', 'other');
CREATE TYPE interview_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE interview_outcome AS ENUM ('passed', 'failed', 'pending_decision', 'needs_followup');
CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'prospect', 'churned');
CREATE TYPE skill_proficiency AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE skill_category AS ENUM ('technical', 'soft', 'language', 'tool');
CREATE TYPE match_status AS ENUM ('pending', 'viewed', 'interested', 'not_interested', 'applied');
CREATE TYPE session_status AS ENUM ('started', 'in_progress', 'completed', 'abandoned');
```

---

## Row Level Security (RLS)

### Enable RLS on all tables

```sql
-- Enable RLS
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_disc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_typing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- Candidates can read/write their own data
CREATE POLICY "Candidates can view own data" ON candidates
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Candidates can update own data" ON candidates
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Candidates can view own profile" ON candidate_profiles
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update own profile" ON candidate_profiles
  FOR UPDATE USING (auth.uid() = candidate_id);

-- Public resume viewing (if is_public = true)
CREATE POLICY "Public resumes are viewable" ON candidate_resumes
  FOR SELECT USING (is_public = true OR auth.uid() = candidate_id);

-- Recruiters can view candidates (need to check agency membership)
CREATE POLICY "Recruiters can view candidates" ON candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Add more policies as needed based on your access patterns
```

---

## Summary: Old → New Table Mapping

| OLD Table | NEW Table(s) |
|-----------|-------------|
| `users` | `candidates` + `candidate_profiles` (or `bpoc_users` + `bpoc_profiles` for admins) |
| `members` | `companies` + `company_profiles` + `agency_clients` |
| `agencies` | `agencies` + `agency_profiles` |
| *(new)* | `agency_recruiters` |
| `applications` | `job_applications` |
| `job_requests` + `processed_job_requests` | `jobs` + `job_skills` |
| `job_match_results` | `job_matches` |
| `disc_personality_sessions` + `disc_personality_stats` | `candidate_disc_assessments` |
| `typing_hero_sessions` + `typing_hero_stats` | `candidate_typing_assessments` |
| `resumes_extracted` + `resumes_generated` + `saved_resumes` | `candidate_resumes` |
| `ai_analysis_results` | `candidate_ai_analysis` |
| `user_work_status` | Merged into `candidate_profiles` |
| `privacy_settings` | Merged into `candidate_profiles.privacy_settings` (JSON) |
| `user_leaderboard_scores` | Merged into `candidate_profiles.gamification` (JSON) |
| *(new)* | `job_interviews` |
| *(new)* | `job_offers` |

---

## Next Steps

1. **Create tables in Supabase** - Run Phase 1-6 CREATE TABLE statements
2. **Set up RLS policies** - Secure your data
3. **Export data from Railway** - Use `pg_dump`
4. **Run migration scripts** - Transform and insert data
5. **Update application code** - Point to new tables
6. **Test each flow** - Signup → Profile → Resume → Assessments → Jobs → Apply
7. **Verify data integrity** - Compare counts, spot check records

---

*Generated for BPOC Platform Migration*
*Railway (Prisma) → Supabase*
