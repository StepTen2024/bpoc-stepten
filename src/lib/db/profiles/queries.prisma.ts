/**
 * Prisma Queries for Candidate Profiles
 * Maps multiple old tables (users + user_work_status + privacy_settings + leaderboard) 
 * into new unified candidate_profiles shape
 */
import { prismaRailway } from '@/lib/prisma-clients'

export interface CandidateProfile {
  id: string
  candidate_id: string
  bio: string | null
  position: string | null
  birthday: string | null
  gender: string | null
  gender_custom: string | null
  location: string | null
  location_place_id: string | null
  location_lat: number | null
  location_lng: number | null
  location_city: string | null
  location_province: string | null
  location_country: string | null
  location_barangay: string | null
  location_region: string | null
  work_status: string | null
  current_employer: string | null
  current_position: string | null
  current_salary: number | null
  expected_salary_min: number | null
  expected_salary_max: number | null
  notice_period_days: number | null
  preferred_shift: string | null
  preferred_work_setup: string | null
  current_mood: string | null
  privacy_settings: Record<string, any>
  gamification: Record<string, any>
  profile_completed: boolean
  profile_completion_percentage: number
  created_at: string
  updated_at: string
}

function mapWorkSetup(old: string | null | undefined): string | null {
  if (!old) return null
  const map: Record<string, string> = {
    'Work From Office': 'office',
    'Work From Home': 'remote',
    'Hybrid': 'hybrid',
    'Any': 'any',
  }
  return map[old] || null
}

function mapWorkStatus(status: string | null | undefined): string | null {
  if (!status) return null
  const map: Record<string, string> = {
    'employed': 'employed',
    'unemployed-looking-for-work': 'unemployed',
    'freelancer': 'freelancer',
    'part-time': 'part_time',
    'student': 'student',
  }
  return map[status] || 'unemployed'
}

export async function getProfileByCandidate(candidateId: string): Promise<CandidateProfile | null> {
  const user = await prismaRailway.user.findUnique({
    where: { id: candidateId },
    include: {
      workStatus: true,
      privacySettings: true,
      leaderboardScore: true,
    },
  })

  if (!user) return null

  // Transform to new unified shape
  return {
    id: user.workStatus?.id || candidateId,
    candidate_id: candidateId,
    bio: user.bio || null,
    position: user.position || null,
    birthday: user.birthday?.toISOString().split('T')[0] || null,
    gender: user.gender || null,
    gender_custom: user.gender_custom || null,
    location: user.location || null,
    location_place_id: user.location_place_id || null,
    location_lat: user.location_lat || null,
    location_lng: user.location_lng || null,
    location_city: user.location_city || null,
    location_province: user.location_province || null,
    location_country: user.location_country || null,
    location_barangay: user.location_barangay || null,
    location_region: user.location_region || null,
    work_status: mapWorkStatus(user.workStatus?.work_status_new || user.workStatus?.work_status),
    current_employer: user.workStatus?.current_employer || null,
    current_position: user.workStatus?.current_position || null,
    current_salary: user.workStatus?.current_salary ? Number(user.workStatus.current_salary) : null,
    expected_salary_min: user.workStatus?.minimum_salary_range ? Number(user.workStatus.minimum_salary_range) : null,
    expected_salary_max: user.workStatus?.maximum_salary_range ? Number(user.workStatus.maximum_salary_range) : null,
    notice_period_days: user.workStatus?.notice_period_days || null,
    preferred_shift: user.workStatus?.preferred_shift || null,
    preferred_work_setup: mapWorkSetup(user.workStatus?.work_setup),
    privacy_settings: {
      username: user.privacySettings?.username || 'public',
      first_name: user.privacySettings?.first_name || 'public',
      last_name: user.privacySettings?.last_name || 'only-me',
      location: user.privacySettings?.location || 'public',
      job_title: user.privacySettings?.job_title || 'public',
      birthday: user.privacySettings?.birthday || 'only-me',
      age: user.privacySettings?.age || 'only-me',
      gender: user.privacySettings?.gender || 'only-me',
      resume_score: user.privacySettings?.resume_score || 'public',
      key_strengths: user.privacySettings?.key_strengths || 'only-me',
    },
    gamification: {
      total_xp: user.leaderboardScore?.overall_score || 0,
      tier: user.leaderboardScore?.tier || 'Bronze',
      badges: [],
      rank_position: user.leaderboardScore?.rank_position || 0,
    },
    profile_completed: user.completed_data || false,
    profile_completion_percentage: user.completed_data ? 100 : 0,
    created_at: user.created_at?.toISOString() || new Date().toISOString(),
    updated_at: user.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export async function updateProfile(candidateId: string, data: Partial<CandidateProfile>): Promise<CandidateProfile | null> {
  // Update multiple old tables
  await prismaRailway.$transaction([
    prismaRailway.user.update({
      where: { id: candidateId },
      data: {
        bio: data.bio,
        position: data.position,
        birthday: data.birthday ? new Date(data.birthday) : undefined,
        gender: data.gender as any,
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
        completed_data: data.profile_completed,
      },
    }),
    prismaRailway.userWorkStatus.upsert({
      where: { user_id: candidateId },
      create: {
        user_id: candidateId,
        work_status: data.work_status as any,
        current_employer: data.current_employer,
        current_position: data.current_position,
        current_salary: data.current_salary ? data.current_salary : undefined,
        minimum_salary_range: data.expected_salary_min ? data.expected_salary_min : undefined,
        maximum_salary_range: data.expected_salary_max ? data.expected_salary_max : undefined,
        notice_period_days: data.notice_period_days,
        preferred_shift: data.preferred_shift as any,
        work_setup: data.preferred_work_setup === 'office' ? 'Work From Office' : 
                    data.preferred_work_setup === 'remote' ? 'Work From Home' :
                    data.preferred_work_setup === 'hybrid' ? 'Hybrid' : undefined as any,
      },
      update: {
        work_status: data.work_status as any,
        current_employer: data.current_employer,
        current_position: data.current_position,
        current_salary: data.current_salary ? data.current_salary : undefined,
        minimum_salary_range: data.expected_salary_min ? data.expected_salary_min : undefined,
        maximum_salary_range: data.expected_salary_max ? data.expected_salary_max : undefined,
        notice_period_days: data.notice_period_days,
        preferred_shift: data.preferred_shift as any,
        work_setup: data.preferred_work_setup === 'office' ? 'Work From Office' : 
                    data.preferred_work_setup === 'remote' ? 'Work From Home' :
                    data.preferred_work_setup === 'hybrid' ? 'Hybrid' : undefined as any,
      },
    }),
  ])

  return getProfileByCandidate(candidateId)
}

export async function createProfile(candidateId: string, data: Partial<CandidateProfile>): Promise<CandidateProfile> {
  await updateProfile(candidateId, data)
  const profile = await getProfileByCandidate(candidateId)
  if (!profile) throw new Error('Failed to create profile')
  return profile
}

