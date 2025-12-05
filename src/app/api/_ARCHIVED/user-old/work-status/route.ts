import { NextRequest, NextResponse } from 'next/server'
import { getProfileByCandidate } from '@/lib/db/profiles'

// GET - Fetch work status for a user from Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get profile from Supabase (contains work status)
    const profile = await getProfileByCandidate(userId)

    if (!profile) {
      return NextResponse.json({ found: false })
    }

    const workStatus = {
      userId: profile.candidate_id,
      currentEmployer: profile.current_employer,
      currentPosition: profile.current_position,
      currentSalary: profile.current_salary ? Number(profile.current_salary) : null,
      noticePeriod: profile.notice_period_days,
      expectedSalary: null, // Not in new schema
      minimumSalaryRange: profile.expected_salary_min ? Number(profile.expected_salary_min) : null,
      maximumSalaryRange: profile.expected_salary_max ? Number(profile.expected_salary_max) : null,
      currentMood: null, // Not in new schema
      workStatus: profile.work_status,
      preferredShift: profile.preferred_shift,
      workSetup: profile.preferred_work_setup,
      completedData: profile.profile_completed,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    }

    return NextResponse.json({ found: true, workStatus })
  } catch (error) {
    console.error('Error fetching work status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Upsert work status for a user in Supabase
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      currentEmployer,
      currentPosition,
      currentSalary,
      noticePeriod,
      expectedSalary,
      minimumSalaryRange,
      maximumSalaryRange,
      workStatus,
      preferredShift,
      workSetup,
      completedData,
      completed_data,
    } = body || {}

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Update profile in Supabase (work status is in candidate_profiles)
    const { updateProfile } = await import('@/lib/db/profiles')
    const { updateCandidate } = await import('@/lib/db/candidates')

    // Map work setup from old format to new format
    const mapWorkSetup = (old: string | null | undefined): string | undefined => {
      if (!old) return undefined
      const map: Record<string, string> = {
        'Work From Office': 'office',
        'Work From Home': 'remote',
        'Hybrid': 'hybrid',
        'Any': 'any',
      }
      return map[old] || 'any'
    }

    // Update profile with work status
    const updatedProfile = await updateProfile(userId, {
      current_employer: currentEmployer || undefined,
      current_position: currentPosition || undefined,
      current_salary: currentSalary ? Number(currentSalary) : undefined,
      notice_period_days: noticePeriod || undefined,
      expected_salary_min: minimumSalaryRange ? Number(minimumSalaryRange) : undefined,
      expected_salary_max: maximumSalaryRange ? Number(maximumSalaryRange) : undefined,
      work_status: workStatus as any || undefined,
      preferred_shift: preferredShift as any || undefined,
      preferred_work_setup: mapWorkSetup(workSetup) as any || undefined,
      profile_completed: typeof (completedData || completed_data) === 'boolean' ? (completedData || completed_data) : undefined,
    })

    // Update position in candidates table if provided
    if (currentPosition !== undefined) {
      await updateCandidate(userId, {
        // Position is in profile, not candidate table
      })
    }

    if (!updatedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      saved: true, 
      workStatus: {
        userId: updatedProfile.candidate_id,
        currentEmployer: updatedProfile.current_employer,
        currentPosition: updatedProfile.current_position,
        currentSalary: updatedProfile.current_salary ? Number(updatedProfile.current_salary) : null,
        noticePeriod: updatedProfile.notice_period_days,
        minimumSalaryRange: updatedProfile.expected_salary_min ? Number(updatedProfile.expected_salary_min) : null,
        maximumSalaryRange: updatedProfile.expected_salary_max ? Number(updatedProfile.expected_salary_max) : null,
        workStatus: updatedProfile.work_status,
        preferredShift: updatedProfile.preferred_shift,
        workSetup: updatedProfile.preferred_work_setup,
        completedData: updatedProfile.profile_completed,
      }
    })
  } catch (error) {
    console.error('Error saving work status:', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal server error', details }, { status: 500 })
  }
}


