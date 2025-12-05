/**
 * Comprehensive Data Migration Script
 * Migrates data from Railway to Supabase with schema transformation
 * 
 * IMPORTANT: 
 * 1. Ensure Supabase schema is set up (run migrations first)
 * 2. Test with a small batch first
 * 3. Backup both databases before running
 */

import { prismaRailway, prismaSupabase } from './src/lib/prisma-clients';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface MigrationStats {
  candidates: number;
  bpocUsers: number;
  profiles: number;
  resumes: number;
  discAssessments: number;
  typingAssessments: number;
  aiAnalysis: number;
  jobs: number;
  applications: number;
  errors: string[];
}

const stats: MigrationStats = {
  candidates: 0,
  bpocUsers: 0,
  profiles: 0,
  resumes: 0,
  discAssessments: 0,
  typingAssessments: 0,
  aiAnalysis: 0,
  jobs: 0,
  applications: 0,
  companies: 0,
  agencies: 0,
  jobMatches: 0,
  errors: [],
};

// Helper: Check if user exists in auth.users
async function userExistsInAuth(userId: string): Promise<boolean> {
  try {
    const result = await prismaSupabase.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
    `;
    return result.length > 0;
  } catch {
    return false;
  }
}

// Helper: Transform work_status enum
function transformWorkStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  
  const mapping: Record<string, string> = {
    'employed': 'employed',
    'unemployed-looking-for-work': 'unemployed',
    'freelancer': 'freelancer',
    'part-time': 'part_time',
    'student': 'student',
  };
  
  return mapping[status] || 'unemployed';
}

// Helper: Transform work_setup enum
function transformWorkSetup(setup: string | null | undefined): string | null {
  if (!setup) return null;
  
  const mapping: Record<string, string> = {
    'Work From Office': 'office',
    'Work From Home': 'remote',
    'Hybrid': 'hybrid',
    'Any': 'any',
  };
  
  return mapping[setup] || null;
}

// Helper: Transform application status
function transformApplicationStatus(status: string): string {
  const mapping: Record<string, string> = {
    'submitted': 'submitted',
    'qualified': 'under_review',
    'for verification': 'under_review',
    'verified': 'under_review',
    'initial interview': 'interview_scheduled',
    'final interview': 'interviewed',
    'not qualified': 'rejected',
    'passed': 'shortlisted',
    'rejected': 'rejected',
    'withdrawn': 'withdrawn',
    'hired': 'hired',
    'closed': 'closed',
    'failed': 'rejected',
  };
  
  return mapping[status] || 'submitted';
}

// Helper: Transform work_type enum
function transformWorkType(workType: string | null | undefined): string {
  if (!workType) return 'full_time';
  
  const mapping: Record<string, string> = {
    'full-time': 'full_time',
    'part-time': 'part_time',
    'full_time': 'full_time',
    'part_time': 'part_time',
    'contract': 'contract',
    'internship': 'internship',
  };
  
  return mapping[workType.toLowerCase()] || 'full_time';
}

// Phase 1: Migrate Users → Candidates/BpocUsers
async function migrateUsers() {
  console.log('\n📦 Phase 1: Migrating Users...\n');
  
  const batchSize = 50;
  const totalUsers = await prismaRailway.user.count();
  console.log(`Found ${totalUsers} users in Railway\n`);

  for (let skip = 0; skip < totalUsers; skip += batchSize) {
    const users = await prismaRailway.user.findMany({
      take: batchSize,
      skip: skip,
      include: {
        workStatus: true,
        privacySettings: true,
        leaderboardScore: true,
      },
    });

    for (const user of users) {
      try {
        // Check if user exists in auth.users
        const existsInAuth = await userExistsInAuth(user.id);
        if (!existsInAuth) {
          console.log(`⚠️  User ${user.email} (${user.id}) not found in auth.users - skipping`);
          stats.errors.push(`User ${user.email} missing from auth.users`);
          continue;
        }

        // Determine if admin or candidate
        const isAdmin = user.admin_level && ['admin', 'super_admin', 'support'].includes(user.admin_level);

        if (isAdmin) {
          // Migrate to bpoc_users (using raw SQL to avoid generated column issue)
          const role = user.admin_level === 'super_admin' ? 'super_admin' : 
                       user.admin_level === 'support' ? 'support' : 'admin';
          
          await prismaSupabase.$executeRaw`
            INSERT INTO bpoc_users (id, email, first_name, last_name, phone, avatar_url, role, is_active, created_at, updated_at)
            VALUES (${user.id}::uuid, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.phone}, ${user.avatar_url}, ${role}::text, true, ${user.created_at || new Date()}::timestamptz, ${user.updated_at || new Date()}::timestamptz)
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              phone = EXCLUDED.phone,
              avatar_url = EXCLUDED.avatar_url,
              updated_at = EXCLUDED.updated_at
          `;
          stats.bpocUsers++;
        } else {
          // Migrate to candidates (using raw SQL to avoid generated column issue)
          await prismaSupabase.$executeRaw`
            INSERT INTO candidates (id, email, first_name, last_name, phone, avatar_url, username, slug, is_active, email_verified, created_at, updated_at)
            VALUES (${user.id}::uuid, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.phone}, ${user.avatar_url}, ${user.username}, ${user.slug}, true, false, ${user.created_at || new Date()}::timestamptz, ${user.updated_at || new Date()}::timestamptz)
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              phone = EXCLUDED.phone,
              avatar_url = EXCLUDED.avatar_url,
              username = EXCLUDED.username,
              slug = EXCLUDED.slug,
              updated_at = EXCLUDED.updated_at
          `;
          stats.candidates++;

          // Migrate profile data
          await migrateCandidateProfile(user);
        }
      } catch (error: any) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        stats.errors.push(`User ${user.email}: ${error.message}`);
      }
    }

    console.log(`Progress: ${Math.min(skip + batchSize, totalUsers)}/${totalUsers} users processed`);
  }

  console.log(`\n✅ Phase 1 Complete: ${stats.candidates} candidates, ${stats.bpocUsers} admins`);
}

// Phase 1.5: Migrate Candidate Profiles
async function migrateCandidateProfile(user: any) {
  try {
    // Build privacy_settings JSON
    const privacySettings = user.privacySettings ? {
      username: user.privacySettings.username || 'public',
      first_name: user.privacySettings.first_name || 'public',
      last_name: user.privacySettings.last_name || 'only-me',
      location: user.privacySettings.location || 'public',
      job_title: user.privacySettings.job_title || 'public',
      birthday: user.privacySettings.birthday || 'only-me',
      age: user.privacySettings.age || 'only-me',
      gender: user.privacySettings.gender || 'only-me',
      resume_score: user.privacySettings.resume_score || 'public',
      key_strengths: user.privacySettings.key_strengths || 'only-me',
    } : {};

    // Build gamification JSON
    const gamification = user.leaderboardScore ? {
      total_xp: user.leaderboardScore.overall_score || 0,
      tier: user.leaderboardScore.tier || 'Bronze',
      badges: [],
      rank_position: user.leaderboardScore.rank_position || 0,
    } : {
      total_xp: 0,
      tier: 'Bronze',
      badges: [],
      rank_position: 0,
    };

    await prismaSupabase.candidate_profiles.upsert({
      where: { candidate_id: user.id },
      create: {
        candidate_id: user.id,
        bio: user.bio || null,
        position: user.position || null,
        birthday: user.birthday || null,
        gender: (user.gender as any) || null,
        gender_custom: user.gender_custom || null,
        location: user.location || null,
        location_place_id: user.location_place_id || null,
        location_lat: user.location_lat || null,
        location_lng: user.location_lng || null,
        location_city: user.location_city || null,
        location_province: user.location_province || null,
        location_country: user.location_country || null,
        location_barangay: user.location_barangay || null,
        location_region: user.location_region || null,
        work_status: user.workStatus ? transformWorkStatus(user.workStatus.work_status_new || user.workStatus.work_status) : null,
        current_employer: user.workStatus?.current_employer || null,
        current_position: user.workStatus?.current_position || null,
        current_salary: user.workStatus?.current_salary || null,
        expected_salary_min: user.workStatus?.minimum_salary_range || null,
        expected_salary_max: user.workStatus?.maximum_salary_range || null,
        notice_period_days: user.workStatus?.notice_period_days || null,
        preferred_shift: (user.workStatus?.preferred_shift as any) || null,
        preferred_work_setup: transformWorkSetup(user.workStatus?.work_setup) as any,
        privacy_settings: privacySettings as any,
        gamification: gamification as any,
        profile_completed: user.completed_data || false,
        profile_completion_percentage: user.completed_data ? 100 : 0,
        created_at: user.created_at || new Date(),
        updated_at: user.updated_at || new Date(),
      },
      update: {
        bio: user.bio || null,
        position: user.position || null,
        birthday: user.birthday || null,
        gender: (user.gender as any) || null,
        gender_custom: user.gender_custom || null,
        location: user.location || null,
        location_place_id: user.location_place_id || null,
        location_lat: user.location_lat || null,
        location_lng: user.location_lng || null,
        location_city: user.location_city || null,
        location_province: user.location_province || null,
        location_country: user.location_country || null,
        location_barangay: user.location_barangay || null,
        location_region: user.location_region || null,
        work_status: user.workStatus ? transformWorkStatus(user.workStatus.work_status_new || user.workStatus.work_status) : null,
        current_employer: user.workStatus?.current_employer || null,
        current_position: user.workStatus?.current_position || null,
        current_salary: user.workStatus?.current_salary || null,
        expected_salary_min: user.workStatus?.minimum_salary_range || null,
        expected_salary_max: user.workStatus?.maximum_salary_range || null,
        notice_period_days: user.workStatus?.notice_period_days || null,
        preferred_shift: (user.workStatus?.preferred_shift as any) || null,
        preferred_work_setup: transformWorkSetup(user.workStatus?.work_setup) as any,
        privacy_settings: privacySettings as any,
        gamification: gamification as any,
        profile_completed: user.completed_data || false,
        profile_completion_percentage: user.completed_data ? 100 : 0,
        updated_at: user.updated_at || new Date(),
      },
    });
    stats.profiles++;
  } catch (error: any) {
    console.error(`❌ Error migrating profile for user ${user.id}:`, error.message);
    stats.errors.push(`Profile ${user.id}: ${error.message}`);
  }
}

// Phase 2: Migrate Resumes
async function migrateResumes() {
  console.log('\n📄 Phase 2: Migrating Resumes...\n');

  // Get all users who have resumes
  const usersWithResumes = await prismaRailway.user.findMany({
    include: {
      resumesExtracted: true,
      resumesGenerated: true,
      savedResumes: true,
    },
  });

  for (const user of usersWithResumes) {
    try {
      // Migrate extracted resume
      if (user.resumesExtracted) {
        const extracted = user.resumesExtracted;
        const slug = `extracted-${user.id}`;
        
        await prismaSupabase.candidate_resumes.upsert({
          where: { slug },
          create: {
            candidate_id: user.id,
            slug,
            title: 'Extracted Resume',
            extracted_data: extracted.resume_data as any,
            resume_data: extracted.resume_data as any,
            original_filename: extracted.original_filename || null,
            is_primary: false,
            is_public: true,
            created_at: extracted.created_at || new Date(),
            updated_at: extracted.updated_at || new Date(),
          },
          update: {
            extracted_data: extracted.resume_data as any,
            resume_data: extracted.resume_data as any,
            updated_at: extracted.updated_at || new Date(),
          },
        });
        stats.resumes++;
      }

      // Migrate generated resumes
      if (user.resumesGenerated) {
        const generated = user.resumesGenerated;
        const slug = `generated-${user.id}`;
        
        await prismaSupabase.candidate_resumes.upsert({
          where: { slug },
          create: {
            candidate_id: user.id,
            slug,
            title: 'Generated Resume',
            generated_data: generated.generated_resume_data as any,
            resume_data: generated.generated_resume_data as any,
            template_used: generated.template_used || null,
            generation_metadata: generated.generation_metadata as any,
            is_primary: false,
            is_public: true,
            created_at: generated.created_at || new Date(),
            updated_at: generated.updated_at || new Date(),
          },
          update: {
            generated_data: generated.generated_resume_data as any,
            resume_data: generated.generated_resume_data as any,
            updated_at: generated.updated_at || new Date(),
          },
        });
        stats.resumes++;
      }

      // Migrate saved resumes
      const savedResumes = await prismaRailway.savedResume.findMany({
        where: { user_id: user.id },
      });

      for (const saved of savedResumes) {
        await prismaSupabase.candidate_resumes.upsert({
          where: { slug: saved.resume_slug },
          create: {
            candidate_id: user.id,
            slug: saved.resume_slug,
            title: saved.resume_title,
            resume_data: saved.resume_data as any,
            template_used: saved.template_used || null,
            is_primary: false,
            is_public: saved.is_public ?? true,
            view_count: saved.view_count || 0,
            created_at: saved.created_at || new Date(),
            updated_at: saved.updated_at || new Date(),
          },
          update: {
            title: saved.resume_title,
            resume_data: saved.resume_data as any,
            is_public: saved.is_public ?? true,
            view_count: saved.view_count || 0,
            updated_at: saved.updated_at || new Date(),
          },
        });
        stats.resumes++;
      }
    } catch (error: any) {
      console.error(`❌ Error migrating resumes for user ${user.id}:`, error.message);
      stats.errors.push(`Resumes ${user.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 2 Complete: ${stats.resumes} resumes migrated`);
}

// Phase 3: Migrate DISC Assessments
async function migrateDiscAssessments() {
  console.log('\n🎯 Phase 3: Migrating DISC Assessments...\n');

  const sessions = await prismaRailway.discPersonalitySession.findMany({
    orderBy: { created_at: 'asc' },
  });

  for (const session of sessions) {
    try {
      await prismaSupabase.candidate_disc_assessments.create({
        data: {
          candidate_id: session.user_id,
          session_status: (session.session_status || 'completed') as any,
          started_at: session.started_at,
          finished_at: session.finished_at || null,
          duration_seconds: session.duration_seconds || null,
          total_questions: session.total_questions || 30,
          d_score: session.d_score,
          i_score: session.i_score,
          s_score: session.s_score,
          c_score: session.c_score,
          primary_type: session.primary_type,
          secondary_type: session.secondary_type || null,
          confidence_score: session.confidence_score || 0,
          consistency_index: session.consistency_index || null,
          cultural_alignment: session.cultural_alignment || 95,
          authenticity_score: null,
          ai_assessment: (session.ai_assessment || {}) as any,
          ai_bpo_roles: (session.ai_bpo_roles || []) as any,
          core_responses: (session.core_responses || []) as any,
          personalized_responses: (session.personalized_responses || []) as any,
          response_patterns: (session.response_patterns || {}) as any,
          user_position: session.user_position || null,
          user_location: session.user_location || null,
          user_experience: session.user_experience || null,
          xp_earned: 0,
          created_at: session.created_at || new Date(),
          updated_at: session.updated_at || new Date(),
        },
      });
      stats.discAssessments++;
    } catch (error: any) {
      console.error(`❌ Error migrating DISC session ${session.id}:`, error.message);
      stats.errors.push(`DISC ${session.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 3 Complete: ${stats.discAssessments} DISC assessments migrated`);
}

// Phase 4: Migrate Typing Hero Assessments
async function migrateTypingAssessments() {
  console.log('\n⌨️  Phase 4: Migrating Typing Hero Assessments...\n');

  const sessions = await prismaRailway.typingHeroSession.findMany({
    orderBy: { created_at: 'asc' },
  });

  for (const session of sessions) {
    try {
      await prismaSupabase.candidate_typing_assessments.create({
        data: {
          candidate_id: session.user_id,
          session_status: (session.session_status || 'completed') as any,
          difficulty_level: session.difficulty_level || 'rockstar',
          elapsed_time: session.elapsed_time,
          score: session.score,
          wpm: session.wpm,
          overall_accuracy: session.overall_accuracy,
          longest_streak: session.longest_streak,
          correct_words: session.correct_words,
          wrong_words: session.wrong_words,
          words_correct: (session.words_correct || []) as any,
          words_incorrect: (session.words_incorrect || []) as any,
          ai_analysis: (session.ai_analysis || {}) as any,
          vocabulary_strengths: [],
          vocabulary_weaknesses: [],
          generated_story: null,
          created_at: session.created_at || new Date(),
          updated_at: session.updated_at || new Date(),
        },
      });
      stats.typingAssessments++;
    } catch (error: any) {
      console.error(`❌ Error migrating Typing session ${session.id}:`, error.message);
      stats.errors.push(`Typing ${session.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 4 Complete: ${stats.typingAssessments} Typing assessments migrated`);
}

// Phase 5: Migrate AI Analysis
async function migrateAiAnalysis() {
  console.log('\n🤖 Phase 5: Migrating AI Analysis...\n');

  const analyses = await prismaRailway.aiAnalysisResults.findMany({
    include: {
      originalResume: true,
    },
  });

  for (const analysis of analyses) {
    try {
      // Find corresponding resume in Supabase
      let resumeId = null;
      if (analysis.original_resume_id) {
        const resume = await prismaSupabase.candidate_resumes.findFirst({
          where: {
            candidate_id: analysis.user_id,
            extracted_data: { not: null },
          },
        });
        resumeId = resume?.id || null;
      }

      await prismaSupabase.candidate_ai_analysis.create({
        data: {
          candidate_id: analysis.user_id,
          resume_id: resumeId,
          session_id: analysis.session_id,
          overall_score: analysis.overall_score,
          ats_compatibility_score: analysis.ats_compatibility_score || null,
          content_quality_score: analysis.content_quality_score || null,
          professional_presentation_score: analysis.professional_presentation_score || null,
          skills_alignment_score: analysis.skills_alignment_score || null,
          key_strengths: (analysis.key_strengths || []) as any,
          strengths_analysis: (analysis.strengths_analysis || {}) as any,
          improvements: (analysis.improvements || []) as any,
          recommendations: (analysis.recommendations || []) as any,
          section_analysis: (analysis.section_analysis || {}) as any,
          improved_summary: analysis.improved_summary || null,
          salary_analysis: (analysis.salary_analysis || null) as any,
          career_path: (analysis.career_path || null) as any,
          candidate_profile_snapshot: (analysis.candidate_profile || null) as any,
          skills_snapshot: (analysis.skills_snapshot || null) as any,
          experience_snapshot: (analysis.experience_snapshot || null) as any,
          education_snapshot: (analysis.education_snapshot || null) as any,
          analysis_metadata: (analysis.analysis_metadata || null) as any,
          portfolio_links: (analysis.portfolio_links || null) as any,
          files_analyzed: (analysis.files_analyzed || null) as any,
          created_at: analysis.created_at || new Date(),
          updated_at: analysis.updated_at || new Date(),
        },
      });
      stats.aiAnalysis++;
    } catch (error: any) {
      console.error(`❌ Error migrating AI analysis ${analysis.id}:`, error.message);
      stats.errors.push(`AI Analysis ${analysis.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 5 Complete: ${stats.aiAnalysis} AI analyses migrated`);
}

// Phase 6: Migrate Agencies and Companies
async function migrateAgenciesAndCompanies() {
  console.log('\n🏢 Phase 6: Migrating Agencies and Companies...\n');

  // Migrate agencies
  const agencies = await prismaRailway.agencies.findMany();
  
  for (const agency of agencies) {
    try {
      await prismaSupabase.agencies.upsert({
        where: { id: agency.id },
        create: {
          id: agency.id,
          name: agency.name,
          slug: agency.slug,
          logo_url: agency.logo_url || null,
          is_active: true,
          created_at: agency.created_at || new Date(),
          updated_at: agency.updated_at || new Date(),
        },
        update: {
          name: agency.name,
          slug: agency.slug,
          logo_url: agency.logo_url || null,
          updated_at: agency.updated_at || new Date(),
        },
      });
      stats.agencies++;
    } catch (error: any) {
      console.error(`❌ Error migrating agency ${agency.id}:`, error.message);
      stats.errors.push(`Agency ${agency.id}: ${error.message}`);
    }
  }

  // Migrate members → companies
  const members = await prismaRailway.member.findMany({
    include: {
      agencies: true,
    },
  });

  for (const member of members) {
    try {
      // Create company
      const company = await prismaSupabase.companies.upsert({
        where: { id: member.company_id },
        create: {
          id: member.company_id,
          name: member.company,
          slug: `company-${member.company_id}`,
          is_active: true,
          created_at: member.created_at || new Date(),
          updated_at: member.updated_at || new Date(),
        },
        update: {
          name: member.company,
          updated_at: member.updated_at || new Date(),
        },
      });
      stats.companies++;

      // Create agency_client relationship if agency exists
      if (member.agency_id) {
        const agencyExists = await prismaSupabase.agencies.findUnique({
          where: { id: member.agency_id },
        });

        if (agencyExists) {
          await prismaSupabase.agency_clients.upsert({
            where: {
              agency_id_company_id: {
                agency_id: member.agency_id,
                company_id: company.id,
              },
            },
            create: {
              agency_id: member.agency_id,
              company_id: company.id,
              status: 'active' as any,
              created_at: member.created_at || new Date(),
              updated_at: member.updated_at || new Date(),
            },
            update: {
              status: 'active' as any,
              updated_at: member.updated_at || new Date(),
            },
          });
        }
      }
    } catch (error: any) {
      console.error(`❌ Error migrating company ${member.company_id}:`, error.message);
      stats.errors.push(`Company ${member.company_id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 6 Complete: ${stats.agencies} agencies, ${stats.companies} companies migrated`);
}

// Phase 7: Migrate Jobs and Applications
async function migrateJobsAndApplications() {
  console.log('\n💼 Phase 7: Migrating Jobs and Applications...\n');

  // First, we need to create agencies and companies if they don't exist
  // For now, we'll create a default agency for jobs without agency
  
  // Migrate jobs
  const jobRequests = await prismaRailway.jobRequest.findMany({
    include: {
      company: true,
      applications: {
        include: {
          resume: true,
        },
      },
    },
  });

  // Create a default agency if needed
  let defaultAgency = await prismaSupabase.agencies.findFirst({
    where: { slug: 'default-agency' },
  });

  if (!defaultAgency) {
    defaultAgency = await prismaSupabase.agencies.create({
      data: {
        name: 'Default Agency',
        slug: 'default-agency',
        is_active: true,
      },
    });
  }

  // Create default company if needed
  let defaultCompany = await prismaSupabase.companies.findFirst({
    where: { slug: 'default-company' },
  });

  if (!defaultCompany) {
    defaultCompany = await prismaSupabase.companies.create({
      data: {
        name: 'Default Company',
        slug: 'default-company',
        is_active: true,
      },
    });
  }

  // Create agency_client relationship
  let agencyClient = await prismaSupabase.agency_clients.findFirst({
    where: {
      agency_id: defaultAgency.id,
      company_id: defaultCompany.id,
    },
  });

  if (!agencyClient) {
    agencyClient = await prismaSupabase.agency_clients.create({
      data: {
        agency_id: defaultAgency.id,
        company_id: defaultCompany.id,
        status: 'active' as any,
      },
    });
  }

  for (const jobRequest of jobRequests) {
    try {
      // Create or get company
      let company = null;
      if (jobRequest.company) {
        company = await prismaSupabase.companies.upsert({
          where: { id: jobRequest.company.company_id },
          create: {
            id: jobRequest.company.company_id,
            name: jobRequest.company.company,
            slug: `company-${jobRequest.company.company_id}`,
            is_active: true,
          },
          update: {
            name: jobRequest.company.company,
          },
        });

        // Create agency_client if needed
        const existingAgencyClient = await prismaSupabase.agency_clients.findFirst({
          where: {
            agency_id: defaultAgency.id,
            company_id: company.id,
          },
        });

        if (!existingAgencyClient) {
          await prismaSupabase.agency_clients.create({
            data: {
              agency_id: defaultAgency.id,
              company_id: company.id,
              status: 'active' as any,
            },
          });
        }
      }

      const agencyClientId = company 
        ? (await prismaSupabase.agency_clients.findFirst({
            where: {
              agency_id: defaultAgency.id,
              company_id: company.id,
            },
          }))?.id || agencyClient.id
        : agencyClient.id;

      // Create job
      const job = await prismaSupabase.jobs.create({
        data: {
          agency_client_id: agencyClientId,
          title: jobRequest.job_title,
          slug: `job-${jobRequest.id}`,
          description: jobRequest.job_description,
          requirements: (jobRequest.requirements || []) as any,
          responsibilities: (jobRequest.responsibilities || []) as any,
          benefits: (jobRequest.benefits || []) as any,
          salary_min: jobRequest.salary_min || null,
          salary_max: jobRequest.salary_max || null,
          salary_type: (jobRequest.salary_type || 'monthly') as any,
          currency: jobRequest.currency || 'PHP',
          work_arrangement: (jobRequest.work_arrangement || null) as any,
          work_type: transformWorkType(jobRequest.work_type) as any,
          shift: (jobRequest.shift || 'day') as any,
          experience_level: (jobRequest.experience_level || null) as any,
          industry: jobRequest.industry || null,
          department: jobRequest.department || null,
          status: (jobRequest.status === 'active' ? 'active' : 'closed') as any,
          priority: (jobRequest.priority || 'medium') as any,
          application_deadline: jobRequest.application_deadline || null,
          views: jobRequest.views || 0,
          applicants_count: jobRequest.applicants || 0,
          source: 'manual' as any,
          created_at: jobRequest.created_at,
          updated_at: jobRequest.updated_at,
        },
      });
      stats.jobs++;

      // Migrate job skills
      if (jobRequest.skills && jobRequest.skills.length > 0) {
        for (const skillName of jobRequest.skills) {
          await prismaSupabase.job_skills.create({
            data: {
              job_id: job.id,
              name: skillName,
              is_required: true,
            },
          });
        }
      }

      // Migrate applications
      for (const application of jobRequest.applications) {
        try {
          // Find resume in Supabase
          const resume = await prismaSupabase.candidate_resumes.findUnique({
            where: { slug: application.resume_slug },
          });

          await prismaSupabase.job_applications.create({
            data: {
              candidate_id: application.user_id,
              job_id: job.id,
              resume_id: resume?.id || null,
              status: transformApplicationStatus(application.status) as any,
              position: application.position || 0,
              created_at: application.created_at,
              updated_at: application.updated_at || application.created_at,
            },
          });
          stats.applications++;
        } catch (error: any) {
          console.error(`❌ Error migrating application ${application.id}:`, error.message);
          stats.errors.push(`Application ${application.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error migrating job ${jobRequest.id}:`, error.message);
      stats.errors.push(`Job ${jobRequest.id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 7 Complete: ${stats.jobs} jobs, ${stats.applications} applications migrated`);
}

// Phase 8: Migrate Job Matches
async function migrateJobMatches() {
  console.log('\n🎯 Phase 8: Migrating Job Matches...\n');

  const jobMatches = await prismaRailway.jobMatchResult.findMany();

  for (const match of jobMatches) {
    try {
      // Find the corresponding job in Supabase (job_id in Railway is string, need to find by job title or create mapping)
      // For now, we'll need to match by finding jobs that were migrated
      // Since Railway job_id is a string and Supabase uses UUID, we need a different approach
      
      // Try to find job by matching with job_requests table
      const railwayJob = await prismaRailway.jobRequest.findFirst({
        where: { id: parseInt(match.job_id) || 0 },
      });

      if (!railwayJob) {
        console.log(`⚠️  Skipping job match - job ${match.job_id} not found`);
        continue;
      }

      // Find the migrated job in Supabase
      const supabaseJob = await prismaSupabase.jobs.findFirst({
        where: { slug: `job-${railwayJob.id}` },
      });

      if (!supabaseJob) {
        console.log(`⚠️  Skipping job match - Supabase job not found for Railway job ${railwayJob.id}`);
        continue;
      }

      await prismaSupabase.job_matches.upsert({
        where: {
          candidate_id_job_id: {
            candidate_id: match.user_id,
            job_id: supabaseJob.id,
          },
        },
        create: {
          candidate_id: match.user_id,
          job_id: supabaseJob.id,
          overall_score: match.score,
          breakdown: (match.breakdown || {}) as any,
          reasoning: match.reasoning || null,
          status: 'pending' as any,
          analyzed_at: match.analyzed_at || new Date(),
          created_at: match.analyzed_at || new Date(),
          updated_at: match.analyzed_at || new Date(),
        },
        update: {
          overall_score: match.score,
          breakdown: (match.breakdown || {}) as any,
          reasoning: match.reasoning || null,
          updated_at: match.analyzed_at || new Date(),
        },
      });
      stats.jobMatches++;
    } catch (error: any) {
      console.error(`❌ Error migrating job match ${match.user_id}-${match.job_id}:`, error.message);
      stats.errors.push(`Job Match ${match.user_id}-${match.job_id}: ${error.message}`);
    }
  }

  console.log(`\n✅ Phase 8 Complete: ${stats.jobMatches} job matches migrated`);
}

// Test function: Check data counts
async function testMigration() {
  console.log('🧪 Testing Migration Setup...\n');
  
  try {
    const railwayUsers = await prismaRailway.user.count();
    const railwayResumes = await prismaRailway.savedResume.count();
    const railwayDisc = await prismaRailway.discPersonalitySession.count();
    const railwayTyping = await prismaRailway.typingHeroSession.count();
    const railwayJobs = await prismaRailway.jobRequest.count();
    const railwayApps = await prismaRailway.application.count();

    console.log('📊 Railway Data Counts:');
    console.log(`  Users: ${railwayUsers}`);
    console.log(`  Saved Resumes: ${railwayResumes}`);
    console.log(`  DISC Sessions: ${railwayDisc}`);
    console.log(`  Typing Sessions: ${railwayTyping}`);
    console.log(`  Jobs: ${railwayJobs}`);
    console.log(`  Applications: ${railwayApps}\n`);

    const supabaseCandidates = await prismaSupabase.candidates.count();
    const supabaseResumes = await prismaSupabase.candidate_resumes.count();
    const supabaseDisc = await prismaSupabase.candidate_disc_assessments.count();
    const supabaseTyping = await prismaSupabase.candidate_typing_assessments.count();
    const supabaseJobs = await prismaSupabase.jobs.count();
    const supabaseApps = await prismaSupabase.job_applications.count();

    console.log('📊 Supabase Data Counts:');
    console.log(`  Candidates: ${supabaseCandidates}`);
    console.log(`  Resumes: ${supabaseResumes}`);
    console.log(`  DISC Assessments: ${supabaseDisc}`);
    console.log(`  Typing Assessments: ${supabaseTyping}`);
    console.log(`  Jobs: ${supabaseJobs}`);
    console.log(`  Applications: ${supabaseApps}\n`);

    // Check auth users
    const authUsers = await prismaSupabase.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM auth.users
    `;
    console.log(`  Auth Users: ${authUsers[0].count}\n`);

    console.log('✅ Test complete! Ready to migrate.');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await prismaRailway.$disconnect();
    await prismaSupabase.$disconnect();
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Data Migration from Railway to Supabase\n');
  console.log('=' .repeat(60));

  try {
    await migrateUsers();
    await migrateResumes();
    await migrateDiscAssessments();
    await migrateTypingAssessments();
    await migrateAiAnalysis();
    await migrateAgenciesAndCompanies();
    await migrateJobsAndApplications();
    await migrateJobMatches();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Candidates: ${stats.candidates}`);
    console.log(`✅ BPOC Users: ${stats.bpocUsers}`);
    console.log(`✅ Profiles: ${stats.profiles}`);
    console.log(`✅ Resumes: ${stats.resumes}`);
    console.log(`✅ DISC Assessments: ${stats.discAssessments}`);
    console.log(`✅ Typing Assessments: ${stats.typingAssessments}`);
    console.log(`✅ AI Analyses: ${stats.aiAnalysis}`);
    console.log(`✅ Jobs: ${stats.jobs}`);
    console.log(`✅ Applications: ${stats.applications}`);
    console.log(`✅ Companies: ${stats.companies}`);
    console.log(`✅ Agencies: ${stats.agencies}`);
    console.log(`✅ Job Matches: ${stats.jobMatches}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      console.log('First 10 errors:');
      stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    console.log('\n🎉 Migration completed!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prismaRailway.$disconnect();
    await prismaSupabase.$disconnect();
  }
}

// Run migration if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    testMigration().catch(console.error);
  } else {
    console.log('⚠️  This will migrate ALL data from Railway to Supabase!');
    console.log('💡 Run with --test flag first to check data counts\n');
    runMigration().catch(console.error);
  }
}

export { runMigration, testMigration, stats, migrateJobsAndApplications, migrateJobMatches };

