import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById, updateCandidate, createCandidate } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/candidates/[id]
 * Get candidate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidate = await getCandidateById(params.id)
    
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    const profile = await getProfileByCandidate(params.id)

    return NextResponse.json({
      candidate,
      profile,
    })
  } catch (error) {
    console.error('Error fetching candidate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/candidates/[id]
 * Update candidate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    // Check if candidate exists
    let candidate = await getCandidateById(params.id, true) // Use admin to check
    
    // If candidate doesn't exist, create it first using auth user data
    if (!candidate) {
      console.log('📝 Candidate not found, creating from auth user:', params.id)
      
      // Get user data from auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(params.id)
      
      if (authError || !authUser?.user) {
        console.error('❌ Failed to get auth user:', authError)
        return NextResponse.json(
          { error: 'User not found in authentication system' },
          { status: 404 }
        )
      }

      const user = authUser.user
      const userMetadata = user.user_metadata || {}
      
      // Extract name from metadata or email
      const firstName = userMetadata.first_name || userMetadata.given_name || userMetadata.name?.split(' ')[0] || 'User'
      const lastName = userMetadata.last_name || userMetadata.family_name || userMetadata.name?.split(' ').slice(1).join(' ') || ''
      
      console.log('📝 Creating candidate from auth user:', {
        id: user.id,
        email: user.email,
        firstName,
        lastName
      })

      // Create candidate with data from request or defaults
      candidate = await createCandidate({
        id: user.id,
        email: user.email || '',
        first_name: data.first_name || firstName,
        last_name: data.last_name || lastName,
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        username: data.username || null,
        slug: data.slug || null,
      })
      
      console.log('✅ Candidate created successfully')
    }
    
    // Only include defined fields for partial update
    const updateData: any = {}
    if (data.first_name !== undefined) updateData.first_name = data.first_name
    if (data.last_name !== undefined) updateData.last_name = data.last_name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url
    if (data.username !== undefined) updateData.username = data.username
    if (data.slug !== undefined) updateData.slug = data.slug
    
    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      console.log('📝 Updating candidate in Supabase:', { id: params.id, updateData })
      const updated = await updateCandidate(params.id, updateData)
      
      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to update candidate' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ candidate: updated })
    }
    
    // Return existing candidate if no updates
    return NextResponse.json({ candidate })
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

