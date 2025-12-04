/**
 * Supabase Queries for Candidate Profiles
 * Direct queries to new Supabase candidate_profiles table
 */
import { createClient } from '@/lib/supabase/server'
import type { CandidateProfile } from './queries.prisma'

export async function getProfileByCandidate(candidateId: string): Promise<CandidateProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('candidate_id', candidateId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    candidate_id: data.candidate_id,
    bio: data.bio,
    position: data.position,
    birthday: data.birthday,
    gender: data.gender,
    gender_custom: data.gender_custom,
    location: data.location,
    location_place_id: data.location_place_id,
    location_lat: data.location_lat,
    location_lng: data.location_lng,
    location_city: data.location_city,
    location_province: data.location_province,
    location_country: data.location_country,
    location_barangay: data.location_barangay,
    location_region: data.location_region,
    work_status: data.work_status,
    current_employer: data.current_employer,
    current_position: data.current_position,
    current_salary: data.current_salary ? Number(data.current_salary) : null,
    expected_salary_min: data.expected_salary_min ? Number(data.expected_salary_min) : null,
    expected_salary_max: data.expected_salary_max ? Number(data.expected_salary_max) : null,
    notice_period_days: data.notice_period_days,
    preferred_shift: data.preferred_shift,
    preferred_work_setup: data.preferred_work_setup,
    privacy_settings: data.privacy_settings as Record<string, any>,
    gamification: data.gamification as Record<string, any>,
    profile_completed: data.profile_completed,
    profile_completion_percentage: data.profile_completion_percentage,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

export async function updateProfile(
  candidateId: string,
  data: Partial<CandidateProfile>
): Promise<CandidateProfile | null> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('candidate_profiles')
    .update(data)
    .eq('candidate_id', candidateId)
    .select()
    .single()

  if (error || !profile) return null

  return {
    id: profile.id,
    candidate_id: profile.candidate_id,
    bio: profile.bio,
    position: profile.position,
    birthday: profile.birthday,
    gender: profile.gender,
    gender_custom: profile.gender_custom,
    location: profile.location,
    location_place_id: profile.location_place_id,
    location_lat: profile.location_lat,
    location_lng: profile.location_lng,
    location_city: profile.location_city,
    location_province: profile.location_province,
    location_country: profile.location_country,
    location_barangay: profile.location_barangay,
    location_region: profile.location_region,
    work_status: profile.work_status,
    current_employer: profile.current_employer,
    current_position: profile.current_position,
    current_salary: profile.current_salary ? Number(profile.current_salary) : null,
    expected_salary_min: profile.expected_salary_min ? Number(profile.expected_salary_min) : null,
    expected_salary_max: profile.expected_salary_max ? Number(profile.expected_salary_max) : null,
    notice_period_days: profile.notice_period_days,
    preferred_shift: profile.preferred_shift,
    preferred_work_setup: profile.preferred_work_setup,
    privacy_settings: profile.privacy_settings as Record<string, any>,
    gamification: profile.gamification as Record<string, any>,
    profile_completed: profile.profile_completed,
    profile_completion_percentage: profile.profile_completion_percentage,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }
}

export async function createProfile(
  candidateId: string,
  data: Partial<CandidateProfile>
): Promise<CandidateProfile> {
  console.log('📝 [createProfile] Starting profile creation:', {
    candidate_id: candidateId,
    has_bio: !!data.bio,
    has_position: !!data.position,
    has_location: !!data.location,
    has_birthday: !!data.birthday,
    has_gender: !!data.gender,
    profile_completed: data.profile_completed ?? false,
  })

  try {
    const supabase = await createClient()

    const insertData = {
      candidate_id: candidateId,
      ...data,
    }

    console.log('📤 [createProfile] Inserting into Supabase candidate_profiles table:', {
      table: 'candidate_profiles',
      candidate_id: candidateId,
      data_keys: Object.keys(insertData),
    })

    const { data: profile, error } = await supabase
      .from('candidate_profiles')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ [createProfile] Supabase insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        table: 'candidate_profiles',
        candidate_id: candidateId,
      })
      throw new Error(`Failed to create profile: ${error.message} (Code: ${error.code})`)
    }

    if (!profile) {
      console.error('❌ [createProfile] No profile returned from insert')
      throw new Error('Profile creation returned no data')
    }

    console.log('✅ [createProfile] Profile created successfully:', {
      id: profile.id,
      candidate_id: profile.candidate_id,
      profile_completed: profile.profile_completed,
      created_at: profile.created_at,
    })

    return {
      id: profile.id,
      candidate_id: profile.candidate_id,
      bio: profile.bio,
      position: profile.position,
      birthday: profile.birthday,
      gender: profile.gender,
      gender_custom: profile.gender_custom,
      location: profile.location,
      location_place_id: profile.location_place_id,
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
      location_city: profile.location_city,
      location_province: profile.location_province,
      location_country: profile.location_country,
      location_barangay: profile.location_barangay,
      location_region: profile.location_region,
      work_status: profile.work_status,
      current_employer: profile.current_employer,
      current_position: profile.current_position,
      current_salary: profile.current_salary ? Number(profile.current_salary) : null,
      expected_salary_min: profile.expected_salary_min ? Number(profile.expected_salary_min) : null,
      expected_salary_max: profile.expected_salary_max ? Number(profile.expected_salary_max) : null,
      notice_period_days: profile.notice_period_days,
      preferred_shift: profile.preferred_shift,
      preferred_work_setup: profile.preferred_work_setup,
      privacy_settings: profile.privacy_settings as Record<string, any>,
      gamification: profile.gamification as Record<string, any>,
      profile_completed: profile.profile_completed,
      profile_completion_percentage: profile.profile_completion_percentage,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }
  } catch (error) {
    console.error('❌ [createProfile] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      candidate_id: candidateId,
    })
    throw error
  }
}

