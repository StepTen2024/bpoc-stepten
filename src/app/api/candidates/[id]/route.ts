import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById, updateCandidate } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

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
    
    const updated = await updateCandidate(params.id, {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      avatar_url: data.avatar_url,
      username: data.username,
      slug: data.slug,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ candidate: updated })
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

