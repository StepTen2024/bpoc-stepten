import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Fetch analysis results from Supabase
    // Note: ai_analysis_results table may need to be created in Supabase schema
    let query = supabaseAdmin
      .from('ai_analysis_results')
      .select('*')
      .eq('candidate_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    const { data, error } = await query

    if (error) {
      // Table may not exist - return not found
      console.log('Note: ai_analysis_results table may not exist:', error.message)
      return NextResponse.json({ found: false })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ found: false })
    }

    const analysis = data[0]
    return NextResponse.json({ 
      found: true, 
      analysis: {
        id: analysis.id,
        sessionId: analysis.session_id,
        overallScore: analysis.overall_score,
        atsCompatibility: analysis.ats_compatibility_score,
        contentQuality: analysis.content_quality_score,
        professionalPresentation: analysis.professional_presentation_score,
        skillsAlignment: analysis.skills_alignment_score,
        keyStrengths: analysis.key_strengths,
        strengthsAnalysis: analysis.strengths_analysis,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
        improvedSummary: analysis.improved_summary,
        salaryAnalysis: analysis.salary_analysis,
        careerPath: analysis.career_path,
        sectionAnalysis: analysis.section_analysis,
        portfolioLinks: analysis.portfolio_links,
        filesAnalyzed: analysis.files_analyzed,
        candidateProfile: analysis.candidate_profile,
        skillsSnapshot: analysis.skills_snapshot,
        experienceSnapshot: analysis.experience_snapshot,
        educationSnapshot: analysis.education_snapshot,
        createdAt: analysis.created_at,
        updatedAt: analysis.updated_at
      }
    })
  } catch (error) {
    console.error('❌ GET /api/user/analysis-results error:', error)
    return NextResponse.json({ 
      error: 'Failed to load analysis results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { error } = await supabaseAdmin
      .from('ai_analysis_results')
      .delete()
      .eq('candidate_id', userId)

    if (error) {
      console.error('Error deleting analysis results:', error)
      return NextResponse.json({ 
        error: 'Failed to clear analysis results',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to clear analysis results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


