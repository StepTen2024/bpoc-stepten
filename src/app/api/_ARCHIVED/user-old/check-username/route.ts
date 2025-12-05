import { NextRequest, NextResponse } from 'next/server'
import { getCandidateByEmail } from '@/lib/db/candidates'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET - Check if username exists in Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if username exists in Supabase candidates table
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .or(`username.eq.${username.toLowerCase()},slug.eq.${username.toLowerCase()}`)
      .limit(1)

    const exists = !error && data && data.length > 0
    const userId = exists ? data[0].id : null

    return NextResponse.json({ 
      exists,
      userId,
      username: username.toLowerCase()
    })

  } catch (error) {
    console.error('❌ Error checking username:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}

// POST - Check if username is available in Supabase
export async function POST(request: NextRequest) {
  try {
    const { username, userId } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens' 
      }, { status: 400 })
    }

    // Check if username exists in Supabase (excluding current user if updating)
    let query = supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('username', username.toLowerCase())

    if (userId) {
      query = query.neq('id', userId)
    }

    const { data, error } = await query.limit(1)

    const isAvailable = error || !data || data.length === 0

    return NextResponse.json({ 
      available: isAvailable,
      username: username.toLowerCase()
    })

  } catch (error) {
    console.error('❌ Error checking username:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 })
  }
}
