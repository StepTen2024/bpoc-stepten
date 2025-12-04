import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Validate required fields
    if (!userData.id || !userData.email || !userData.first_name || !userData.last_name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, email, first_name, last_name' },
        { status: 400 }
      )
    }

    // Insert or update user in bpoc_users table (recruiters are stored here)
    const { data, error } = await supabaseAdmin
      .from('bpoc_users')
      .upsert({
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        full_name: userData.full_name || `${userData.first_name} ${userData.last_name}`,
        phone: userData.phone || null,
        avatar_url: userData.avatar_url || null,
        role: 'recruiter', // Ensure role is set to recruiter
        is_active: true,
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error syncing recruiter to database:', error)
      return NextResponse.json(
        { error: 'Failed to sync recruiter data', details: error.message },
        { status: 500 }
      )
    }

    // Also update bpoc_profiles if profile data is provided
    if (userData.bio || userData.position || userData.location) {
      await supabaseAdmin
        .from('bpoc_profiles')
        .upsert({
          bpoc_user_id: userData.id,
          bio: userData.bio || null,
          position: userData.position || null,
          location: userData.location || null,
        }, {
          onConflict: 'bpoc_user_id'
        })
    }

    return NextResponse.json({
      message: 'Recruiter synced successfully',
      user: data
    })

  } catch (error) {
    console.error('Recruiter sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
