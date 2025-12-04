import { NextRequest, NextResponse } from 'next/server'
import { getResumeByCandidateId, deleteResume } from '@/lib/db/resumes'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not provided' }, { status: 400 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get resume from Supabase
    const resume = await getResumeByCandidateId(userId)

    if (resume) {
      return NextResponse.json({
        success: true,
        hasSavedResume: true,
        id: resume.id,
        resumeId: resume.id,
        resumeSlug: resume.slug,
        resumeTitle: resume.title || 'Resume',
        resumeUrl: resume.slug ? `/resume/${resume.slug}` : '/resume-builder'
      })
    } else {
      return NextResponse.json({
        success: true,
        hasSavedResume: false,
        resumeUrl: '/resume-builder'
      })
    }
  } catch (error) {
    console.error('❌ Error checking saved resumes:', error)
    return NextResponse.json(
      { error: 'Failed to check saved resumes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
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
    console.error('❌ Error deleting saved resumes:', error)
    return NextResponse.json(
      { error: 'Failed to delete saved resumes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}