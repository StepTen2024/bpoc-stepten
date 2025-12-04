import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Recruiter Recent Applications API: Starting to fetch recent recruiter applications...')
    
    // Get recruiter ID from headers (set by middleware)
    const recruiterId = request.headers.get('x-user-id')
    if (!recruiterId) {
      console.log('❌ No recruiter ID found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(recruiterId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('🔍 Fetching applications for recruiter:', recruiterId)
    
    // Get jobs posted by this recruiter
    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('id, title')
      .eq('posted_by', recruiterId)
      .limit(50)

    const jobIds = jobs?.map(j => j.id) || []

    if (jobIds.length === 0) {
      console.log('📝 No jobs found for this recruiter')
      return NextResponse.json({ 
        recent_activity: [],
        message: 'No applications yet. Post your first job to start receiving applications!'
      })
    }

    // Get applications for these jobs
    const { data: applications } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        created_at,
        candidate:candidates!inner(
          id,
          full_name,
          avatar_url
        ),
        job:jobs!inner(
          id,
          title
        )
      `)
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!applications || applications.length === 0) {
      console.log('📝 No applications found for this recruiter')
      return NextResponse.json({ 
        recent_activity: [],
        message: 'No applications yet. Post your first job to start receiving applications!'
      })
    }

    const recentActivity = applications.map((app: any) => ({
      type: 'applicants',
      user_name: app.candidate?.full_name || 'Unknown',
      user_avatar: app.candidate?.avatar_url,
      action: `Applied for: ${app.job?.title || 'Job Position'}`,
      score: null,
      activity_time: app.created_at
    }))

    console.log('🎯 Total recruiter activities found:', recentActivity.length)

    return NextResponse.json({ 
      recent_activity: recentActivity,
      message: 'Real recruiter application data found'
    })
    
  } catch (error) {
    console.error('❌ Error getting recent recruiter applications:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
