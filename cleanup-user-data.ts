/**
 * Cleanup Script: Delete all data for a specific user
 * 
 * Usage: npx tsx cleanup-user-data.ts stephen@stepten.io
 * 
 * This script deletes ALL data related to a user email from Supabase:
 * - Candidate record
 * - Candidate profile
 * - Candidate resumes
 * - Candidate assessments (DISC, Typing)
 * - Job applications
 * - Job matches
 * - AI analysis results
 * - Skills, education, work experience
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config() // Also load .env

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client directly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function cleanupUserData(email: string) {
  console.log('🧹 Starting cleanup for user:', email)
  console.log('=' .repeat(60))

  try {
    // Step 1: Find the user in auth.users
    console.log('\n📋 Step 1: Finding user in auth.users...')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError)
      throw authError
    }

    const authUser = authUsers.users.find(u => u.email === email)
    
    if (!authUser) {
      console.log('⚠️  User not found in auth.users - checking candidates table...')
      
      // Try to find by email in candidates table
      const { data: candidate, error: candidateError } = await supabaseAdmin
        .from('candidates')
        .select('id, email')
        .eq('email', email)
        .single()

      if (candidateError || !candidate) {
        console.log('✅ No user found with this email in either auth.users or candidates')
        return { deleted: false, message: 'User not found' }
      }

      console.log('⚠️  Found candidate without auth user:', candidate.id)
      console.log('⚠️  This is an orphaned record. Deleting candidate data...')
      
      await deleteCandidateData(candidate.id)
      return { deleted: true, orphaned: true, candidate_id: candidate.id }
    }

    const userId = authUser.id
    console.log('✅ Found user in auth.users:', {
      id: userId,
      email: authUser.email,
      created_at: authUser.created_at,
    })

    // Step 2: Delete all candidate-related data (cascade will handle most)
    console.log('\n📋 Step 2: Deleting candidate data...')
    await deleteCandidateData(userId)

    // Step 3: Delete auth user
    console.log('\n📋 Step 3: Deleting auth user...')
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('  ⚠️  Error deleting auth user:', deleteError.message)
        console.log('  💡 You may need to delete manually from Supabase Dashboard')
      } else {
        console.log('  ✅ Auth user deleted successfully')
      }
    } catch (deleteErr) {
      console.error('  ⚠️  Exception deleting auth user:', deleteErr)
      console.log('  💡 You may need to delete manually from Supabase Dashboard')
    }

    console.log('\n✅ Cleanup completed successfully!')
    return { deleted: true, user_id: userId }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    throw error
  }
}

async function deleteCandidateData(candidateId: string) {
  console.log(`\n🗑️  Deleting all data for candidate: ${candidateId}`)

  // Delete in order (respecting foreign keys)
  const tables = [
    { name: 'job_applications', key: 'candidate_id' },
    { name: 'job_matches', key: 'candidate_id' },
    { name: 'candidate_ai_analysis', key: 'candidate_id' },
    { name: 'candidate_disc_assessments', key: 'candidate_id' },
    { name: 'candidate_typing_assessments', key: 'candidate_id' },
    { name: 'candidate_work_experiences', key: 'candidate_id' },
    { name: 'candidate_educations', key: 'candidate_id' },
    { name: 'candidate_skills', key: 'candidate_id' },
    { name: 'candidate_resumes', key: 'candidate_id' },
    { name: 'candidate_profiles', key: 'candidate_id' },
    { name: 'candidates', key: 'id' },
  ]

  for (const table of tables) {
    try {
      const { error, count } = await supabaseAdmin
        .from(table.name)
        .delete()
        .eq(table.key, candidateId)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error(`  ❌ Error deleting from ${table.name}:`, error.message)
      } else {
        console.log(`  ✅ Deleted from ${table.name}: ${count || 0} records`)
      }
    } catch (err) {
      console.error(`  ❌ Exception deleting from ${table.name}:`, err)
    }
  }
}

// Main execution
async function main() {
  const email = process.argv[2] || 'stephen@stepten.io'

  console.log('🚨 WARNING: This will delete ALL data for:', email)
  console.log('🚨 Press Ctrl+C to cancel, or wait 3 seconds to continue...\n')

  await new Promise(resolve => setTimeout(resolve, 3000))

  try {
    const result = await cleanupUserData(email)
    console.log('\n📊 Cleanup Result:', result)
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  }
}

main()

