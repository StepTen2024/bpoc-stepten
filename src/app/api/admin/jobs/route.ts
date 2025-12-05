import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Fetch jobs with agency and company info
    let query = supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        slug,
        status,
        work_type,
        work_arrangement,
        salary_min,
        salary_max,
        salary_currency,
        location,
        created_at,
        agencies (
          id,
          name
        ),
        companies (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%`);
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
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', job.id);

        // Format salary
        let salary = 'Not specified';
        if (job.salary_min && job.salary_max) {
          const currency = job.salary_currency || 'USD';
          salary = `${currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
        } else if (job.salary_min) {
          salary = `${job.salary_currency || 'USD'} ${job.salary_min.toLocaleString()}+`;
        }

        return {
          id: job.id,
          title: job.title,
          slug: job.slug,
          company: job.companies?.name || 'Unknown Company',
          agencyId: job.agencies?.id,
          agencyName: job.agencies?.name || 'Direct Hire',
          location: job.location || 'Remote',
          salary,
          type: job.work_type || 'full-time',
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

