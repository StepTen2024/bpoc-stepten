import { NextRequest, NextResponse } from 'next/server'
import { getResumeByCandidateId, deleteResume } from '@/lib/db/resumes'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get resume from Supabase
    const resume = await getResumeByCandidateId(userId)

    if (!resume) {
      return NextResponse.json({ hasData: false })
    }

    return NextResponse.json({ 
      hasData: true, 
      resumeData: resume.resume_data 
    })
  } catch (err) {
    console.error('Error fetching extracted resume:', err)
    return NextResponse.json({ 
      error: 'Failed to load extracted resume',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not provided' }, { status: 400 })
    }

    // Delete resume from Supabase
    await deleteResume(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting extracted resume:', error)
    return NextResponse.json(
      { error: 'Failed to delete extracted resume', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


