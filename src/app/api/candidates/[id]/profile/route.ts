import { NextRequest, NextResponse } from 'next/server'
import { getProfileByCandidate, updateProfile, createProfile } from '@/lib/db/profiles'

/**
 * GET /api/candidates/[id]/profile
 * Get candidate profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use admin client to bypass RLS for fetching profile
    let profile = await getProfileByCandidate(params.id, true)
    
    // Create profile if it doesn't exist
    if (!profile) {
      profile = await createProfile(params.id, {})
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/candidates/[id]/profile
 * Update candidate profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    console.log('📝 [PUT /api/candidates/[id]/profile] Updating profile:', { id: params.id, data })
    
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!hasUrl || !hasServiceKey) {
      console.error('❌ Missing Supabase environment variables:', {
        hasUrl,
        hasServiceKey,
      })
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
          hasUrl,
          hasServiceKey,
        },
        { status: 500 }
      )
    }
    
    // Use admin client to bypass RLS for profile operations
    let profile = await getProfileByCandidate(params.id, true)
    
    if (!profile) {
      console.log('➕ Profile not found, creating new profile...')
      try {
        profile = await createProfile(params.id, data)
        console.log('✅ Profile created successfully:', profile?.id)
      } catch (createError) {
        console.error('❌ Error creating profile:', createError)
        return NextResponse.json(
          { 
            error: 'Failed to create profile',
            details: createError instanceof Error ? createError.message : 'Unknown error',
            stack: createError instanceof Error ? createError.stack : undefined,
          },
          { status: 500 }
        )
      }
    } else {
      console.log('🔄 Profile exists, updating...')
      try {
        profile = await updateProfile(params.id, data, true) // Use admin client
        console.log('✅ Profile updated successfully:', profile?.id)
      } catch (updateError) {
        console.error('❌ Error updating profile:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to update profile',
            details: updateError instanceof Error ? updateError.message : 'Unknown error',
            stack: updateError instanceof Error ? updateError.stack : undefined,
          },
          { status: 500 }
        )
      }
    }

    if (!profile) {
      console.error('❌ Failed to update/create profile - no profile returned')
      return NextResponse.json(
        { 
          error: 'Failed to update profile',
          details: 'Update/create operation returned null',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('❌ Error updating profile:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    )
  }
}

