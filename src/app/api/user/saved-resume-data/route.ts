import { NextRequest, NextResponse } from 'next/server'
import { getResumeByCandidateId } from '@/lib/db/resumes'
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

    // Fetch the most recent saved resume from Supabase
    const resume = await getResumeByCandidateId(userId)

    if (resume) {
      return NextResponse.json({ 
        success: true,
        hasData: true, 
        resumeData: resume.resume_data
      })
    } else {
      return NextResponse.json({ 
        success: false,
        hasData: false, 
        message: 'No saved resume found' 
      })
    }
  } catch (error) {
    console.error('❌ Error fetching saved resume data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved resume data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
