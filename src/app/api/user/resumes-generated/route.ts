import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
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

    // Check if user has any generated resumes in Supabase
    // Note: resumes_generated table may not exist in Supabase schema yet
    // For now, return false - this can be implemented when table is added
    const { data, error } = await supabaseAdmin
      .from('resumes_generated')
      .select('*')
      .eq('candidate_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      // Table may not exist - return false for now
      console.log('Note: resumes_generated table may not exist:', error.message)
      return NextResponse.json({
        success: true,
        hasGeneratedResume: false
      })
    }

    if (data && data.length > 0) {
      const generatedResume = data[0]
      return NextResponse.json({
        success: true,
        hasGeneratedResume: true,
        id: generatedResume.id,
        originalResumeId: generatedResume.original_resume_id,
        generatedResumeData: generatedResume.generated_resume_data,
        templateUsed: generatedResume.template_used,
        generationMetadata: generatedResume.generation_metadata,
        createdAt: generatedResume.created_at,
        updatedAt: generatedResume.updated_at
      })
    } else {
      return NextResponse.json({
        success: true,
        hasGeneratedResume: false
      })
    }
  } catch (error) {
    console.error('❌ Error checking generated resumes:', error)
    return NextResponse.json(
      { error: 'Failed to check generated resumes', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('resumes_generated')
      .delete()
      .eq('candidate_id', userId)

    if (error) {
      console.error('Error deleting generated resumes:', error)
      return NextResponse.json(
        { error: 'Failed to delete generated resumes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting generated resumes:', error)
    return NextResponse.json(
      { error: 'Failed to delete generated resumes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
