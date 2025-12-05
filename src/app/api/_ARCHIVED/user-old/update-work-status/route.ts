import { NextRequest, NextResponse } from 'next/server';
import { updateProfile } from '@/lib/db/profiles';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 PUT /api/user/update-work-status - Starting request');
    const body = await request.json();
    console.log('📝 Request body:', body);
    
    const { 
      userId, 
      current_employer, 
      current_position, 
      current_salary, 
      notice_period_days, 
      current_mood, 
      work_status, 
      preferred_shift, 
      expected_salary, 
      expected_salary_min,
      expected_salary_max,
      work_setup 
    } = body;

    // Verify user authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the user is updating their own profile
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

    // Update profile in Supabase
    const updatedProfile = await updateProfile(userId, {
      current_employer: current_employer || undefined,
      current_position: current_position || undefined,
      current_salary: current_salary ? Number(current_salary) : undefined,
      notice_period_days: notice_period_days || undefined,
      expected_salary_min: expected_salary_min ? Number(expected_salary_min) : undefined,
      expected_salary_max: expected_salary_max ? Number(expected_salary_max) : undefined,
      work_status: work_status as any || undefined,
      preferred_shift: preferred_shift as any || undefined,
      preferred_work_setup: mapWorkSetup(work_setup) as any || undefined,
    })

    if (!updatedProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      workStatus: {
        userId: updatedProfile.candidate_id,
        currentEmployer: updatedProfile.current_employer,
        currentPosition: updatedProfile.current_position,
        currentSalary: updatedProfile.current_salary ? Number(updatedProfile.current_salary) : null,
        noticePeriod: updatedProfile.notice_period_days,
        expectedSalaryMin: updatedProfile.expected_salary_min ? Number(updatedProfile.expected_salary_min) : null,
        expectedSalaryMax: updatedProfile.expected_salary_max ? Number(updatedProfile.expected_salary_max) : null,
        workStatus: updatedProfile.work_status,
        preferredShift: updatedProfile.preferred_shift,
        workSetup: updatedProfile.preferred_work_setup,
      }
    });

  } catch (error) {
    console.error('❌ Error updating user work status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
