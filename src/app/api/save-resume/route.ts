import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCandidateById } from '@/lib/db/candidates'

/**
 * POST /api/save-resume
 * Save extracted resume data to candidate_resumes table
 * Called by processResumeFile in utils.ts during extraction
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/save-resume] Starting...')
    
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

    // Check if candidate exists
    const candidate = await getCandidateById(userId, true)
    if (!candidate) {
      console.log('❌ Candidate not found:', userId)
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    console.log('✅ Candidate found')

    // Generate slug
    const slug = `${userId}-${Date.now()}`

    // Check if resume already exists
    const { data: existingResume } = await supabaseAdmin
      .from('candidate_resumes')
      .select('id')
      .eq('candidate_id', userId)
      .eq('is_primary', true)
      .single()

    let savedResume
    
    if (existingResume) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('candidate_resumes')
        .update({
          resume_data: resumeData,
          original_filename: originalFilename || 'extracted_resume.json',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingResume.id)
        .select()
        .single()

      if (error) throw error
      savedResume = data
      console.log('✅ Updated existing resume:', savedResume.id)
    } else {
      // Insert new
      const { data, error } = await supabaseAdmin
        .from('candidate_resumes')
        .insert({
          candidate_id: userId,
          resume_data: resumeData,
          original_filename: originalFilename || 'extracted_resume.json',
          slug: slug,
          title: 'Extracted Resume',
          is_primary: true,
          is_public: false,
        })
        .select()
        .single()

      if (error) throw error
      savedResume = data
      console.log('✅ Created new resume:', savedResume.id)
    }

    return NextResponse.json({
      success: true,
      resumeId: savedResume.id,
      message: 'Resume saved successfully'
    })

  } catch (error) {
    console.error('❌ Error saving resume:', error)
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

    const { error } = await supabaseAdmin
      .from('candidate_resumes')
      .delete()
      .eq('candidate_id', userId)
      .eq('is_primary', true)

    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting resume:', error)
    return NextResponse.json({ 
      error: 'Failed to delete resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

