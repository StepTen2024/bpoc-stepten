import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCandidateById } from '@/lib/db/candidates';

/**
 * POST /api/candidates/resume/save-extracted
 * Save extracted resume data to candidate_resumes table in Supabase
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/candidates/resume/save-extracted] Starting...');
    
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId, true);
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { resumeData, originalFileName, candidateId } = body;

    if (!resumeData) {
      return NextResponse.json(
        { error: 'No resume data provided' },
        { status: 400 }
      );
    }

    console.log('💾 Saving extracted resume to candidate_resumes:', {
      candidate_id: userId,
      has_name: !!resumeData.name,
      has_email: !!resumeData.email,
      has_experience: !!resumeData.experience?.length,
      has_education: !!resumeData.education?.length,
      has_skills: !!resumeData.skills,
      original_filename: originalFileName,
    });

    // Generate a unique slug for this resume
    const timestamp = Date.now();
    const slug = `${userId}-extracted-${timestamp}`;

    // Check if an extracted resume already exists for this candidate
    const { data: existingResume } = await supabaseAdmin
      .from('candidate_resumes')
      .select('id')
      .eq('candidate_id', userId)
      .eq('is_primary', true)
      .single();

    let savedResume;
    
    if (existingResume) {
      // Update existing resume
      const { data, error } = await supabaseAdmin
        .from('candidate_resumes')
        .update({
          resume_data: resumeData,
          original_filename: originalFileName || null,
          title: 'Extracted Resume',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingResume.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating resume:', error);
        return NextResponse.json(
          { error: 'Failed to update resume', details: error.message },
          { status: 500 }
        );
      }
      savedResume = data;
      console.log('✅ Updated existing resume:', savedResume.id);
    } else {
      // Insert new resume
      const { data, error } = await supabaseAdmin
        .from('candidate_resumes')
        .insert({
          candidate_id: userId,
          resume_data: resumeData,
          original_filename: originalFileName || null,
          slug: slug,
          title: 'Extracted Resume',
          is_primary: true,
          is_public: false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting resume:', error);
        return NextResponse.json(
          { error: 'Failed to save resume', details: error.message },
          { status: 500 }
        );
      }
      savedResume = data;
      console.log('✅ Inserted new resume:', savedResume.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Resume saved to database',
      resume: {
        id: savedResume.id,
        candidate_id: savedResume.candidate_id,
        slug: savedResume.slug,
        title: savedResume.title,
        created_at: savedResume.created_at,
        updated_at: savedResume.updated_at,
      }
    });

  } catch (error) {
    console.error('❌ Error saving extracted resume:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

