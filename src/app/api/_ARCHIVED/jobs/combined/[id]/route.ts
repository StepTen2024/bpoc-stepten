import { NextRequest, NextResponse } from 'next/server'
import { getJobById } from '@/lib/db/jobs'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let jobId = id

    // Handle prefixed IDs (legacy support)
    if (jobId.startsWith('job_request_')) {
      jobId = jobId.replace('job_request_', '')
    } else if (jobId.startsWith('processed_')) {
      jobId = jobId.replace('processed_', '')
    }

    // Get job from Supabase
    const job = await getJobById(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get application count
    const { count } = await supabaseAdmin
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', job.id)

    const realApplicants = count || job.applicants_count || 0

    // Get company name
    const { data: agencyClient } = await supabaseAdmin
      .from('agency_clients')
      .select(`
        company:companies!inner(
          name
        )
      `)
      .eq('id', job.agency_client_id)
      .single()

    const requirements = Array.isArray(job.requirements) ? job.requirements : []
    const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : []
    const benefits = Array.isArray(job.benefits) ? job.benefits : []

    return NextResponse.json({
      job: {
        id: job.id,
        originalId: job.id,
        source: job.source || 'manual',
        company: agencyClient?.company?.name || 'Unknown Company',
        companyLogo: '🏢',
        title: job.title,
        description: job.description || 'No description available',
        location: '', // Location is in profile, not job
        work_arrangement: job.work_arrangement,
        shift: job.shift,
        industry: job.industry,
        department: job.department,
        experience_level: job.experience_level,
        work_type: job.work_type,
        application_deadline: job.application_deadline,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        currency: job.currency,
        salary_type: job.salary_type,
        priority: job.priority,
        status: job.status,
        applicants: realApplicants,
        views: job.views || 0,
        created_at: job.created_at,
        updated_at: job.updated_at,
        requirements,
        responsibilities,
        benefits,
        skills: [] // Skills are in job_skills table, can be added if needed
      }
    })
  } catch (e) {
    console.error('Error fetching job details:', e)
    return NextResponse.json({ 
      error: 'Failed to fetch job details',
      details: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 })
  }
}