import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Fetch active jobs for candidates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        slug,
        description,
        requirements,
        responsibilities,
        benefits,
        work_type,
        work_arrangement,
        shift,
        experience_level,
        salary_min,
        salary_max,
        currency,
        created_at,
        agency_client:agency_clients (
          agency:agencies (
            name,
            logo_url
          ),
          company:companies (
            name
          )
        ),
        job_skills (
          name
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    // Format jobs for display
    const formattedJobs = (jobs || []).map((job) => {
      const agencyClient = job.agency_client as { agency?: { name: string; logo_url?: string }; company?: { name: string } } | null;
      
      return {
        id: job.id,
        title: job.title,
        slug: job.slug,
        description: job.description,
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        benefits: job.benefits || [],
        workType: job.work_type,
        workArrangement: job.work_arrangement,
        shift: job.shift,
        experienceLevel: job.experience_level,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        currency: job.currency || 'PHP',
        company: agencyClient?.company?.name || 'ShoreAgents Client',
        agency: agencyClient?.agency?.name || 'ShoreAgents',
        agencyLogo: agencyClient?.agency?.logo_url,
        skills: (job.job_skills || []).map((s: { name: string }) => s.name),
        createdAt: job.created_at,
      };
    });

    return NextResponse.json({ jobs: formattedJobs });

  } catch (error) {
    console.error('Public jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

