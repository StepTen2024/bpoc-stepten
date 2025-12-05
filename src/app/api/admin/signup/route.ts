import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create auth user using admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const adminAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Create the auth user
    const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created:', userId);

    // 2. Create bpoc_users record using admin client
    const { error: bpocUserError } = await supabaseAdmin
      .from('bpoc_users')
      .insert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'admin',
        is_active: true,
      });

    if (bpocUserError) {
      console.error('BPOC user creation error:', bpocUserError);
      // Don't fail completely - auth user exists
    } else {
      console.log('✅ BPOC user created');
    }

    // 3. Create bpoc_profiles record using admin client
    const { error: profileError } = await supabaseAdmin
      .from('bpoc_profiles')
      .insert({
        bpoc_user_id: userId,
        bio: `${firstName} ${lastName} - BPOC Administrator`,
        department: 'Administration',
        permissions: ['all'],
      });

    if (profileError) {
      console.error('BPOC profile creation error:', profileError);
      // Don't fail completely
    } else {
      console.log('✅ BPOC profile created');
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      userId
    });

  } catch (error) {
    console.error('Admin signup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 500 }
    );
  }
}

