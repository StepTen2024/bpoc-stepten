import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Fetch all interviews for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabaseAdmin
      .from('job_interviews')
      .select(`
        id,
        interview_type,
        status,
        outcome,
        scheduled_at,
        duration_minutes,
        meeting_link,
        notes,
        created_at,
        application:job_applications (
          id,
          candidate:candidates (
            id,
            email,
            first_name,
            last_name,
            avatar_url
          ),
          job:jobs (
            id,
            title
          )
        )
      `)
      .order('scheduled_at', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: interviews, error } = await query;

    if (error) throw error;

    const formattedInterviews = (interviews || []).map((interview) => {
      const app = interview.application as {
        id: string;
        candidate?: { id: string; email: string; first_name: string; last_name: string; avatar_url?: string };
        job?: { id: string; title: string };
      } | null;

      return {
        id: interview.id,
        applicationId: app?.id,
        candidateId: app?.candidate?.id,
        candidateName: app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}`.trim() : 'Unknown',
        candidateEmail: app?.candidate?.email || '',
        jobId: app?.job?.id,
        jobTitle: app?.job?.title || 'Unknown Job',
        type: interview.interview_type,
        status: interview.status,
        outcome: interview.outcome,
        scheduledAt: interview.scheduled_at,
        duration: interview.duration_minutes,
        meetingLink: interview.meeting_link,
        notes: interview.notes,
        createdAt: interview.created_at,
      };
    });

    return NextResponse.json({ interviews: formattedInterviews });

  } catch (error) {
    console.error('Interviews API error:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}

// POST - Request/Schedule an interview
export async function POST(request: NextRequest) {
  try {
    const { 
      applicationId, 
      interviewType = 'screening',
      scheduledAt,
      durationMinutes = 30,
      meetingLink,
      notes
    } = await request.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Update application status to interview_scheduled
    await supabaseAdmin
      .from('job_applications')
      .update({ status: 'interview_scheduled' })
      .eq('id', applicationId);

    // Create interview record
    const { data: interview, error } = await supabaseAdmin
      .from('job_interviews')
      .insert({
        application_id: applicationId,
        interview_type: interviewType,
        status: scheduledAt ? 'scheduled' : 'pending',
        scheduled_at: scheduledAt || null,
        duration_minutes: durationMinutes,
        meeting_link: meetingLink || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Interview scheduled successfully',
      interview
    });

  } catch (error) {
    console.error('Create interview error:', error);
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
  }
}

// PATCH - Update interview status/details
export async function PATCH(request: NextRequest) {
  try {
    const { interviewId, status, outcome, notes, scheduledAt, meetingLink } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (outcome) updates.outcome = outcome;
    if (notes !== undefined) updates.notes = notes;
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (meetingLink !== undefined) updates.meeting_link = meetingLink;

    const { data, error } = await supabaseAdmin
      .from('job_interviews')
      .update(updates)
      .eq('id', interviewId)
      .select()
      .single();

    if (error) throw error;

    // If outcome is set, update application status
    if (outcome === 'passed') {
      const interview = await supabaseAdmin
        .from('job_interviews')
        .select('application_id')
        .eq('id', interviewId)
        .single();
      
      if (interview.data) {
        await supabaseAdmin
          .from('job_applications')
          .update({ status: 'interviewed' })
          .eq('id', interview.data.application_id);
      }
    }

    return NextResponse.json({ success: true, interview: data });

  } catch (error) {
    console.error('Update interview error:', error);
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}

