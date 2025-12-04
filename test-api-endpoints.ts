/**
 * Test Script: Compare Old vs New API Endpoints
 * Tests both Railway and Supabase implementations
 */
import { prismaRailway, prismaSupabase } from './src/lib/prisma-clients'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints\n')
  console.log('='.repeat(60))

  try {
    // Get a test user ID
    console.log('\n📋 Step 1: Finding test users...\n')
    
    const railwayUser = await prismaRailway.user.findFirst({
      where: { admin_level: null },
      select: { id: true, email: true, first_name: true, last_name: true },
    })

    const supabaseCandidate = await prismaSupabase.candidates.findFirst({
      select: { id: true, email: true, first_name: true, last_name: true },
    })

    console.log('Railway User:', railwayUser ? `${railwayUser.email} (${railwayUser.id})` : 'None found')
    console.log('Supabase Candidate:', supabaseCandidate ? `${supabaseCandidate.email} (${supabaseCandidate.id})` : 'None found')

    const testUserId = railwayUser?.id || supabaseCandidate?.id

    if (!testUserId) {
      console.log('\n⚠️  No test users found. Skipping endpoint tests.')
      return
    }

    console.log(`\n✅ Using test user: ${testUserId}\n`)

    // Test old endpoint
    console.log('📡 Testing OLD endpoint (/api/user/profile)...')
    try {
      const oldResponse = await fetch(`http://localhost:3000/api/user/profile?userId=${testUserId}`)
      const oldData = await oldResponse.json()
      
      if (oldResponse.ok) {
        console.log('✅ OLD endpoint: SUCCESS')
        console.log(`   User: ${oldData.user?.email || 'N/A'}`)
        console.log(`   Name: ${oldData.user?.full_name || 'N/A'}`)
        console.log(`   Score: ${oldData.user?.overall_score || 0}`)
      } else {
        console.log(`❌ OLD endpoint: FAILED (${oldResponse.status})`)
        console.log(`   Error: ${oldData.error || 'Unknown'}`)
      }
    } catch (error) {
      console.log(`❌ OLD endpoint: ERROR`)
      console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    }

    // Test new endpoint
    console.log('\n📡 Testing NEW endpoint (/api/user/profile-v2)...')
    try {
      const newResponse = await fetch(`http://localhost:3000/api/user/profile-v2?userId=${testUserId}`)
      const newData = await newResponse.json()
      
      if (newResponse.ok) {
        console.log('✅ NEW endpoint: SUCCESS')
        console.log(`   User: ${newData.user?.email || 'N/A'}`)
        console.log(`   Name: ${newData.user?.full_name || 'N/A'}`)
        console.log(`   Score: ${newData.user?.overall_score || 0}`)
      } else {
        console.log(`❌ NEW endpoint: FAILED (${newResponse.status})`)
        console.log(`   Error: ${newData.error || 'Unknown'}`)
      }
    } catch (error) {
      console.log(`❌ NEW endpoint: ERROR`)
      console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    }

    // Test database abstraction layer directly
    console.log('\n📡 Testing Database Abstraction Layer...')
    try {
      const { getCandidateById } = await import('./src/lib/db/candidates')
      const { getProfileByCandidate } = await import('./src/lib/db/profiles')

      const candidate = await getCandidateById(testUserId)
      const profile = await getProfileByCandidate(testUserId)

      if (candidate) {
        console.log('✅ Candidates abstraction: SUCCESS')
        console.log(`   Email: ${candidate.email}`)
        console.log(`   Name: ${candidate.full_name}`)
      } else {
        console.log('❌ Candidates abstraction: No candidate found')
      }

      if (profile) {
        console.log('✅ Profiles abstraction: SUCCESS')
        console.log(`   Bio: ${profile.bio || 'N/A'}`)
        console.log(`   Position: ${profile.position || 'N/A'}`)
        console.log(`   XP: ${profile.gamification?.total_xp || 0}`)
      } else {
        console.log('⚠️  Profiles abstraction: No profile found (may be normal)')
      }
    } catch (error) {
      console.log(`❌ Abstraction layer: ERROR`)
      console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    }

    // Check feature flags
    console.log('\n📡 Checking Feature Flags...')
    const { features, useSupabase } = await import('./src/lib/config/features')
    console.log(`   USE_SUPABASE: ${features.supabase.enabled}`)
    console.log(`   FEATURE_SUPABASE_CANDIDATES: ${features.supabase.candidates}`)
    console.log(`   FEATURE_SUPABASE_PROFILES: ${features.supabase.profiles}`)
    console.log(`   useSupabase('candidates'): ${useSupabase('candidates')}`)
    console.log(`   useSupabase('profiles'): ${useSupabase('profiles')}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Testing complete!\n')

  } catch (error) {
    console.error('\n❌ Test error:', error)
  } finally {
    await prismaRailway.$disconnect()
    await prismaSupabase.$disconnect()
  }
}

testEndpoints().catch(console.error)


