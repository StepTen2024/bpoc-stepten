import { NextRequest, NextResponse } from 'next/server';
import { updateCandidate } from '@/lib/db/candidates';
import { updateProfile } from '@/lib/db/profiles';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, first_name, last_name, full_name, username, location, position, gender, gender_custom, birthday, slug } = body;

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

    // Update candidate in Supabase
    const updatedCandidate = await updateCandidate(userId, {
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      username: username || undefined,
      avatar_url: undefined, // Keep existing
    });

    if (!updatedCandidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update profile in Supabase
    const updatedProfile = await updateProfile(userId, {
      location: location || undefined,
      position: position || undefined,
      gender: gender as any || undefined,
      birthday: birthday || undefined,
    });

    // Update Supabase auth metadata
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
        full_name: full_name,
        location: location,
        position: position,
        gender: gender,
        gender_custom: gender_custom,
        birthday: birthday
      }
    }).catch(err => console.error('Supabase metadata update error:', err))

    return NextResponse.json({ 
      success: true, 
      user: {
        ...updatedCandidate,
        ...updatedProfile,
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
