/**
 * Complete Migration Script - Fixes missing data and prevents duplicates
 */

import { prismaRailway, prismaSupabase } from './src/lib/prisma-clients';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function completeMigration() {
  console.log('🚀 Completing Migration - Fixing Missing Data\n');
  console.log('='.repeat(60));

  try {
    // 1. Migrate all missing users (including admins)
    console.log('\n📦 Step 1: Migrating Missing Users...\n');
    const allRailwayUsers = await prismaRailway.user.findMany({
      include: { workStatus: true, privacySettings: true, leaderboardScore: true },
    });

    const migratedCandidates = await prismaSupabase.candidates.findMany({ select: { id: true } });
    const migratedBpocUsers = await prismaSupabase.bpoc_users.findMany({ select: { id: true } });
    const migratedIds = new Set([
      ...migratedCandidates.map(u => u.id),
      ...migratedBpocUsers.map(u => u.id),
    ]);

    let newCandidates = 0;
    let newBpocUsers = 0;

    for (const user of allRailwayUsers) {
      if (migratedIds.has(user.id)) continue;

      const existsInAuth = await prismaSupabase.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM auth.users WHERE id = ${user.id}::uuid LIMIT 1
      `;

      if (existsInAuth.length === 0) {
        console.log(`⚠️  Skipping ${user.email} - not in auth.users`);
        continue;
      }

      const isAdmin = user.admin_level && ['admin', 'super_admin', 'support'].includes(user.admin_level);

      if (isAdmin) {
        const role = user.admin_level === 'super_admin' ? 'super_admin' : 
                     user.admin_level === 'support' ? 'support' : 'admin';
        
        await prismaSupabase.$executeRaw`
          INSERT INTO bpoc_users (id, email, first_name, last_name, phone, avatar_url, role, is_active, created_at, updated_at)
          VALUES (${user.id}::uuid, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.phone}, ${user.avatar_url}, ${role}::\"UserRole\", true, ${user.created_at || new Date()}::timestamptz, ${user.updated_at || new Date()}::timestamptz)
          ON CONFLICT (id) DO NOTHING
        `;
        newBpocUsers++;
      } else {
        await prismaSupabase.$executeRaw`
          INSERT INTO candidates (id, email, first_name, last_name, phone, avatar_url, username, slug, is_active, email_verified, created_at, updated_at)
          VALUES (${user.id}::uuid, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.phone}, ${user.avatar_url}, ${user.username}, ${user.slug}, true, false, ${user.created_at || new Date()}::timestamptz, ${user.updated_at || new Date()}::timestamptz)
          ON CONFLICT (id) DO NOTHING
        `;
        newCandidates++;
      }
    }

    console.log(`✅ Migrated ${newCandidates} new candidates, ${newBpocUsers} new BPOC users`);

    // 2. Migrate missing applications
    console.log('\n📋 Step 2: Migrating Missing Applications...\n');
    const allApplications = await prismaRailway.application.findMany({
      include: { resume: true, job: true },
    });

    const migratedApps = await prismaSupabase.job_applications.findMany({
      select: { candidate_id: true, job_id: true },
    });
    const migratedAppKeys = new Set(
      migratedApps.map(a => `${a.candidate_id}-${a.job_id}`)
    );

    let newApplications = 0;

    for (const app of allApplications) {
      // Find job in Supabase
      const supabaseJob = await prismaSupabase.jobs.findFirst({
        where: { slug: `job-${app.job_id}` },
      });

      if (!supabaseJob) {
        console.log(`⚠️  Skipping application - job ${app.job_id} not found in Supabase`);
        continue;
      }

      const appKey = `${app.user_id}-${supabaseJob.id}`;
      if (migratedAppKeys.has(appKey)) continue;

      // Check if candidate exists
      const candidateExists = await prismaSupabase.candidates.findUnique({
        where: { id: app.user_id },
      });

      if (!candidateExists) {
        console.log(`⚠️  Skipping application - candidate ${app.user_id} not found`);
        continue;
      }

      // Find resume
      let resumeId = null;
      if (app.resume) {
        const resume = await prismaSupabase.candidate_resumes.findFirst({
          where: { slug: app.resume_slug },
        });
        resumeId = resume?.id || null;
      }

      const statusMap: Record<string, string> = {
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

      await prismaSupabase.job_applications.create({
        data: {
          candidate_id: app.user_id,
          job_id: supabaseJob.id,
          resume_id: resumeId,
          status: (statusMap[app.status] || 'submitted') as any,
          position: app.position || 0,
          created_at: app.created_at,
          updated_at: app.updated_at || app.created_at,
        },
      });
      newApplications++;
    }

    console.log(`✅ Migrated ${newApplications} new applications`);

    // 3. Migrate all job matches
    console.log('\n🎯 Step 3: Migrating All Job Matches...\n');
    const allJobMatches = await prismaRailway.jobMatchResult.findMany();
    
    // Create a mapping of Railway job_id to Supabase job_id
    const railwayJobs = await prismaRailway.jobRequest.findMany();
    const supabaseJobs = await prismaSupabase.jobs.findMany();
    
    const jobIdMap = new Map<string, string>();
    for (const rJob of railwayJobs) {
      const sJob = supabaseJobs.find(j => j.slug === `job-${rJob.id}`);
      if (sJob) {
        jobIdMap.set(String(rJob.id), sJob.id);
      }
    }

    const migratedMatches = await prismaSupabase.job_matches.findMany({
      select: { candidate_id: true, job_id: true },
    });
    const migratedMatchKeys = new Set(
      migratedMatches.map(m => `${m.candidate_id}-${m.job_id}`)
    );

    let newMatches = 0;
    let skippedMatches = 0;

    for (const match of allJobMatches) {
      const supabaseJobId = jobIdMap.get(match.job_id);
      
      if (!supabaseJobId) {
        skippedMatches++;
        continue;
      }

      const matchKey = `${match.user_id}-${supabaseJobId}`;
      if (migratedMatchKeys.has(matchKey)) continue;

      // Check if candidate exists
      const candidateExists = await prismaSupabase.candidates.findUnique({
        where: { id: match.user_id },
      });

      if (!candidateExists) {
        skippedMatches++;
        continue;
      }

      try {
        await prismaSupabase.job_matches.create({
          data: {
            candidate_id: match.user_id,
            job_id: supabaseJobId,
            overall_score: match.score,
            breakdown: (match.breakdown || {}) as any,
            reasoning: match.reasoning || null,
            status: 'pending' as any,
            analyzed_at: match.analyzed_at || new Date(),
            created_at: match.analyzed_at || new Date(),
            updated_at: match.analyzed_at || new Date(),
          },
        });
        newMatches++;
      } catch (error: any) {
        if (error.code !== 'P2002') { // Ignore duplicate key errors
          console.error(`Error migrating match ${match.user_id}-${match.job_id}:`, error.message);
        }
      }
    }

    console.log(`✅ Migrated ${newMatches} new job matches`);
    console.log(`⚠️  Skipped ${skippedMatches} matches (jobs not found)`);

    // Final status
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Migration Status:\n');
    
    const finalStats = {
      candidates: await prismaSupabase.candidates.count(),
      bpocUsers: await prismaSupabase.bpoc_users.count(),
      profiles: await prismaSupabase.candidate_profiles.count(),
      resumes: await prismaSupabase.candidate_resumes.count(),
      disc: await prismaSupabase.candidate_disc_assessments.count(),
      typing: await prismaSupabase.candidate_typing_assessments.count(),
      aiAnalysis: await prismaSupabase.candidate_ai_analysis.count(),
      jobs: await prismaSupabase.jobs.count(),
      applications: await prismaSupabase.job_applications.count(),
      jobMatches: await prismaSupabase.job_matches.count(),
      companies: await prismaSupabase.companies.count(),
      agencies: await prismaSupabase.agencies.count(),
    };

    console.log(`✅ Candidates: ${finalStats.candidates}`);
    console.log(`✅ BPOC Users: ${finalStats.bpocUsers}`);
    console.log(`✅ Profiles: ${finalStats.profiles}`);
    console.log(`✅ Resumes: ${finalStats.resumes}`);
    console.log(`✅ DISC Assessments: ${finalStats.disc}`);
    console.log(`✅ Typing Assessments: ${finalStats.typing}`);
    console.log(`✅ AI Analysis: ${finalStats.aiAnalysis}`);
    console.log(`✅ Jobs: ${finalStats.jobs}`);
    console.log(`✅ Applications: ${finalStats.applications}`);
    console.log(`✅ Job Matches: ${finalStats.jobMatches}`);
    console.log(`✅ Companies: ${finalStats.companies}`);
    console.log(`✅ Agencies: ${finalStats.agencies}`);

    console.log('\n🎉 Migration completion finished!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    throw error;
  } finally {
    await prismaRailway.$disconnect();
    await prismaSupabase.$disconnect();
  }
}

completeMigration().catch(console.error);

