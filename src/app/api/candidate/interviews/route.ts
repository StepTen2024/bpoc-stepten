import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch interviews for the logged-in candidate
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get candidate's applications
    const { data: applications } = await supabaseAdmin
      .from('job_applications')
      .select('id')
      .eq('candidate_id', user.id);

    if (!applications || applications.length === 0) {
      return NextResponse.json({ interviews: [] });
    }

    const applicationIds = applications.map(a => a.id);

    // Get interviews for those applications
    const { data: interviews, error } = await supabaseAdmin
      .from('job_interviews')
      .select(`
        id,
        interview_type,
        status,
        outcome,
        scheduled_at,
        duration_minutes,
        meeting_link,
        interviewer_notes,
        created_at,
        application:job_applications (
          id,
          job:jobs (
            id,
            title,
            agency_client:agency_clients (
              company:companies (
                name
              )
            )
          )
        )
      `)
      .in('application_id', applicationIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedInterviews = (interviews || []).map((interview) => {
      const app = interview.application as {
        id: string;
        job?: { 
          id: string; 
          title: string;
          agency_client?: { company?: { name: string } };
        };
      } | null;

      return {
        id: interview.id,
        jobId: app?.job?.id,
        jobTitle: app?.job?.title || 'Unknown Job',
        company: app?.job?.agency_client?.company?.name || 'ShoreAgents Client',
        type: interview.interview_type,
        status: interview.status,
        outcome: interview.outcome,
        scheduledAt: interview.scheduled_at,
        duration: interview.duration_minutes,
        meetingLink: interview.meeting_link,
        notes: interview.interviewer_notes,
        createdAt: interview.created_at,
      };
    });

    return NextResponse.json({ interviews: formattedInterviews });

  } catch (error) {
    console.error('Candidate interviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}

