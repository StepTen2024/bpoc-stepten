import { NextRequest, NextResponse } from 'next/server'
import { getJobsByRecruiter } from '@/lib/db/jobs'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a recruiter (in bpoc_users table)
    const { data: bpocUser } = await supabaseAdmin
      .from('bpoc_users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!bpocUser || bpocUser.role !== 'recruiter') {
      return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
    }

    // Fetch jobs posted by this recruiter from Supabase
    const jobs = await getJobsByRecruiter(userId)

    // Get company info for each job
    const jobsWithCompany = await Promise.all(jobs.map(async (job) => {
      const { data: agencyClient } = await supabaseAdmin
        .from('agency_clients')
        .select(`
          company:companies!inner(
            name
          )
        `)
        .eq('id', job.agency_client_id)
        .single()

      return {
        id: job.id,
        originalId: job.id,
        title: job.title,
        description: job.description,
        industry: job.industry || 'Not Specified',
        department: job.department || 'Not Specified',
        experienceLevel: job.experience_level || 'Not Specified',
        salaryMin: job.salary_min || 0,
        salaryMax: job.salary_max || 0,
        status: job.status || 'inactive',
        company: agencyClient?.company?.name || 'Unknown Company',
        created_at: job.created_at,
        work_type: job.work_type,
        work_arrangement: job.work_arrangement,
        shift: job.shift,
        priority: job.priority,
        currency: job.currency,
        salary_type: job.salary_type,
        application_deadline: job.application_deadline,
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
        benefits: Array.isArray(job.benefits) ? job.benefits : [],
        skills: [], // Skills are in job_skills table
        source_table: 'jobs'
      }
    }))

    console.log('🔍 Final jobs array:', jobsWithCompany.length)

    return NextResponse.json({ jobs: jobsWithCompany })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/recruiter/jobs - Starting job creation')
  
  try {
    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    console.log('🔍 User ID from headers:', userId)
    
    if (!userId) {
      console.log('❌ No user ID found in headers')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a recruiter
    const { data: bpocUser } = await supabaseAdmin
      .from('bpoc_users')
      .select('role, agency_client_id')
      .eq('id', userId)
      .single()

    if (!bpocUser || bpocUser.role !== 'recruiter') {
      return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
    }

    console.log('✅ User verified as recruiter')

    const body = await request.json()
    console.log('🔍 Job creation request body:', body)

    // Get agency_client_id for this recruiter
    const agencyClientId = bpocUser.agency_client_id
    if (!agencyClientId) {
      return NextResponse.json({ 
        error: 'Recruiter must be associated with an agency client to post jobs' 
      }, { status: 400 })
    }

    // Map enum values from frontend format to database enum format
    const mapExperienceLevel = (level: string) => {
      switch (level) {
        case 'entry-level': return 'entry_level'
        case 'mid-level': return 'mid_level'
        case 'senior-level': return 'senior_level'
        default: return 'entry_level'
      }
    }

    const mapWorkArrangement = (arrangement: string) => {
      switch (arrangement) {
        case 'onsite': return 'onsite'
        case 'remote': return 'remote'
        case 'hybrid': return 'hybrid'
        default: return 'onsite'
      }
    }

    const mapPriority = (priority: string) => {
      switch (priority) {
        case 'low': return 'low'
        case 'medium': return 'medium'
        case 'high': return 'high'
        case 'urgent': return 'urgent'
        default: return 'medium'
      }
    }

    const mapShift = (shift: string) => {
      switch (shift) {
        case 'day': return 'day'
        case 'night': return 'night'
        case 'both': return 'both'
        default: return 'day'
      }
    }

    // Prepare job data for insertion
    const jobData = {
      agency_client_id: agencyClientId,
      posted_by: userId,
      title: body.job_title,
      description: body.job_description || '',
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : [],
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      industry: body.industry || null,
      department: body.department || null,
      work_type: body.work_type || 'full_time',
      work_arrangement: mapWorkArrangement(body.work_arrangement),
      experience_level: mapExperienceLevel(body.experience_level),
      salary_min: body.salary_min || null,
      salary_max: body.salary_max || null,
      currency: body.currency || 'PHP',
      salary_type: body.salary_type || 'monthly',
      shift: mapShift(body.shift),
      priority: mapPriority(body.priority),
      application_deadline: body.application_deadline || null,
      status: body.status || 'active',
    }

    // Create job in Supabase
    const { data: newJob, error: createError } = await supabaseAdmin
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating job:', createError)
      return NextResponse.json({ 
        error: 'Failed to create job',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ Job created successfully:', newJob.id)

    return NextResponse.json({ 
      success: true,
      job: {
        id: newJob.id,
        title: newJob.title,
        status: newJob.status,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ 
      error: 'Failed to create job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
