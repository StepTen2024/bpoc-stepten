-- ============================================
-- BPOC Supabase Migration - Initial Schema
-- Creates all tables with relationships to auth.users
-- ============================================

-- 1. Create helper function for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PHASE 1: CORE ENTITIES
-- ============================================

-- 1.1 candidates (references auth.users)
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

CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_username ON candidates(username);
CREATE INDEX idx_candidates_slug ON candidates(slug);
CREATE INDEX idx_candidates_created_at ON candidates(created_at);

CREATE TRIGGER set_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.2 bpoc_users (references auth.users)
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

CREATE INDEX idx_bpoc_users_email ON bpoc_users(email);
CREATE INDEX idx_bpoc_users_role ON bpoc_users(role);

CREATE TRIGGER set_bpoc_users_updated_at
  BEFORE UPDATE ON bpoc_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.3 agencies
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

CREATE INDEX idx_agencies_slug ON agencies(slug);
CREATE INDEX idx_agencies_api_key ON agencies(api_key);
CREATE INDEX idx_agencies_is_active ON agencies(is_active);

CREATE TRIGGER set_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.4 companies
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

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_is_active ON companies(is_active);

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 2: PROFILES
-- ============================================

-- 2.1 candidate_profiles
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  bio TEXT,
  position TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  gender_custom TEXT,
  location TEXT,
  location_place_id TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_city TEXT,
  location_province TEXT,
  location_country TEXT,
  location_barangay TEXT,
  location_region TEXT,
  work_status TEXT CHECK (work_status IN ('employed', 'unemployed', 'freelancer', 'part_time', 'student')),
  current_employer TEXT,
  current_position TEXT,
  current_salary DECIMAL(12, 2),
  expected_salary_min DECIMAL(12, 2),
  expected_salary_max DECIMAL(12, 2),
  notice_period_days INTEGER,
  preferred_shift TEXT CHECK (preferred_shift IN ('day', 'night', 'both')),
  preferred_work_setup TEXT CHECK (preferred_work_setup IN ('office', 'remote', 'hybrid', 'any')),
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
  gamification JSONB DEFAULT '{
    "total_xp": 0,
    "tier": "Bronze",
    "badges": [],
    "rank_position": 0
  }'::jsonb,
  profile_completed BOOLEAN DEFAULT false,
  profile_completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidate_profiles_candidate_id ON candidate_profiles(candidate_id);
CREATE INDEX idx_candidate_profiles_location_city ON candidate_profiles(location_city);
CREATE INDEX idx_candidate_profiles_work_status ON candidate_profiles(work_status);
CREATE INDEX idx_candidate_profiles_preferred_shift ON candidate_profiles(preferred_shift);

CREATE TRIGGER set_candidate_profiles_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.2 bpoc_profiles
CREATE TABLE bpoc_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bpoc_user_id UUID UNIQUE NOT NULL REFERENCES bpoc_users(id) ON DELETE CASCADE,
  bio TEXT,
  department TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_bpoc_profiles_updated_at
  BEFORE UPDATE ON bpoc_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.3 agency_profiles
CREATE TABLE agency_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID UNIQUE NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  description TEXT,
  founded_year INTEGER,
  employee_count TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{
    "primary_color": "#000000",
    "secondary_color": "#ffffff"
  }'::jsonb,
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_agency_profiles_updated_at
  BEFORE UPDATE ON agency_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.4 company_profiles
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT,
  founded_year INTEGER,
  employee_count TEXT,
  headquarters TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  culture TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  linkedin_url TEXT,
  glassdoor_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 3: RELATIONSHIPS
-- ============================================

-- 3.1 agency_recruiters (references auth.users)
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

CREATE INDEX idx_agency_recruiters_user_id ON agency_recruiters(user_id);
CREATE INDEX idx_agency_recruiters_agency_id ON agency_recruiters(agency_id);
CREATE INDEX idx_agency_recruiters_role ON agency_recruiters(role);

CREATE TRIGGER set_agency_recruiters_updated_at
  BEFORE UPDATE ON agency_recruiters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 agency_clients
CREATE TABLE agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'churned')),
  contract_start DATE,
  contract_end DATE,
  contract_value DECIMAL(12, 2),
  billing_type TEXT CHECK (billing_type IN ('per_hire', 'retainer', 'project')),
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  notes TEXT,
  added_by UUID REFERENCES agency_recruiters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, company_id)
);

CREATE INDEX idx_agency_clients_agency_id ON agency_clients(agency_id);
CREATE INDEX idx_agency_clients_company_id ON agency_clients(company_id);
CREATE INDEX idx_agency_clients_status ON agency_clients(status);

CREATE TRIGGER set_agency_clients_updated_at
  BEFORE UPDATE ON agency_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 4: CANDIDATE DATA
-- ============================================

-- 4.1 candidate_resumes
CREATE TABLE candidate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  extracted_data JSONB,
  generated_data JSONB,
  resume_data JSONB NOT NULL,
  original_filename TEXT,
  file_url TEXT,
  template_used TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  generation_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidate_resumes_candidate_id ON candidate_resumes(candidate_id);
CREATE INDEX idx_candidate_resumes_slug ON candidate_resumes(slug);
CREATE INDEX idx_candidate_resumes_is_primary ON candidate_resumes(is_primary);
CREATE INDEX idx_candidate_resumes_is_public ON candidate_resumes(is_public);

CREATE UNIQUE INDEX idx_candidate_resumes_primary 
ON candidate_resumes(candidate_id) 
WHERE is_primary = true;

CREATE TRIGGER set_candidate_resumes_updated_at
  BEFORE UPDATE ON candidate_resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 candidate_ai_analysis
CREATE TABLE candidate_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES candidate_resumes(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  ats_compatibility_score INTEGER,
  content_quality_score INTEGER,
  professional_presentation_score INTEGER,
  skills_alignment_score INTEGER,
  key_strengths JSONB DEFAULT '[]'::jsonb,
  strengths_analysis JSONB DEFAULT '{}'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  section_analysis JSONB DEFAULT '{}'::jsonb,
  improved_summary TEXT,
  salary_analysis JSONB,
  career_path JSONB,
  candidate_profile_snapshot JSONB,
  skills_snapshot JSONB,
  experience_snapshot JSONB,
  education_snapshot JSONB,
  analysis_metadata JSONB,
  portfolio_links JSONB,
  files_analyzed JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidate_ai_analysis_candidate_id ON candidate_ai_analysis(candidate_id);
CREATE INDEX idx_candidate_ai_analysis_resume_id ON candidate_ai_analysis(resume_id);
CREATE INDEX idx_candidate_ai_analysis_overall_score ON candidate_ai_analysis(overall_score);
CREATE INDEX idx_candidate_ai_analysis_session_id ON candidate_ai_analysis(session_id);

CREATE TRIGGER set_candidate_ai_analysis_updated_at
  BEFORE UPDATE ON candidate_ai_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.3 candidate_skills
CREATE TABLE candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience DECIMAL(4, 1),
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, name)
);

CREATE INDEX idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX idx_candidate_skills_name ON candidate_skills(name);
CREATE INDEX idx_candidate_skills_category ON candidate_skills(category);

CREATE TRIGGER set_candidate_skills_updated_at
  BEFORE UPDATE ON candidate_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.4 candidate_educations
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

CREATE INDEX idx_candidate_educations_candidate_id ON candidate_educations(candidate_id);

CREATE TRIGGER set_candidate_educations_updated_at
  BEFORE UPDATE ON candidate_educations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.5 candidate_work_experiences
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

CREATE INDEX idx_candidate_work_experiences_candidate_id ON candidate_work_experiences(candidate_id);
CREATE INDEX idx_candidate_work_experiences_is_current ON candidate_work_experiences(is_current);

CREATE TRIGGER set_candidate_work_experiences_updated_at
  BEFORE UPDATE ON candidate_work_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.6 candidate_disc_assessments
CREATE TABLE candidate_disc_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  session_status TEXT DEFAULT 'completed' CHECK (session_status IN ('started', 'in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_questions INTEGER DEFAULT 30,
  d_score INTEGER DEFAULT 0,
  i_score INTEGER DEFAULT 0,
  s_score INTEGER DEFAULT 0,
  c_score INTEGER DEFAULT 0,
  primary_type TEXT NOT NULL,
  secondary_type TEXT,
  confidence_score INTEGER DEFAULT 0,
  consistency_index DECIMAL(5, 2),
  cultural_alignment INTEGER DEFAULT 95,
  authenticity_score INTEGER,
  ai_assessment JSONB DEFAULT '{}'::jsonb,
  ai_bpo_roles JSONB DEFAULT '[]'::jsonb,
  core_responses JSONB DEFAULT '[]'::jsonb,
  personalized_responses JSONB DEFAULT '[]'::jsonb,
  response_patterns JSONB DEFAULT '{}'::jsonb,
  user_position TEXT,
  user_location TEXT,
  user_experience TEXT,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidate_disc_assessments_candidate_id ON candidate_disc_assessments(candidate_id);
CREATE INDEX idx_candidate_disc_assessments_primary_type ON candidate_disc_assessments(primary_type);
CREATE INDEX idx_candidate_disc_assessments_confidence ON candidate_disc_assessments(confidence_score);
CREATE INDEX idx_candidate_disc_assessments_created_at ON candidate_disc_assessments(created_at);

CREATE TRIGGER set_candidate_disc_assessments_updated_at
  BEFORE UPDATE ON candidate_disc_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.7 candidate_typing_assessments
CREATE TABLE candidate_typing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  session_status TEXT DEFAULT 'completed' CHECK (session_status IN ('started', 'in_progress', 'completed', 'abandoned')),
  difficulty_level TEXT DEFAULT 'rockstar',
  elapsed_time INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  wpm INTEGER DEFAULT 0,
  overall_accuracy DECIMAL(5, 2) DEFAULT 0.00,
  longest_streak INTEGER DEFAULT 0,
  correct_words INTEGER DEFAULT 0,
  wrong_words INTEGER DEFAULT 0,
  words_correct JSONB DEFAULT '[]'::jsonb,
  words_incorrect JSONB DEFAULT '[]'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  vocabulary_strengths JSONB DEFAULT '[]'::jsonb,
  vocabulary_weaknesses JSONB DEFAULT '[]'::jsonb,
  generated_story TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidate_typing_assessments_candidate_id ON candidate_typing_assessments(candidate_id);
CREATE INDEX idx_candidate_typing_assessments_wpm ON candidate_typing_assessments(wpm);
CREATE INDEX idx_candidate_typing_assessments_score ON candidate_typing_assessments(score);
CREATE INDEX idx_candidate_typing_assessments_accuracy ON candidate_typing_assessments(overall_accuracy);
CREATE INDEX idx_candidate_typing_assessments_created_at ON candidate_typing_assessments(created_at);

CREATE TRIGGER set_candidate_typing_assessments_updated_at
  BEFORE UPDATE ON candidate_typing_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 5: JOBS
-- ============================================

-- 5.1 jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  posted_by UUID REFERENCES agency_recruiters(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '[]'::jsonb,
  responsibilities JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('hourly', 'monthly', 'yearly')),
  currency TEXT DEFAULT 'PHP',
  work_arrangement TEXT CHECK (work_arrangement IN ('onsite', 'remote', 'hybrid')),
  work_type TEXT DEFAULT 'full-time' CHECK (work_type IN ('full-time', 'part-time', 'contract', 'internship')),
  shift TEXT DEFAULT 'day' CHECK (shift IN ('day', 'night', 'both')),
  experience_level TEXT CHECK (experience_level IN ('entry-level', 'mid-level', 'senior-level')),
  industry TEXT,
  department TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  application_deadline DATE,
  views INTEGER DEFAULT 0,
  applicants_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'import')),
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_agency_client_id ON jobs(agency_client_id);
CREATE INDEX idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_work_arrangement ON jobs(work_arrangement);
CREATE INDEX idx_jobs_shift ON jobs(shift);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_priority ON jobs(priority);

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5.2 job_skills
CREATE TABLE job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  min_years_experience DECIMAL(4, 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, name)
);

CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX idx_job_skills_name ON job_skills(name);

-- ============================================
-- PHASE 6: APPLICATION FLOW
-- ============================================

-- 6.1 job_matches
CREATE TABLE job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  breakdown JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'interested', 'not_interested', 'applied')),
  candidate_viewed_at TIMESTAMPTZ,
  candidate_action_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX idx_job_matches_score ON job_matches(overall_score);
CREATE INDEX idx_job_matches_status ON job_matches(status);

CREATE TRIGGER set_job_matches_updated_at
  BEFORE UPDATE ON job_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6.2 job_applications
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES candidate_resumes(id),
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
  position INTEGER DEFAULT 0,
  reviewed_by UUID REFERENCES agency_recruiters(id),
  reviewed_at TIMESTAMPTZ,
  recruiter_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_reviewed_by ON job_applications(reviewed_by);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at);

CREATE TRIGGER set_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6.3 job_interviews
CREATE TABLE job_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('screening', 'technical', 'behavioral', 'final', 'other')),
  interview_round INTEGER DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  interviewer_id UUID REFERENCES agency_recruiters(id),
  interviewer_notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  outcome TEXT CHECK (outcome IN ('passed', 'failed', 'pending_decision', 'needs_followup')),
  feedback JSONB DEFAULT '{}'::jsonb,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_interviews_application_id ON job_interviews(application_id);
CREATE INDEX idx_job_interviews_interviewer_id ON job_interviews(interviewer_id);
CREATE INDEX idx_job_interviews_scheduled_at ON job_interviews(scheduled_at);
CREATE INDEX idx_job_interviews_status ON job_interviews(status);

CREATE TRIGGER set_job_interviews_updated_at
  BEFORE UPDATE ON job_interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6.4 job_offers
CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  salary_offered DECIMAL(12, 2) NOT NULL,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('hourly', 'monthly', 'yearly')),
  currency TEXT DEFAULT 'PHP',
  start_date DATE,
  benefits_offered JSONB DEFAULT '[]'::jsonb,
  additional_terms TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  candidate_response TEXT,
  rejection_reason TEXT,
  created_by UUID REFERENCES agency_recruiters(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_offers_application_id ON job_offers(application_id);
CREATE INDEX idx_job_offers_status ON job_offers(status);
CREATE INDEX idx_job_offers_created_by ON job_offers(created_by);

CREATE TRIGGER set_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETE!
-- ============================================
-- All tables created with proper relationships to auth.users
-- Ready to migrate data from Railway

