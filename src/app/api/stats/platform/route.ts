import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // Fetch total users count from Supabase
    const { count: totalUsers } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })

    // Fetch active resumes count from Supabase
    const { count: activeResumes } = await supabaseAdmin
      .from('candidate_resumes')
      .select('*', { count: 'exact', head: true })

    // Fetch active jobs count from Supabase
    const { count: activeJobs } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeResumes: activeResumes || 0,
      activeJobs: activeJobs || 0
    })
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch platform statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
