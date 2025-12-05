import { NextRequest, NextResponse } from 'next/server'
import { createCandidate, updateCandidate, getCandidateById } from '@/lib/db/candidates'
import { createProfile, updateProfile, getProfileByCandidate } from '@/lib/db/profiles'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Test endpoint to verify the route is working
export async function GET() {
  return NextResponse.json({ 
    message: 'User sync API is working',
    methods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/user/sync called')
  console.log('📡 Request method:', request.method)
  console.log('📡 Request URL:', request.url)
  console.log('📡 Request headers:', Object.fromEntries(request.headers.entries()))
  
  let userData: any = null
  
  try {
    // Check Supabase environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Supabase configuration error',
        details: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set'
      }, { status: 500 })
    }

    userData = await request.json()
    
    console.log('📥 Received user sync request:', {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      full_name: userData.full_name,
      location: userData.location,
      admin_level: userData.admin_level,
      phone: userData.phone,
      bio: userData.bio,
      position: userData.position,
      gender: userData.gender ?? null
    })

    // Validate required fields
    if (!userData.id || !userData.email) {
      console.error('❌ [sync] Missing required fields:', { id: userData.id, email: userData.email })
      return NextResponse.json({ 
        error: 'Missing required fields: id and email' 
      }, { status: 400 })
    }

    // CRITICAL: Verify user exists in auth.users before creating candidate
    // The foreign key constraint requires candidates.id to reference auth.users.id
    console.log('🔍 [sync] Verifying user exists in auth.users:', {
      user_id: userData.id,
      email: userData.email,
    })
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userData.id)
      
      if (authError) {
        console.error('❌ [sync] Error checking auth.users:', {
          error_code: authError.status,
          error_message: authError.message,
          user_id: userData.id,
          email: userData.email,
        })
        throw new Error(`User ${userData.id} not found in auth.users: ${authError.message}`)
      }
      
      if (!authUser || !authUser.user) {
        console.error('❌ [sync] User NOT found in auth.users:', {
          user_id: userData.id,
          email: userData.email,
          auth_response: authUser,
        })
        throw new Error(`User ${userData.id} does not exist in auth.users. User must be authenticated via Supabase Auth first.`)
      }
      
      console.log('✅ [sync] User verified in auth.users:', {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at,
        last_sign_in: authUser.user.last_sign_in_at,
        confirmed: authUser.user.email_confirmed_at ? 'YES' : 'NO',
      })
    } catch (authCheckError) {
      console.error('❌ [sync] ========== AUTH.USERS VERIFICATION FAILED ==========')
      console.error('❌ [sync] Error verifying user in auth.users:', {
        error: authCheckError instanceof Error ? authCheckError.message : String(authCheckError),
        stack: authCheckError instanceof Error ? authCheckError.stack : undefined,
        user_id: userData.id,
        email: userData.email,
      })
      console.error('❌ [sync] =======================================================')
      
      // Return a more helpful error message
      if (authCheckError instanceof Error) {
        return NextResponse.json({
          error: 'User authentication verification failed',
          details: authCheckError.message,
          code: 'AUTH_USER_NOT_FOUND',
          actionable: 'Ensure the user is authenticated via Supabase Auth before syncing. The user ID must exist in auth.users table.',
          user_id: userData.id,
          email: userData.email,
        }, { status: 400 })
      }
      throw authCheckError
    }

    // Sync user to SUPABASE - ALWAYS use Supabase tables
    console.log('🔄 Syncing user to SUPABASE tables (candidates + candidate_profiles)')
    console.log('📝 User data:', {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      full_name: userData.full_name || '',
      location: userData.location || '',
      avatar_url: userData.avatar_url,
      phone: userData.phone,
      bio: userData.bio,
      position: userData.position,
      company: userData.company,
      completed_data: userData.completed_data ?? null,
      birthday: userData.birthday ?? null,
      gender: userData.gender ?? null,
      admin_level: userData.admin_level || 'user'
    })

    // CRITICAL: Verify user exists in auth.users before creating candidate
    // The foreign key constraint requires candidates.id to reference auth.users.id
    console.log('🔍 [sync] Verifying user exists in auth.users:', userData.id)
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userData.id)
      if (authError || !authUser) {
        console.error('❌ [sync] User NOT found in auth.users:', {
          error: authError?.message,
          user_id: userData.id,
          email: userData.email,
        })
        throw new Error(`User ${userData.id} does not exist in auth.users. Cannot create candidate record. User must be authenticated first.`)
      }
      console.log('✅ [sync] User verified in auth.users:', {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at,
      })
    } catch (authCheckError) {
      console.error('❌ [sync] Error verifying user in auth.users:', {
        error: authCheckError instanceof Error ? authCheckError.message : String(authCheckError),
        user_id: userData.id,
      })
      throw authCheckError
    }

    // Check if candidate exists (use admin client to bypass RLS)
    console.log('🔍 [sync] Checking if candidate exists:', userData.id)
    let existingCandidate
    try {
      existingCandidate = await getCandidateById(userData.id, true) // Use admin to bypass RLS
      console.log('🔍 [sync] Candidate lookup result:', existingCandidate ? 'EXISTS' : 'NOT FOUND')
    } catch (lookupError) {
      console.error('❌ [sync] Error checking candidate existence:', {
        error: lookupError instanceof Error ? lookupError.message : String(lookupError),
        candidate_id: userData.id,
      })
      throw new Error(`Failed to check candidate existence: ${lookupError instanceof Error ? lookupError.message : 'Unknown error'}`)
    }
    
    let result
    if (existingCandidate) {
      // Update existing candidate
      console.log('👤 [sync] Candidate EXISTS - updating...')
      try {
        const updated = await updateCandidate(userData.id, {
          first_name: userData.first_name || existingCandidate.first_name,
          last_name: userData.last_name || existingCandidate.last_name,
          phone: userData.phone || existingCandidate.phone,
          avatar_url: userData.avatar_url || existingCandidate.avatar_url,
        }, true) // Use admin client to bypass RLS
        console.log('✅ [sync] Candidate updated successfully')

        // Update or create profile
        console.log('🔍 [sync] Checking profile existence...')
        const existingProfile = await getProfileByCandidate(userData.id)
        if (existingProfile) {
          console.log('👤 [sync] Profile EXISTS - updating...')
          await updateProfile(userData.id, {
            bio: userData.bio || null,
            position: userData.position || null,
            location: userData.location || null,
            birthday: userData.birthday || null,
            gender: userData.gender as any || null,
            profile_completed: userData.completed_data ?? false,
          })
          console.log('✅ [sync] Profile updated successfully')
        } else {
          console.log('➕ [sync] Profile NOT FOUND - creating...')
          await createProfile(userData.id, {
            bio: userData.bio || null,
            position: userData.position || null,
            location: userData.location || null,
            birthday: userData.birthday || null,
            gender: userData.gender as any || null,
            profile_completed: userData.completed_data ?? false,
          })
          console.log('✅ [sync] Profile created successfully')
        }

        result = {
          success: true,
          action: 'updated',
          user: updated,
        }
      } catch (updateError) {
        console.error('❌ [sync] Error updating candidate/profile:', {
          error: updateError instanceof Error ? updateError.message : String(updateError),
          stack: updateError instanceof Error ? updateError.stack : undefined,
          candidate_id: userData.id,
        })
        throw updateError
      }
    } else {
      // Create new candidate
      console.log('➕ [sync] Candidate NOT FOUND - creating new candidate...')
      try {
        const newCandidate = await createCandidate({
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone: userData.phone || null,
          avatar_url: userData.avatar_url || null,
        })
        console.log('✅ [sync] Candidate created successfully:', {
          id: newCandidate.id,
          email: newCandidate.email,
          full_name: newCandidate.full_name,
        })

        // Create profile
        console.log('➕ [sync] Creating candidate profile...')
        await createProfile(userData.id, {
          bio: userData.bio || null,
          position: userData.position || null,
          location: userData.location || null,
          birthday: userData.birthday || null,
          gender: userData.gender as any || null,
          profile_completed: userData.completed_data ?? false,
        })
        console.log('✅ [sync] Profile created successfully')

        result = {
          success: true,
          action: 'created',
          user: newCandidate,
        }
      } catch (createError) {
        console.error('❌ [sync] Error creating candidate/profile:', {
          error: createError instanceof Error ? createError.message : String(createError),
          stack: createError instanceof Error ? createError.stack : undefined,
          candidate_id: userData.id,
          email: userData.email,
        })
        throw createError
      }
    }

    console.log('✅ [sync] User sync completed successfully:', {
      action: result.action,
      user_id: result.user.id,
      email: result.user.email,
    })
    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Enhanced error logging with step-by-step breakdown
    console.error('❌ [sync] ========== ERROR IN USER SYNC ==========')
    console.error('❌ [sync] Error Message:', errorMessage)
    console.error('❌ [sync] Error Stack:', errorStack)
    console.error('❌ [sync] User Data Received:', userData ? {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      has_location: !!userData.location,
      has_phone: !!userData.phone,
    } : 'NO USER DATA RECEIVED')
    console.error('❌ [sync] Timestamp:', new Date().toISOString())
    console.error('❌ [sync] Environment:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
    })
    console.error('❌ [sync] =========================================')
    
    // More specific error responses with actionable messages
    if (error instanceof Error) {
      const errorLower = error.message.toLowerCase()
      
      if (errorLower.includes('connection') || errorLower.includes('econnrefused') || errorLower.includes('network')) {
        console.error('❌ [sync] DIAGNOSIS: Database connection issue')
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: 'Unable to connect to Supabase database. Check your SUPABASE_DATABASE_URL and network connection.',
          code: 'DB_CONNECTION_ERROR',
          actionable: 'Verify Supabase environment variables are set correctly'
        }, { status: 503 })
      } 
      
      if (errorLower.includes('timeout')) {
        console.error('❌ [sync] DIAGNOSIS: Database timeout')
        return NextResponse.json({ 
          error: 'Database timeout',
          details: 'Database query timed out. The database may be overloaded.',
          code: 'DB_TIMEOUT_ERROR',
          actionable: 'Retry the request or check database performance'
        }, { status: 504 })
      } 
      
      if (errorLower.includes('duplicate key') || errorLower.includes('unique constraint') || errorLower.includes('already exists')) {
        console.error('❌ [sync] DIAGNOSIS: Duplicate user')
        return NextResponse.json({ 
          error: 'User already exists',
          details: `A user with ID ${userData?.id} or email ${userData?.email} already exists in the database.`,
          code: 'DUPLICATE_USER_ERROR',
          actionable: 'User may already be registered. Try signing in instead.'
        }, { status: 409 })
      }
      
      if (errorLower.includes('foreign key') || errorLower.includes('constraint')) {
        console.error('❌ [sync] DIAGNOSIS: Foreign key constraint violation')
        return NextResponse.json({ 
          error: 'Database constraint violation',
          details: error.message,
          code: 'DB_CONSTRAINT_ERROR',
          actionable: 'Check that all required related records exist'
        }, { status: 400 })
      }
      
      if (errorLower.includes('permission') || errorLower.includes('policy') || errorLower.includes('rls')) {
        console.error('❌ [sync] DIAGNOSIS: Row Level Security (RLS) policy violation')
        return NextResponse.json({ 
          error: 'Permission denied',
          details: 'Row Level Security policy prevented this operation. Ensure service role key is configured.',
          code: 'RLS_POLICY_ERROR',
          actionable: 'Verify SUPABASE_SERVICE_ROLE_KEY is set and has admin access'
        }, { status: 403 })
      }
    }
    
    // Generic error response
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      code: 'INTERNAL_SERVER_ERROR',
      actionable: 'Check server logs for detailed error information',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 