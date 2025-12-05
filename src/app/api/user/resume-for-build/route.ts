import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/user/resume-for-build
 * Get the user's resume data for the build/edit page
 * Combines extracted resume + AI analysis improvements
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!userId || !sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch extracted resume
    const { data: resume } = await supabaseAdmin
      .from('candidate_resumes')
      .select('*')
      .eq('candidate_id', userId)
      .eq('is_primary', true)
      .single();

    // Fetch AI analysis with improved data
    const { data: analysis } = await supabaseAdmin
      .from('candidate_ai_analysis')
      .select('*')
      .eq('candidate_id', userId)
      .single();

    if (!resume?.resume_data) {
      return NextResponse.json({
        success: true,
        hasData: false
      });
    }

    // Combine extracted resume with AI improvements
    const extractedResume = resume.resume_data;
    const improvedSummary = analysis?.improved_summary;
    
    // Build the improved resume by merging data
    const improvedResume = {
      ...extractedResume,
      summary: improvedSummary || extractedResume.summary || '',
      // Include analysis scores if available
      analysisScores: analysis ? {
        overall: analysis.overall_score,
        ats: analysis.ats_compatibility_score,
        content: analysis.content_quality_score,
      } : null
    };

    return NextResponse.json({
      success: true,
      hasData: true,
      extractedResume: extractedResume,
      improvedResume: improvedResume,
      slug: resume.slug,
      profilePhoto: extractedResume.profilePhoto || null,
      template: resume.template || null,
      analysis: analysis ? {
        keyStrengths: analysis.key_strengths,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
      } : null
    });

  } catch (error) {
    console.error('Error fetching resume for build:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume data' },
      { status: 500 }
    );
  }
}

