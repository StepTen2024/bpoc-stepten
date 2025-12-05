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
    
    // Use admin client to bypass RLS for profile operations
    let profile = await getProfileByCandidate(params.id, true)
    
    if (!profile) {
      console.log('➕ Profile not found, creating new profile...')
      profile = await createProfile(params.id, data)
    } else {
      console.log('🔄 Profile exists, updating...')
      profile = await updateProfile(params.id, data, true) // Use admin client
    }

    if (!profile) {
      console.error('❌ Failed to update/create profile')
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    console.log('✅ Profile updated successfully:', profile.id)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('❌ Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

