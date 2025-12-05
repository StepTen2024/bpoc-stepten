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
    let profile = await getProfileByCandidate(params.id)
    
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
    
    let profile = await getProfileByCandidate(params.id)
    
    if (!profile) {
      profile = await createProfile(params.id, data)
    } else {
      profile = await updateProfile(params.id, data)
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

