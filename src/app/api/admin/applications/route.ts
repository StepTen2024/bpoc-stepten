import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Fetch all applications for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        status,
        created_at,
        candidate:candidates (
          id,
          email,
          first_name,
          last_name,
          avatar_url
        ),
        job:jobs (
          id,
          title,
          agency_client:agency_clients (
            company:companies (
              name
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: applications, error } = await query;

    if (error) throw error;

    const formattedApps = (applications || []).map((app) => {
      const candidate = app.candidate as { id: string; email: string; first_name: string; last_name: string; avatar_url?: string } | null;
      const job = app.job as { id: string; title: string; agency_client?: { company?: { name: string } } } | null;

      return {
        id: app.id,
        candidateId: candidate?.id,
        candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}`.trim() || candidate.email : 'Unknown',
        candidateEmail: candidate?.email || '',
        candidateAvatar: candidate?.avatar_url,
        jobId: job?.id,
        jobTitle: job?.title || 'Unknown Job',
        company: job?.agency_client?.company?.name || 'ShoreAgents Client',
        status: app.status,
        appliedAt: app.created_at,
      };
    });

    return NextResponse.json({ applications: formattedApps });

  } catch (error) {
    console.error('Applications API error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

// PATCH - Update application status
export async function PATCH(request: NextRequest) {
  try {
    const { applicationId, status, notes } = await request.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .update({
        status,
        recruiter_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, application: data });

  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

