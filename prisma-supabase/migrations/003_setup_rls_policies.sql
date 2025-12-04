-- ============================================
-- BPOC Supabase Migration - Row Level Security (RLS) Policies
-- Sets up security policies for all tables
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpoc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bpoc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_disc_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_typing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

-- Agency/Recruiter tables (more restrictive)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CANDIDATE POLICIES
-- ============================================

-- Candidates can view and update their own data
CREATE POLICY "Candidates can view own data" ON candidates
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Candidates can update own data" ON candidates
  FOR UPDATE USING (auth.uid() = id);

-- Candidate profiles
CREATE POLICY "Candidates can view own profile" ON candidate_profiles
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update own profile" ON candidate_profiles
  FOR UPDATE USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can insert own profile" ON candidate_profiles
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

-- Public resume viewing (if is_public = true)
CREATE POLICY "Public resumes are viewable" ON candidate_resumes
  FOR SELECT USING (is_public = true OR auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own resumes" ON candidate_resumes
  FOR ALL USING (auth.uid() = candidate_id);

-- Candidate data tables
CREATE POLICY "Candidates can manage own ai_analysis" ON candidate_ai_analysis
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own skills" ON candidate_skills
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own educations" ON candidate_educations
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own work_experiences" ON candidate_work_experiences
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own disc_assessments" ON candidate_disc_assessments
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can manage own typing_assessments" ON candidate_typing_assessments
  FOR ALL USING (auth.uid() = candidate_id);

-- ============================================
-- JOB APPLICATION POLICIES
-- ============================================

-- Candidates can view and create their own applications
CREATE POLICY "Candidates can view own applications" ON job_applications
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can create own applications" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update own applications" ON job_applications
  FOR UPDATE USING (auth.uid() = candidate_id);

-- Job matches
CREATE POLICY "Candidates can view own matches" ON job_matches
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update own matches" ON job_matches
  FOR UPDATE USING (auth.uid() = candidate_id);

-- ============================================
-- RECRUITER POLICIES
-- ============================================

-- Recruiters can view candidates (for matching)
CREATE POLICY "Recruiters can view candidates" ON candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Recruiters can view candidate profiles
CREATE POLICY "Recruiters can view candidate profiles" ON candidate_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Recruiters can view resumes
CREATE POLICY "Recruiters can view resumes" ON candidate_resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Recruiters can manage their agency
CREATE POLICY "Recruiters can view own agency" ON agencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      WHERE ar.agency_id = agencies.id AND ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Recruiters can manage own agency profile" ON agency_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN agencies a ON a.id = ar.agency_id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND a.id = agency_profiles.agency_id
    )
  );

-- Recruiters can view their own recruiter record
CREATE POLICY "Recruiters can view own record" ON agency_recruiters
  FOR SELECT USING (auth.uid() = user_id);

-- Recruiters can manage applications for their agency's jobs
CREATE POLICY "Recruiters can view applications" ON job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN jobs j ON j.posted_by = ar.id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND j.id = job_applications.job_id
    )
  );

CREATE POLICY "Recruiters can update applications" ON job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN jobs j ON j.posted_by = ar.id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ar.can_manage_applications = true
        AND j.id = job_applications.job_id
    )
  );

-- Recruiters can manage interviews
CREATE POLICY "Recruiters can manage interviews" ON job_interviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN job_applications ja ON ja.job_id IN (
        SELECT j.id FROM jobs j WHERE j.posted_by = ar.id
      )
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ja.id = job_interviews.application_id
    )
  );

-- Recruiters can manage offers
CREATE POLICY "Recruiters can manage offers" ON job_offers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN job_applications ja ON ja.job_id IN (
        SELECT j.id FROM jobs j WHERE j.posted_by = ar.id
      )
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ja.id = job_offers.application_id
    )
  );

-- Recruiters can view and manage jobs
CREATE POLICY "Recruiters can view agency jobs" ON jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN agency_clients ac ON ac.agency_id = ar.agency_id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ac.id = jobs.agency_client_id
    )
  );

CREATE POLICY "Recruiters can create jobs" ON jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN agency_clients ac ON ac.agency_id = ar.agency_id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ar.can_post_jobs = true
        AND ac.id = jobs.agency_client_id
    )
  );

CREATE POLICY "Recruiters can update jobs" ON jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agency_recruiters ar
      JOIN agency_clients ac ON ac.agency_id = ar.agency_id
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
        AND ar.can_post_jobs = true
        AND ac.id = jobs.agency_client_id
    )
  );

-- ============================================
-- BPOC ADMIN POLICIES
-- ============================================

-- BPOC admins can view everything
CREATE POLICY "BPOC admins can view all candidates" ON candidates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bpoc_users bu
      WHERE bu.id = auth.uid() AND bu.is_active = true
    )
  );

CREATE POLICY "BPOC admins can manage all data" ON candidate_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bpoc_users bu
      WHERE bu.id = auth.uid() AND bu.is_active = true
    )
  );

-- ============================================
-- PUBLIC POLICIES (for job listings)
-- ============================================

-- Public can view active jobs
CREATE POLICY "Public can view active jobs" ON jobs
  FOR SELECT USING (status = 'active');

-- Public can view companies
CREATE POLICY "Public can view companies" ON companies
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view company profiles" ON company_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_profiles.company_id AND c.is_active = true
    )
  );

-- ============================================
-- COMPLETE!
-- ============================================
-- RLS policies are now set up for:
-- - Candidates (own data only)
-- - Recruiters (agency data)
-- - BPOC Admins (all data)
-- - Public (active jobs and companies)


