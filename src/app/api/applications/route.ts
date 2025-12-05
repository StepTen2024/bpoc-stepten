import { NextRequest, NextResponse } from 'next/server'
import { getApplicationsByCandidate, createApplication } from '@/lib/db/applications'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('🔍 Applications API called with userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify candidate exists - use admin client to bypass RLS
    const candidate = await getCandidateById(userId, true)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get applications from Supabase
    const applications = await getApplicationsByCandidate(userId)
    
    if (applications.length === 0) {
      return NextResponse.json({
        applications: [],
        total: 0,
        message: 'No applications found'
      })
    }

    // Fetch job details for each application
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const jobIds = applications.map(app => app.job_id)
    
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        title,
        description,
        requirements,
        responsibilities,
        benefits,
        salary_min,
        salary_max,
        currency,
        salary_type,
        work_arrangement,
        work_type,
        shift,
        experience_level,
        industry,
        department,
        application_deadline,
        agency_client:agency_clients!inner(
          company:companies!inner(
            name
          )
        )
      `)
      .in('id', jobIds)

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }

    const jobsMap = new Map((jobs || []).map(job => [job.id, job]))

    // Combine applications with job details
    const applicationsWithJobs = applications.map(app => {
      const job = jobsMap.get(app.job_id)
      return {
        id: app.id,
        jobId: app.job_id,
        resumeId: app.resume_id,
        status: app.status,
        appliedDate: app.created_at,
        job: job ? {
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          benefits: job.benefits,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          currency: job.currency,
          salaryType: job.salary_type,
          workArrangement: job.work_arrangement,
          workType: job.work_type,
          shift: job.shift,
          experienceLevel: job.experience_level,
          industry: job.industry,
          department: job.department,
          applicationDeadline: job.application_deadline,
          companyName: job.agency_client?.company?.name || 'Unknown',
        } : null,
      }
    }).filter(app => app.job !== null)

    return NextResponse.json({
      applications: applicationsWithJobs,
      total: applicationsWithJobs.length,
      message: 'Applications retrieved successfully'
    })
  } catch (error) {
    console.error('❌ Error in applications API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, jobId, resumeId } = body

    if (!userId || !jobId || !resumeId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, jobId, resumeId' },
        { status: 400 }
      )
    }

    // Verify candidate exists - use admin client to bypass RLS
    const candidate = await getCandidateById(userId, true)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create application in Supabase
    const application = await createApplication({
      candidate_id: userId,
      job_id: jobId,
      resume_id: resumeId,
    })

    return NextResponse.json({
      application: {
        id: application.id,
        jobId: application.job_id,
        resumeId: application.resume_id,
        status: application.status,
        appliedDate: application.created_at
      },
      message: 'Application submitted successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

