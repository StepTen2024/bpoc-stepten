import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Fetch jobs with agency_client -> agency and company info
    let query = supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        slug,
        description,
        status,
        work_type,
        work_arrangement,
        salary_min,
        salary_max,
        currency,
        industry,
        created_at,
        agency_client:agency_clients (
          id,
          agency:agencies (
            id,
            name
          ),
          company:companies (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Jobs fetch error:', error);
      throw error;
    }

    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      (jobs || []).map(async (job) => {
        const { count } = await supabaseAdmin
          .from('job_applications')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', job.id);

        // Format salary
        let salary = 'Not specified';
        if (job.salary_min && job.salary_max) {
          const currency = job.currency || 'PHP';
          salary = `${currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
        } else if (job.salary_min) {
          salary = `${job.currency || 'PHP'} ${job.salary_min.toLocaleString()}+`;
        }

        // Extract nested data
        const agencyClient = job.agency_client as { agency?: { id: string; name: string }; company?: { id: string; name: string } } | null;

        return {
          id: job.id,
          title: job.title,
          slug: job.slug,
          company: agencyClient?.company?.name || 'ShoreAgents Client',
          agencyId: agencyClient?.agency?.id || null,
          agencyName: agencyClient?.agency?.name || 'ShoreAgents',
          location: job.industry || 'Remote',
          salary,
          type: job.work_type || 'full_time',
          arrangement: job.work_arrangement || 'remote',
          status: job.status,
          applicantsCount: count || 0,
          createdAt: job.created_at,
        };
      })
    );

    return NextResponse.json({ jobs: jobsWithCounts });

  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

