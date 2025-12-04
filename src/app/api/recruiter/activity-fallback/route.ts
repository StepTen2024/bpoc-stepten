import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById } from '@/lib/db/candidates'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  console.log('🔍 API called: GET /api/recruiter/activity-fallback')
  
  try {
    // Get user ID from headers (set by middleware)
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

    console.log('🔍 Recruiter ID:', recruiterId)

    // Try to fetch real activities from Supabase
    // Get jobs posted by this recruiter
    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('posted_by', recruiterId)
      .limit(10)

    const jobIds = jobs?.map(j => j.id) || []

    if (jobIds.length > 0) {
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

      if (applications && applications.length > 0) {
        const activities = applications.map((app: any) => ({
          type: 'applicants',
          user_name: app.candidate?.full_name || 'Unknown',
          user_avatar: app.candidate?.avatar_url,
          action: `Applied for: ${app.job?.title || 'Job Position'}`,
          score: null,
          activity_time: app.created_at
        }))

        return NextResponse.json({
          success: true,
          activities,
          total: activities.length,
          message: 'Recent activity found'
        })
      }
    }

    // Return empty activities with helpful message for new recruiters
    console.log('✅ Returning fallback activities for new recruiter')

    return NextResponse.json({
      success: true,
      activities: [],
      total: 0,
      message: 'Welcome! Start by posting your first job to see activity here!'
    })

  } catch (error) {
    console.error('❌ Error in fallback activity endpoint:', error)
    
    return NextResponse.json({
      success: true,
      activities: [],
      total: 0,
      message: 'Welcome! Start by posting your first job to see activity here!'
    })
  }
}
