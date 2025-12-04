-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'support');

-- CreateEnum
CREATE TYPE "RecruiterRole" AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('employed', 'unemployed', 'freelancer', 'part_time', 'student');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('day', 'night', 'both');

-- CreateEnum
CREATE TYPE "WorkSetup" AS ENUM ('office', 'remote', 'hybrid', 'any');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('onsite', 'remote', 'hybrid');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('full_time', 'part_time', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('entry_level', 'mid_level', 'senior_level');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'active', 'paused', 'closed', 'filled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('screening', 'technical', 'behavioral', 'final', 'other');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('passed', 'failed', 'pending_decision', 'needs_followup');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'inactive', 'prospect', 'churned');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('pending', 'viewed', 'interested', 'not_interested', 'applied');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('started', 'in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('hourly', 'monthly', 'yearly');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('per_hire', 'retainer', 'project');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('manual', 'api', 'import');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('size_1_10', 'size_11_50', 'size_51_200', 'size_201_500', 'size_501_1000', 'size_1000_plus');

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    "phone" TEXT,
    "avatar_url" TEXT,
    "username" TEXT,
    "slug" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpoc_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bpoc_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "api_key" TEXT,
    "api_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "company_size" "CompanySize",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "bio" TEXT,
    "position" TEXT,
    "birthday" DATE,
    "gender" "Gender",
    "gender_custom" TEXT,
    "location" TEXT,
    "location_place_id" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_city" TEXT,
    "location_province" TEXT,
    "location_country" TEXT,
    "location_barangay" TEXT,
    "location_region" TEXT,
    "work_status" "WorkStatus",
    "current_employer" TEXT,
    "current_position" TEXT,
    "current_salary" DECIMAL(12,2),
    "expected_salary_min" DECIMAL(12,2),
    "expected_salary_max" DECIMAL(12,2),
    "notice_period_days" INTEGER,
    "preferred_shift" "Shift",
    "preferred_work_setup" "WorkSetup",
    "privacy_settings" JSONB NOT NULL DEFAULT '{}',
    "gamification" JSONB NOT NULL DEFAULT '{}',
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "profile_completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bpoc_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bpoc_user_id" UUID NOT NULL,
    "bio" TEXT,
    "department" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bpoc_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "description" TEXT,
    "founded_year" INTEGER,
    "employee_count" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "linkedin_url" TEXT,
    "facebook_url" TEXT,
    "twitter_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "description" TEXT,
    "founded_year" INTEGER,
    "employee_count" TEXT,
    "headquarters" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "culture" TEXT,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "tech_stack" JSONB NOT NULL DEFAULT '[]',
    "linkedin_url" TEXT,
    "glassdoor_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_recruiters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "agency_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "RecruiterRole" NOT NULL DEFAULT 'recruiter',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "can_post_jobs" BOOLEAN NOT NULL DEFAULT true,
    "can_manage_applications" BOOLEAN NOT NULL DEFAULT true,
    "can_invite_recruiters" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_clients" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" UUID,
    "invited_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_recruiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "contract_start" DATE,
    "contract_end" DATE,
    "contract_value" DECIMAL(12,2),
    "billing_type" "BillingType",
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "notes" TEXT,
    "added_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "extracted_data" JSONB,
    "generated_data" JSONB,
    "resume_data" JSONB NOT NULL,
    "original_filename" TEXT,
    "file_url" TEXT,
    "template_used" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "generation_metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_ai_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "resume_id" UUID,
    "session_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "ats_compatibility_score" INTEGER,
    "content_quality_score" INTEGER,
    "professional_presentation_score" INTEGER,
    "skills_alignment_score" INTEGER,
    "key_strengths" JSONB NOT NULL DEFAULT '[]',
    "strengths_analysis" JSONB NOT NULL DEFAULT '{}',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "section_analysis" JSONB NOT NULL DEFAULT '{}',
    "improved_summary" TEXT,
    "salary_analysis" JSONB,
    "career_path" JSONB,
    "candidate_profile_snapshot" JSONB,
    "skills_snapshot" JSONB,
    "experience_snapshot" JSONB,
    "education_snapshot" JSONB,
    "analysis_metadata" JSONB,
    "portfolio_links" JSONB,
    "files_analyzed" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "proficiency_level" "SkillProficiency",
    "years_experience" DECIMAL(4,1),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_educations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_work_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "location" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_disc_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "session_status" "SessionStatus" NOT NULL DEFAULT 'completed',
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_seconds" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 30,
    "d_score" INTEGER NOT NULL DEFAULT 0,
    "i_score" INTEGER NOT NULL DEFAULT 0,
    "s_score" INTEGER NOT NULL DEFAULT 0,
    "c_score" INTEGER NOT NULL DEFAULT 0,
    "primary_type" TEXT NOT NULL,
    "secondary_type" TEXT,
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "consistency_index" DECIMAL(5,2),
    "cultural_alignment" INTEGER NOT NULL DEFAULT 95,
    "authenticity_score" INTEGER,
    "ai_assessment" JSONB NOT NULL DEFAULT '{}',
    "ai_bpo_roles" JSONB NOT NULL DEFAULT '[]',
    "core_responses" JSONB NOT NULL DEFAULT '[]',
    "personalized_responses" JSONB NOT NULL DEFAULT '[]',
    "response_patterns" JSONB NOT NULL DEFAULT '{}',
    "user_position" TEXT,
    "user_location" TEXT,
    "user_experience" TEXT,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_disc_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_typing_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "session_status" "SessionStatus" NOT NULL DEFAULT 'completed',
    "difficulty_level" TEXT NOT NULL DEFAULT 'rockstar',
    "elapsed_time" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "wpm" INTEGER NOT NULL DEFAULT 0,
    "overall_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "correct_words" INTEGER NOT NULL DEFAULT 0,
    "wrong_words" INTEGER NOT NULL DEFAULT 0,
    "words_correct" JSONB NOT NULL DEFAULT '[]',
    "words_incorrect" JSONB NOT NULL DEFAULT '[]',
    "ai_analysis" JSONB NOT NULL DEFAULT '{}',
    "vocabulary_strengths" JSONB NOT NULL DEFAULT '[]',
    "vocabulary_weaknesses" JSONB NOT NULL DEFAULT '[]',
    "generated_story" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_typing_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agency_client_id" UUID NOT NULL,
    "posted_by" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_type" "SalaryType" NOT NULL DEFAULT 'monthly',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "work_arrangement" "WorkArrangement",
    "work_type" "WorkType" NOT NULL DEFAULT 'full_time',
    "shift" "Shift" NOT NULL DEFAULT 'day',
    "experience_level" "ExperienceLevel",
    "industry" TEXT,
    "department" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'active',
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "application_deadline" DATE,
    "views" INTEGER NOT NULL DEFAULT 0,
    "applicants_count" INTEGER NOT NULL DEFAULT 0,
    "source" "JobSource" NOT NULL DEFAULT 'manual',
    "external_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "min_years_experience" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "reasoning" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'pending',
    "candidate_viewed_at" TIMESTAMPTZ(6),
    "candidate_action_at" TIMESTAMPTZ(6),
    "analyzed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "resume_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "position" INTEGER NOT NULL DEFAULT 0,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "recruiter_notes" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "interview_type" "InterviewType" NOT NULL,
    "interview_round" INTEGER NOT NULL DEFAULT 1,
    "scheduled_at" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "meeting_link" TEXT,
    "interviewer_id" UUID,
    "interviewer_notes" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "outcome" "InterviewOutcome",
    "feedback" JSONB NOT NULL DEFAULT '{}',
    "rating" INTEGER,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "salary_offered" DECIMAL(12,2) NOT NULL,
    "salary_type" "SalaryType" NOT NULL DEFAULT 'monthly',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "start_date" DATE,
    "benefits_offered" JSONB NOT NULL DEFAULT '[]',
    "additional_terms" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "responded_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "candidate_response" TEXT,
    "rejection_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_username_key" ON "candidates"("username");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_slug_key" ON "candidates"("slug");

-- CreateIndex
CREATE INDEX "idx_candidates_email" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "idx_candidates_username" ON "candidates"("username");

-- CreateIndex
CREATE INDEX "idx_candidates_slug" ON "candidates"("slug");

-- CreateIndex
CREATE INDEX "idx_candidates_created_at" ON "candidates"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bpoc_users_email_key" ON "bpoc_users"("email");

-- CreateIndex
CREATE INDEX "idx_bpoc_users_email" ON "bpoc_users"("email");

-- CreateIndex
CREATE INDEX "idx_bpoc_users_role" ON "bpoc_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_slug_key" ON "agencies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_email_key" ON "agencies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_api_key_key" ON "agencies"("api_key");

-- CreateIndex
CREATE INDEX "idx_agencies_slug" ON "agencies"("slug");

-- CreateIndex
CREATE INDEX "idx_agencies_api_key" ON "agencies"("api_key");

-- CreateIndex
CREATE INDEX "idx_agencies_is_active" ON "agencies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "idx_companies_slug" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "idx_companies_industry" ON "companies"("industry");

-- CreateIndex
CREATE INDEX "idx_companies_is_active" ON "companies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_candidate_id_key" ON "candidate_profiles"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_profiles_candidate_id" ON "candidate_profiles"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_profiles_location_city" ON "candidate_profiles"("location_city");

-- CreateIndex
CREATE INDEX "idx_candidate_profiles_work_status" ON "candidate_profiles"("work_status");

-- CreateIndex
CREATE INDEX "idx_candidate_profiles_preferred_shift" ON "candidate_profiles"("preferred_shift");

-- CreateIndex
CREATE UNIQUE INDEX "bpoc_profiles_bpoc_user_id_key" ON "bpoc_profiles"("bpoc_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agency_profiles_agency_id_key" ON "agency_profiles"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_company_id_key" ON "company_profiles"("company_id");

-- CreateIndex
CREATE INDEX "idx_agency_recruiters_agency_id" ON "agency_recruiters"("agency_id");

-- CreateIndex
CREATE INDEX "idx_agency_recruiters_user_id" ON "agency_recruiters"("user_id");

-- CreateIndex
CREATE INDEX "idx_agency_recruiters_role" ON "agency_recruiters"("role");

-- CreateIndex
CREATE UNIQUE INDEX "agency_recruiters_user_id_agency_id_key" ON "agency_recruiters"("user_id", "agency_id");

-- CreateIndex
CREATE INDEX "idx_agency_clients_agency_id" ON "agency_clients"("agency_id");

-- CreateIndex
CREATE INDEX "idx_agency_clients_company_id" ON "agency_clients"("company_id");

-- CreateIndex
CREATE INDEX "idx_agency_clients_status" ON "agency_clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agency_clients_agency_id_company_id_key" ON "agency_clients"("agency_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_resumes_slug_key" ON "candidate_resumes"("slug");

-- CreateIndex
CREATE INDEX "idx_candidate_resumes_candidate_id" ON "candidate_resumes"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_resumes_slug" ON "candidate_resumes"("slug");

-- CreateIndex
CREATE INDEX "idx_candidate_resumes_is_primary" ON "candidate_resumes"("is_primary");

-- CreateIndex
CREATE INDEX "idx_candidate_resumes_is_public" ON "candidate_resumes"("is_public");

-- CreateIndex
CREATE INDEX "idx_candidate_ai_analysis_candidate_id" ON "candidate_ai_analysis"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_ai_analysis_resume_id" ON "candidate_ai_analysis"("resume_id");

-- CreateIndex
CREATE INDEX "idx_candidate_ai_analysis_overall_score" ON "candidate_ai_analysis"("overall_score");

-- CreateIndex
CREATE INDEX "idx_candidate_ai_analysis_session_id" ON "candidate_ai_analysis"("session_id");

-- CreateIndex
CREATE INDEX "idx_candidate_skills_candidate_id" ON "candidate_skills"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_skills_name" ON "candidate_skills"("name");

-- CreateIndex
CREATE INDEX "idx_candidate_skills_category" ON "candidate_skills"("category");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_skills_candidate_id_name_key" ON "candidate_skills"("candidate_id", "name");

-- CreateIndex
CREATE INDEX "idx_candidate_educations_candidate_id" ON "candidate_educations"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_work_experiences_candidate_id" ON "candidate_work_experiences"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_work_experiences_is_current" ON "candidate_work_experiences"("is_current");

-- CreateIndex
CREATE INDEX "idx_candidate_disc_assessments_candidate_id" ON "candidate_disc_assessments"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_disc_assessments_primary_type" ON "candidate_disc_assessments"("primary_type");

-- CreateIndex
CREATE INDEX "idx_candidate_disc_assessments_confidence" ON "candidate_disc_assessments"("confidence_score");

-- CreateIndex
CREATE INDEX "idx_candidate_disc_assessments_created_at" ON "candidate_disc_assessments"("created_at");

-- CreateIndex
CREATE INDEX "idx_candidate_typing_assessments_candidate_id" ON "candidate_typing_assessments"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_candidate_typing_assessments_wpm" ON "candidate_typing_assessments"("wpm");

-- CreateIndex
CREATE INDEX "idx_candidate_typing_assessments_score" ON "candidate_typing_assessments"("score");

-- CreateIndex
CREATE INDEX "idx_candidate_typing_assessments_accuracy" ON "candidate_typing_assessments"("overall_accuracy");

-- CreateIndex
CREATE INDEX "idx_candidate_typing_assessments_created_at" ON "candidate_typing_assessments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "idx_jobs_agency_client_id" ON "jobs"("agency_client_id");

-- CreateIndex
CREATE INDEX "idx_jobs_posted_by" ON "jobs"("posted_by");

-- CreateIndex
CREATE INDEX "idx_jobs_status" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "idx_jobs_work_arrangement" ON "jobs"("work_arrangement");

-- CreateIndex
CREATE INDEX "idx_jobs_shift" ON "jobs"("shift");

-- CreateIndex
CREATE INDEX "idx_jobs_experience_level" ON "jobs"("experience_level");

-- CreateIndex
CREATE INDEX "idx_jobs_created_at" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "idx_jobs_priority" ON "jobs"("priority");

-- CreateIndex
CREATE INDEX "idx_job_skills_job_id" ON "job_skills"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_skills_name" ON "job_skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_skills_job_id_name_key" ON "job_skills"("job_id", "name");

-- CreateIndex
CREATE INDEX "idx_job_matches_candidate_id" ON "job_matches"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_job_matches_job_id" ON "job_matches"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_matches_score" ON "job_matches"("overall_score");

-- CreateIndex
CREATE INDEX "idx_job_matches_status" ON "job_matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_matches_candidate_id_job_id_key" ON "job_matches"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_job_applications_candidate_id" ON "job_applications"("candidate_id");

-- CreateIndex
CREATE INDEX "idx_job_applications_job_id" ON "job_applications"("job_id");

-- CreateIndex
CREATE INDEX "idx_job_applications_status" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "idx_job_applications_reviewed_by" ON "job_applications"("reviewed_by");

-- CreateIndex
CREATE INDEX "idx_job_applications_created_at" ON "job_applications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_candidate_id_job_id_key" ON "job_applications"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "idx_job_interviews_application_id" ON "job_interviews"("application_id");

-- CreateIndex
CREATE INDEX "idx_job_interviews_interviewer_id" ON "job_interviews"("interviewer_id");

-- CreateIndex
CREATE INDEX "idx_job_interviews_scheduled_at" ON "job_interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_job_interviews_status" ON "job_interviews"("status");

-- CreateIndex
CREATE INDEX "idx_job_offers_application_id" ON "job_offers"("application_id");

-- CreateIndex
CREATE INDEX "idx_job_offers_status" ON "job_offers"("status");

-- CreateIndex
CREATE INDEX "idx_job_offers_created_by" ON "job_offers"("created_by");

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bpoc_profiles" ADD CONSTRAINT "bpoc_profiles_bpoc_user_id_fkey" FOREIGN KEY ("bpoc_user_id") REFERENCES "bpoc_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_profiles" ADD CONSTRAINT "agency_profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_recruiters" ADD CONSTRAINT "agency_recruiters_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_recruiters" ADD CONSTRAINT "agency_recruiters_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "candidate_resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_ai_analysis" ADD CONSTRAINT "candidate_ai_analysis_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_ai_analysis" ADD CONSTRAINT "candidate_ai_analysis_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_educations" ADD CONSTRAINT "candidate_educations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_work_experiences" ADD CONSTRAINT "candidate_work_experiences_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_disc_assessments" ADD CONSTRAINT "candidate_disc_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_typing_assessments" ADD CONSTRAINT "candidate_typing_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_agency_client_id_fkey" FOREIGN KEY ("agency_client_id") REFERENCES "agency_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_interviews" ADD CONSTRAINT "job_interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_interviews" ADD CONSTRAINT "job_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "agency_recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- ADD FOREIGN KEYS TO auth.users
-- ============================================

-- Add foreign key: candidates.id -> auth.users.id
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key: bpoc_users.id -> auth.users.id
ALTER TABLE "bpoc_users" ADD CONSTRAINT "bpoc_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key: agency_recruiters.user_id -> auth.users.id
ALTER TABLE "agency_recruiters" ADD CONSTRAINT "agency_recruiters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD UPDATED_AT TRIGGERS TO ALL TABLES
-- ============================================

CREATE TRIGGER set_candidates_updated_at BEFORE UPDATE ON "candidates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_bpoc_users_updated_at BEFORE UPDATE ON "bpoc_users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_agencies_updated_at BEFORE UPDATE ON "agencies" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON "companies" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_profiles_updated_at BEFORE UPDATE ON "candidate_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_bpoc_profiles_updated_at BEFORE UPDATE ON "bpoc_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_agency_profiles_updated_at BEFORE UPDATE ON "agency_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_company_profiles_updated_at BEFORE UPDATE ON "company_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_agency_recruiters_updated_at BEFORE UPDATE ON "agency_recruiters" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_agency_clients_updated_at BEFORE UPDATE ON "agency_clients" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_resumes_updated_at BEFORE UPDATE ON "candidate_resumes" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_ai_analysis_updated_at BEFORE UPDATE ON "candidate_ai_analysis" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_skills_updated_at BEFORE UPDATE ON "candidate_skills" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_educations_updated_at BEFORE UPDATE ON "candidate_educations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_work_experiences_updated_at BEFORE UPDATE ON "candidate_work_experiences" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_disc_assessments_updated_at BEFORE UPDATE ON "candidate_disc_assessments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_candidate_typing_assessments_updated_at BEFORE UPDATE ON "candidate_typing_assessments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_jobs_updated_at BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_job_matches_updated_at BEFORE UPDATE ON "job_matches" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_job_applications_updated_at BEFORE UPDATE ON "job_applications" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_job_interviews_updated_at BEFORE UPDATE ON "job_interviews" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_job_offers_updated_at BEFORE UPDATE ON "job_offers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD UNIQUE INDEX FOR PRIMARY RESUMES
-- ============================================

CREATE UNIQUE INDEX idx_candidate_resumes_primary 
ON "candidate_resumes"("candidate_id") 
WHERE "is_primary" = true;
