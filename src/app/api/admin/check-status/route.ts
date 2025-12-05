import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameter
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ isAdmin: false })
    }

    // Check if user is admin in Supabase candidates table
    // Note: Admin users are typically in a separate table, but for now we'll check candidates
    // Use admin client to bypass RLS
    const candidate = await getCandidateById(userId, true)
    
    if (!candidate) {
      return NextResponse.json({ isAdmin: false })
    }

    // For now, return false as admin check should be done via a separate admin_users table
    // This is a placeholder to prevent 404 errors
    return NextResponse.json({ isAdmin: false })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ isAdmin: false })
  }
}

