import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJobsByRecruiter } from '@/lib/db/jobs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API called: GET /api/recruiter/total-applicants')
    
    // Get recruiter ID from Supabase session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Fallback to x-user-id header
      const xUserId = request.headers.get('x-user-id')
      if (!xUserId) {
        console.log('❌ No recruiter ID found')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      var recruiterId = xUserId
    } else {
      var recruiterId = user.id
    }

    console.log('🔍 Fetching total applicants for recruiter:', recruiterId)

    // Get all jobs posted by this recruiter
    const jobs = await getJobsByRecruiter(recruiterId)
    const jobIds = jobs.map(job => job.id)

    if (jobIds.length === 0) {
      console.log('📝 No jobs found for this recruiter')
      return NextResponse.json({
        total_applicants: 0,
        recruiter_id: recruiterId
      })
    }

    // Get total applicants from Supabase
    const { count, error: countError } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .in('job_id', jobIds)

    if (countError) {
      console.error('Error counting applications:', countError)
      return NextResponse.json({ error: 'Failed to count applications' }, { status: 500 })
    }

    console.log('✅ Total applicants found:', count || 0)

    return NextResponse.json({
      total_applicants: count || 0,
      recruiter_id: recruiterId
    })

  } catch (error) {
    console.error('❌ Error fetching total applicants:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      error: 'Failed to fetch total applicants',
      details: errorMessage
    }, { status: 500 })
  }
}
