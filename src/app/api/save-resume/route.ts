import { NextRequest, NextResponse } from 'next/server'
import { saveResume, getResumeByCandidateId } from '@/lib/db/resumes'
import { getCandidateById } from '@/lib/db/candidates'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting save-resume API call...')
    
    const { resumeData, originalFilename } = await request.json()
    console.log('📥 Received data:', { 
      hasResumeData: !!resumeData, 
      originalFilename,
      resumeDataKeys: resumeData ? Object.keys(resumeData) : null
    })

    if (!resumeData) {
      console.log('❌ Missing resumeData')
      return NextResponse.json(
        { error: 'Missing required field: resumeData' },
        { status: 400 }
      )
    }

    // Get the user from the request headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    console.log('👤 User ID from headers:', userId)
    
    if (!userId) {
      console.log('❌ No user ID found in headers')
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Check if candidate exists in Supabase
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      console.log('❌ Candidate not found in Supabase:', userId)
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    console.log('✅ Candidate found in Supabase')

    // Save resume to Supabase
    console.log('💾 Saving resume to Supabase...')
    const resume = await saveResume({
      candidate_id: userId,
      resume_data: resumeData,
      original_filename: originalFilename || 'extracted_resume.json',
      is_primary: true,
      is_public: false,
    })

    console.log(`💾 Resume saved to Supabase: ${resume.id}`)
    console.log(`👤 Candidate ID: ${userId}`)
    console.log(`📁 Original filename: ${originalFilename}`)

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      message: 'Resume saved to Supabase successfully'
    })

  } catch (error) {
    console.error('❌ Error saving resume to database:', error)
    return NextResponse.json(
      {
        error: 'Failed to save resume to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const { deleteResume } = await import('@/lib/db/resumes')
    await deleteResume(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting resume:', error)
    return NextResponse.json({ 
      error: 'Failed to clear extracted resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 