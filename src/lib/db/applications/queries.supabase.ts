/**
 * Supabase Queries for Job Applications
 * Direct queries to Supabase job_applications table
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface JobApplication {
  id: string
  candidate_id: string
  job_id: string
  resume_id: string | null
  status: string
  cover_letter: string | null
  notes: string | null
  applied_at: string
  created_at: string
  updated_at: string
}

export async function getApplicationsByCandidate(candidateId: string): Promise<JobApplication[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map(app => ({
    id: app.id,
    candidate_id: app.candidate_id,
    job_id: app.job_id,
    resume_id: app.resume_id,
    status: app.status,
    cover_letter: app.cover_letter,
    notes: app.notes,
    applied_at: app.applied_at,
    created_at: app.created_at,
    updated_at: app.updated_at,
  }))
}

export async function getApplicationById(id: string): Promise<JobApplication | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    candidate_id: data.candidate_id,
    job_id: data.job_id,
    resume_id: data.resume_id,
    status: data.status,
    cover_letter: data.cover_letter,
    notes: data.notes,
    applied_at: data.applied_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function createApplication(data: {
  candidate_id: string
  job_id: string
  resume_id?: string | null
  cover_letter?: string | null
}): Promise<JobApplication> {
  // Check if application already exists
  const existing = await supabaseAdmin
    .from('job_applications')
    .select('id')
    .eq('candidate_id', data.candidate_id)
    .eq('job_id', data.job_id)
    .single()

  if (existing.data) {
    throw new Error('You have already applied to this job')
  }

  const { data: application, error } = await supabaseAdmin
    .from('job_applications')
    .insert({
      candidate_id: data.candidate_id,
      job_id: data.job_id,
      resume_id: data.resume_id || null,
      cover_letter: data.cover_letter || null,
      status: 'submitted',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: application.id,
    candidate_id: application.candidate_id,
    job_id: application.job_id,
    resume_id: application.resume_id,
    status: application.status,
    cover_letter: application.cover_letter,
    notes: application.notes,
    applied_at: application.applied_at,
    created_at: application.created_at,
    updated_at: application.updated_at,
  }
}

export async function updateApplicationStatus(
  id: string,
  candidateId: string,
  status: string
): Promise<JobApplication | null> {
  const supabase = await createClient()

  // Verify ownership
  const existing = await getApplicationById(id)
  if (!existing || existing.candidate_id !== candidateId) {
    throw new Error('Application not found or access denied')
  }

  // Validate status transition
  if (existing.status === 'withdrawn') {
    throw new Error('Application is already withdrawn')
  }
  if (existing.status === 'hired') {
    throw new Error('Cannot withdraw a hired application')
  }
  if (existing.status === 'rejected') {
    throw new Error('Cannot withdraw a rejected application')
  }

  const { data, error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    candidate_id: data.candidate_id,
    job_id: data.job_id,
    resume_id: data.resume_id,
    status: data.status,
    cover_letter: data.cover_letter,
    notes: data.notes,
    applied_at: data.applied_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}


