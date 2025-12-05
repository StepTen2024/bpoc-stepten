/**
 * Updated User Profile API Route
 * Uses new database abstraction layer with feature flags
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔍 API v2: Fetching profile for user:', userId)

    // Get candidate (basic info)
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      console.log('❌ API v2: Candidate not found:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get profile (extended info - work_status, privacy, gamification)
    const profile = await getProfileByCandidate(userId)

    // Combine into expected shape (matching old API format)
    const userProfile = {
      id: candidate.id,
      email: candidate.email,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      full_name: candidate.full_name,
      location: profile?.location || null,
      avatar_url: candidate.avatar_url,
      phone: candidate.phone,
      bio: profile?.bio || null,
      position: profile?.position || null,
      completed_data: profile?.profile_completed || false,
      birthday: profile?.birthday || null,
      slug: candidate.slug,
      gender: profile?.gender || null,
      gender_custom: profile?.gender_custom || null,
      username: candidate.username,
      company: profile?.current_employer || null,
      admin_level: null, // Admins are in bpoc_users, not candidates
      location_place_id: profile?.location_place_id || null,
      location_lat: profile?.location_lat || null,
      location_lng: profile?.location_lng || null,
      location_city: profile?.location_city || null,
      location_province: profile?.location_province || null,
      location_country: profile?.location_country || null,
      location_barangay: profile?.location_barangay || null,
      location_region: profile?.location_region || null,
      created_at: candidate.created_at,
      updated_at: candidate.updated_at,
      overall_score: profile?.gamification?.total_xp || 0,
    }

    console.log('✅ API v2: User profile loaded:', { id: userProfile.id, email: userProfile.email })

    const response = NextResponse.json({ user: userProfile })

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('❌ API v2: Error fetching profile:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


