import { NextRequest, NextResponse } from 'next/server'
import { getActiveJobs } from '@/lib/db/jobs'
import { supabaseAdmin } from '@/lib/supabase/admin'

function capitalize(s: string): string { return !s ? s : s.charAt(0).toUpperCase() + s.slice(1) }

function formatSalary(currency: string, min: number | null, max: number | null, type: string): string {
  const symbol = String(currency || 'PHP').toUpperCase() === 'PHP' ? '₱' : String(currency || 'PHP').toUpperCase() + ' '
  const fmt = (n: number) => n.toLocaleString('en-PH')
  if (min != null && max != null) return `${symbol}${fmt(min)} - ${symbol}${fmt(max)} / ${type}`
  if (min != null) return `${symbol}${fmt(min)} / ${type}`
  if (max != null) return `${symbol}${fmt(max)} / ${type}`
  return ''
}

export async function GET(_request: NextRequest) {
  try {
    // Fetch active jobs from Supabase
    const jobs = await getActiveJobs()

    // Get company names for each job
    const agencyClientIds = [...new Set(jobs.map(j => j.agency_client_id))]
    
    const { data: agencyClients } = await supabaseAdmin
      .from('agency_clients')
      .select(`
        id,
        company:companies!inner(
          name
        )
      `)
      .in('id', agencyClientIds)

    const companyMap = new Map()
    agencyClients?.forEach(ac => {
      if (ac.company) {
        companyMap.set(ac.id, ac.company.name)
      }
    })

    // Process jobs
    const processedJobs = await Promise.all(jobs.map(async (job) => {
      // Get applicant count from Supabase
      const { count } = await supabaseAdmin
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job.id)

      const realApplicants = count || job.applicants_count || 0
      const employmentType: string[] = []
      if (job.work_type) employmentType.push(capitalize(String(job.work_type)))
      if (job.experience_level) employmentType.push(capitalize(String(job.experience_level)))
      
      const salary = formatSalary(
        String(job.currency || 'PHP'),
        job.salary_min,
        job.salary_max,
        String(job.salary_type || 'monthly')
      )
      
      const createdAt = job.created_at ? new Date(job.created_at) : new Date()
      const ms = Date.now() - createdAt.getTime()
      const postedDays = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
      const locationType = String(job.work_arrangement || 'onsite')
      const priorityFromDb = String(job.priority ?? '').toLowerCase()
      const priority: 'low' | 'medium' | 'high' | 'urgent' =
        ['low', 'medium', 'high', 'urgent'].includes(priorityFromDb)
          ? (priorityFromDb as any)
          : ((): 'low' | 'medium' | 'high' => {
              if (realApplicants >= 50) return 'high'
              if (realApplicants >= 10) return 'medium'
              return 'low'
            })()

      return {
        id: job.id,
        company: companyMap.get(job.agency_client_id) || 'Unknown Company',
        companyLogo: '🏢',
        title: job.title,
        location: '', // Location is in profile, not job
        locationType: locationType === 'onsite' ? 'on-site' : locationType,
        salary,
        employmentType,
        postedDays,
        applicants: realApplicants,
        status: job.status,
        priority,
        application_deadline: job.application_deadline,
        experience_level: job.experience_level,
        work_arrangement: job.work_arrangement,
        shift: job.shift,
        industry: job.industry,
        department: job.department,
      }
    }))

    return NextResponse.json({ jobs: processedJobs })
  } catch (e) {
    console.error('Error fetching active jobs:', e)
    return NextResponse.json({ error: 'Failed to fetch active jobs' }, { status: 500 })
  }
}


