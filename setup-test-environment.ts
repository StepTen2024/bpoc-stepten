/**
 * Setup Test Environment Script
 * Creates:
 * 1. ShoreAgents Agency
 * 2. 1 BPOC Admin User
 * 3. 1 Recruiter (attached to ShoreAgents)
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

const SHOREAGENTS_AGENCY = {
  name: 'ShoreAgents',
  slug: 'shoreagents',
  website: 'https://shoreagents.com',
}

const BPOC_ADMIN_USER = {
  email: 'admin@bpoc.com',
  password: 'TestAdmin123!',
  first_name: 'BPOC',
  last_name: 'Admin',
}

const RECRUITER_USER = {
  email: 'recruiter@shoreagents.com',
  password: 'TestRecruiter123!',
  first_name: 'Test',
  last_name: 'Recruiter',
}

async function createAgency() {
  console.log('🏢 Creating ShoreAgents agency...')
  
  // Check if exists
  const { data: existing } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('slug', SHOREAGENTS_AGENCY.slug)
    .single()

  if (existing) {
    console.log(`   ✅ Agency already exists: ${existing.id}`)
    return existing
  }

  const { data: agency, error } = await supabaseAdmin
    .from('agencies')
    .insert({
      name: SHOREAGENTS_AGENCY.name,
      slug: SHOREAGENTS_AGENCY.slug,
      website: SHOREAGENTS_AGENCY.website,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error(`   ❌ Error: ${error.message}`)
    throw error
  }

  console.log(`   ✅ Created agency: ${agency.id}`)
  return agency
}

async function createBpocAdminUser() {
  console.log('👤 Creating BPOC Platform Admin user...')

  // Check if exists
  const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingAuth.users.find(u => u.email === BPOC_ADMIN_USER.email)

  if (existing) {
    console.log(`   ✅ BPOC Admin user already exists: ${existing.id}`)
    
    // Check if bpoc_user exists
    const { data: bpocUser } = await supabaseAdmin
      .from('bpoc_users')
      .select('*')
      .eq('id', existing.id)
      .single()

    if (bpocUser) {
      console.log(`   ✅ BPOC user record exists`)
      return { authUser: existing, bpocUser }
    }
  }

  // Create auth user if needed
  let authUser = existing
  if (!authUser) {
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: BPOC_ADMIN_USER.email,
      password: BPOC_ADMIN_USER.password,
      email_confirm: true,
      user_metadata: {
        first_name: BPOC_ADMIN_USER.first_name,
        last_name: BPOC_ADMIN_USER.last_name,
        role: 'admin',
      }
    })

    if (authError) {
      console.error(`   ❌ Auth error: ${authError.message}`)
      throw authError
    }

    authUser = newUser.user
    console.log(`   ✅ Created auth user: ${authUser.id}`)
  }

  // Create bpoc_user record (Platform Admin - NOT associated with any agency)
  const { data: bpocUser, error: bpocError } = await supabaseAdmin
    .from('bpoc_users')
    .insert({
      id: authUser.id,
      email: BPOC_ADMIN_USER.email,
      first_name: BPOC_ADMIN_USER.first_name,
      last_name: BPOC_ADMIN_USER.last_name,
      role: 'admin', // Platform admin role
      is_active: true,
    })
    .select()
    .single()

  if (bpocError && !bpocError.message.includes('duplicate')) {
    console.error(`   ❌ BPOC user error: ${bpocError.message}`)
    throw bpocError
  }

  const finalBpocUser = bpocUser || await supabaseAdmin
    .from('bpoc_users')
    .select('*')
    .eq('id', authUser.id)
    .single()
    .then(r => r.data)

  console.log(`   ✅ Created BPOC Platform Admin user record`)
  
  return { authUser, bpocUser: finalBpocUser }
}

async function createAgencyRecruiter(agencyId: string) {
  console.log('👔 Creating Agency Recruiter user...')

  // Check if exists
  const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingAuth.users.find(u => u.email === RECRUITER_USER.email)

  if (existing) {
    console.log(`   ✅ Recruiter user already exists: ${existing.id}`)
    
    // Check if bpoc_user exists
    const { data: bpocUser } = await supabaseAdmin
      .from('bpoc_users')
      .select('*')
      .eq('id', existing.id)
      .single()

    if (bpocUser) {
      console.log(`   ✅ BPOC user record exists`)
      return { authUser: existing, bpocUser }
    }
  }

  // Create auth user if needed
  let authUser = existing
  if (!authUser) {
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: RECRUITER_USER.email,
      password: RECRUITER_USER.password,
      email_confirm: true,
      user_metadata: {
        first_name: RECRUITER_USER.first_name,
        last_name: RECRUITER_USER.last_name,
        role: 'admin',
        agency_id: agencyId,
      }
    })

    if (authError) {
      console.error(`   ❌ Auth error: ${authError.message}`)
      throw authError
    }

    authUser = newUser.user
    console.log(`   ✅ Created auth user: ${authUser.id}`)
  }

  // Create bpoc_user record (recruiters are still bpoc_users with admin role)
  const { data: bpocUser, error: bpocError } = await supabaseAdmin
    .from('bpoc_users')
    .insert({
      id: authUser.id,
      email: RECRUITER_USER.email,
      first_name: RECRUITER_USER.first_name,
      last_name: RECRUITER_USER.last_name,
      role: 'admin', // Recruiters are admins in bpoc_users, linked via agency_recruiters
      is_active: true,
    })
    .select()
    .single()

  if (bpocError && !bpocError.message.includes('duplicate')) {
    console.error(`   ❌ BPOC user error: ${bpocError.message}`)
    throw bpocError
  }

  const finalBpocUser = bpocUser || await supabaseAdmin
    .from('bpoc_users')
    .select('*')
    .eq('id', authUser.id)
    .single()
    .then(r => r.data)

  console.log(`   ✅ Created BPOC user record (attached to agency)`)

  // Create agency_recruiter record (this links recruiter to agency)
  const { data: recruiterRecord, error: recruiterError } = await supabaseAdmin
    .from('agency_recruiters')
    .upsert({
      user_id: authUser.id,
      agency_id: agencyId,
      email: RECRUITER_USER.email,
      first_name: RECRUITER_USER.first_name,
      last_name: RECRUITER_USER.last_name,
      role: 'recruiter',
      is_active: true,
      can_post_jobs: true,
      can_manage_applications: true,
    })
    .select()
    .single()

  if (recruiterError && !recruiterError.message.includes('duplicate')) {
    console.error(`   ⚠️  Recruiter record error: ${recruiterError.message}`)
  } else {
    console.log(`   ✅ Created agency_recruiter record`)
  }

  // Create bpoc_profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('bpoc_profiles')
    .upsert({
      bpoc_user_id: authUser.id,
    })
    .select()
    .single()

  if (profileError && !profileError.message.includes('duplicate')) {
    console.error(`   ⚠️  Profile error: ${profileError.message}`)
  } else {
    console.log(`   ✅ Created bpoc_profile`)
  }
  
  return { authUser, bpocUser: finalBpocUser }
}

async function setupTestEnvironment() {
  console.log('🚀 Setting up test environment...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Create BPOC Platform Admin (NOT associated with any agency)
    const bpocAdmin = await createBpocAdminUser()
    console.log('')

    // 2. Create Agency
    const agency = await createAgency()
    console.log('')

    // 3. Create Agency Recruiter (associated with agency)
    const recruiter = await createAgencyRecruiter(agency.id)
    console.log('')

    console.log('=' .repeat(60))
    console.log('✅ Test Environment Setup Complete!')
    console.log('=' .repeat(60))
    console.log('')
    console.log('📋 Test Accounts:')
    console.log('')
    console.log('👤 BPOC Platform Admin:')
    console.log(`   Email: ${BPOC_ADMIN_USER.email}`)
    console.log(`   Password: ${BPOC_ADMIN_USER.password}`)
    console.log(`   User ID: ${bpocAdmin.authUser.id}`)
    console.log(`   Role: Platform Admin (NOT associated with agency)`)
    console.log('')
    console.log('👔 Agency Recruiter:')
    console.log(`   Email: ${RECRUITER_USER.email}`)
    console.log(`   Password: ${RECRUITER_USER.password}`)
    console.log(`   User ID: ${recruiter.authUser.id}`)
    console.log(`   Agency: ${agency.name} (${agency.id})`)
    console.log(`   Role: Agency Recruiter (associated with ${agency.name})`)
    console.log('')
    console.log('👤 Candidate:')
    console.log(`   You'll create this yourself via signup`)
    console.log('')
    console.log('💡 Next Steps:')
    console.log('   1. Sign up as candidate')
    console.log('   2. Complete DISC assessment')
    console.log('   3. Build resume')
    console.log('   4. Complete profile')
    console.log('   5. Test candidate dashboard')

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    throw error
  }
}

setupTestEnvironment()
  .then(() => {
    console.log('\n✅ Setup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup script failed:', error)
    process.exit(1)
  })

