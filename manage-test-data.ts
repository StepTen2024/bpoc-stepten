/**
 * Test Data Management Script
 * Helps identify and manage your own test data vs migrated data
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
dotenv.config()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables!')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

const YOUR_EMAIL = 'stephen@stepten.io'
const MIGRATION_DATE = '2025-12-04' // Date when migration happened

async function showMyData() {
  console.log('🔍 Finding YOUR test data...\n')
  console.log('=' .repeat(60))

  try {
    // Find your auth user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const myAuthUser = authUsers.users.find(u => u.email === YOUR_EMAIL)
    
    if (!myAuthUser) {
      console.log('❌ No auth user found for:', YOUR_EMAIL)
      return
    }

    console.log('✅ Found your auth user:')
    console.log(`   ID: ${myAuthUser.id}`)
    console.log(`   Email: ${myAuthUser.email}`)
    console.log(`   Created: ${myAuthUser.created_at}`)
    console.log('')

    // Find your candidate record
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', myAuthUser.id)
      .single()

    if (candidateError || !candidate) {
      console.log('⚠️  No candidate record found')
    } else {
      console.log('✅ Your Candidate Record:')
      console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`)
      console.log(`   Email: ${candidate.email}`)
      console.log(`   Username: ${candidate.username || 'N/A'}`)
      console.log(`   Slug: ${candidate.slug || 'N/A'}`)
      console.log(`   Created: ${candidate.created_at}`)
      console.log('')
    }

    // Find your profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('candidate_id', myAuthUser.id)
      .single()

    if (profileError || !profile) {
      console.log('⚠️  No profile found')
    } else {
      console.log('✅ Your Profile:')
      console.log(`   Bio: ${profile.bio || 'N/A'}`)
      console.log(`   Position: ${profile.position || 'N/A'}`)
      console.log(`   Location: ${profile.location || 'N/A'}`)
      console.log(`   Work Status: ${profile.work_status || 'N/A'}`)
      console.log(`   Profile Completed: ${profile.profile_completed ? 'Yes' : 'No'}`)
      console.log('')
    }

    // Count your applications
    const { count: appCount } = await supabaseAdmin
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', myAuthUser.id)

    console.log(`📋 Your Job Applications: ${appCount || 0}`)

    // Count your resumes
    const { count: resumeCount } = await supabaseAdmin
      .from('candidate_resumes')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', myAuthUser.id)

    console.log(`📄 Your Resumes: ${resumeCount || 0}`)

    // Count your assessments
    const { count: discCount } = await supabaseAdmin
      .from('candidate_disc_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', myAuthUser.id)

    const { count: typingCount } = await supabaseAdmin
      .from('candidate_typing_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', myAuthUser.id)

    console.log(`🎮 Your Assessments: DISC=${discCount || 0}, Typing=${typingCount || 0}`)

    console.log('\n' + '='.repeat(60))
    console.log('💡 Quick Links:')
    console.log(`   Profile: http://localhost:3000/${candidate?.slug || 'profile'}`)
    console.log(`   Settings: http://localhost:3000/settings`)
    console.log(`   Applications: http://localhost:3000/applications`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function showDataSummary() {
  console.log('\n📊 Database Summary:\n')
  console.log('=' .repeat(60))

  try {
    // Total candidates
    const { count: totalCandidates } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })

    // Candidates created after migration (likely test data)
    const { count: newCandidates } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', MIGRATION_DATE)

    // Your data
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const myAuthUser = authUsers.users.find(u => u.email === YOUR_EMAIL)

    console.log(`Total Candidates: ${totalCandidates || 0}`)
    console.log(`Created After Migration (${MIGRATION_DATE}): ${newCandidates || 0}`)
    console.log(`Your User ID: ${myAuthUser?.id || 'Not found'}`)
    console.log('')

    // Show recent candidates (last 10)
    const { data: recentCandidates } = await supabaseAdmin
      .from('candidates')
      .select('id, email, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📋 Recent Candidates (Last 10):')
    recentCandidates?.forEach((c, i) => {
      const isMine = c.id === myAuthUser?.id
      const marker = isMine ? '👤 YOU' : '  '
      console.log(`${marker} ${i + 1}. ${c.first_name} ${c.last_name} (${c.email}) - ${c.created_at}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

async function cleanupOldTestData() {
  console.log('\n🧹 Cleanup Options:\n')
  console.log('1. Delete all candidates created before migration')
  console.log('2. Delete all candidates except yours')
  console.log('3. Show what would be deleted (dry run)')
  console.log('')
  console.log('⚠️  WARNING: This will delete data!')
  console.log('⚠️  Run with --dry-run first to see what would be deleted')
}

// Main execution
const command = process.argv[2] || 'show'

async function main() {
  if (command === 'show' || command === 'my-data') {
    await showMyData()
  } else if (command === 'summary') {
    await showDataSummary()
  } else if (command === 'cleanup') {
    await cleanupOldTestData()
  } else {
    console.log('Usage:')
    console.log('  npx tsx manage-test-data.ts show      - Show your test data')
    console.log('  npx tsx manage-test-data.ts summary   - Show database summary')
    console.log('  npx tsx manage-test-data.ts cleanup   - Show cleanup options')
  }
}

main()


