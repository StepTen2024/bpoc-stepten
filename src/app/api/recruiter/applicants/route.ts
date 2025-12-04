import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getJobById } from '@/lib/db/jobs'
import { getApplicationsByCandidate } from '@/lib/db/applications'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API called: GET /api/recruiter/applicants')
    
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

    // Get jobId from query parameters
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    console.log('🔍 Fetching applicants for job:', jobId)
    console.log('🔍 Recruiter ID:', recruiterId)

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Verify that the job belongs to this recruiter
    const job = await getJobById(jobId)
    if (!job || job.posted_by !== recruiterId) {
      console.log('❌ Job not found or does not belong to recruiter')
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 })
    }

    console.log('✅ Job found:', job.title)

    // Fetch applicants for this job from Supabase
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        candidate_id,
        status,
        created_at,
        resume_id,
        candidate:candidates!inner(
          id,
          email,
          first_name,
          last_name,
          full_name,
          username,
          avatar_url,
          phone
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    // Get profile data for each candidate
    const applicantsWithProfiles = await Promise.all((applications || []).map(async (application: any) => {
      const { data: profile } = await supabaseAdmin
        .from('candidate_profiles')
        .select('bio, position, location')
        .eq('candidate_id', application.candidate_id)
        .single()

      return {
        id: application.id,
        userId: application.candidate_id,
        fullName: application.candidate?.full_name || `${application.candidate?.first_name} ${application.candidate?.last_name}`.trim() || 'Unknown User',
        firstName: application.candidate?.first_name || 'Unknown',
        email: application.candidate?.email || 'no-email@example.com',
        username: application.candidate?.username || 'no-username',
        avatar: application.candidate?.avatar_url || null,
        phone: application.candidate?.phone || null,
        location: profile?.location || null,
        bio: profile?.bio || null,
        position: profile?.position || null,
        company: null, // Company is not in candidate_profiles, would need separate lookup
        jobTitle: job.title,
        jobCompany: job.agency_client?.company?.name || 'Unknown Company',
        status: application.status || 'submitted',
        appliedAt: application.created_at,
        resumeId: application.resume_id,
        resumeSlug: null, // Would need to fetch from candidate_resumes
        coverLetter: null, // Not in job_applications table
        notes: null, // Not in job_applications table
        userName: application.candidate?.full_name || application.candidate?.email || 'Unknown User',
        userEmail: application.candidate?.email || 'no-email@example.com',
        userAvatar: application.candidate?.avatar_url || null
      }
    }))

    console.log('✅ Applicants found:', applicantsWithProfiles.length)

    return NextResponse.json({
      applicants: applicantsWithProfiles,
      total: applicantsWithProfiles.length,
      job: {
        id: job.id,
        title: job.title
      }
    })

  } catch (error) {
    console.error('❌ Error fetching applicants:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      error: 'Failed to fetch applicants',
      details: errorMessage
    }, { status: 500 })
  }
}
