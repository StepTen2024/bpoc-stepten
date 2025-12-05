import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Fetch agencies with their profiles and counts
    let query = supabaseAdmin
      .from('agencies')
      .select(`
        id,
        name,
        slug,
        email,
        phone,
        logo_url,
        website,
        is_active,
        created_at,
        agency_profiles (
          description,
          city,
          country,
          founded_year
        )
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: agencies, error } = await query;

    if (error) {
      console.error('Agencies fetch error:', error);
      throw error;
    }

    // Get recruiter and job counts for each agency
    const agenciesWithCounts = await Promise.all(
      (agencies || []).map(async (agency) => {
        const [recruitersResult, jobsResult] = await Promise.all([
          supabaseAdmin
            .from('agency_recruiters')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id)
            .eq('is_active', true),
          supabaseAdmin
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id)
            .eq('status', 'active')
        ]);

        return {
          ...agency,
          recruitersCount: recruitersResult.count || 0,
          activeJobsCount: jobsResult.count || 0,
          status: agency.is_active ? 'active' : 'inactive',
          location: agency.agency_profiles?.[0]?.city && agency.agency_profiles?.[0]?.country
            ? `${agency.agency_profiles[0].city}, ${agency.agency_profiles[0].country}`
            : 'No location',
        };
      })
    );

    return NextResponse.json({ agencies: agenciesWithCounts });

  } catch (error) {
    console.error('Agencies API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 }
    );
  }
}

