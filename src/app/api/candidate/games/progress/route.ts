import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    console.log('📊 Fetching games progress for candidate:', userId)

    // Get DISC assessments count
    const { count: discCount, error: discError } = await supabaseAdmin
      .from('candidate_disc_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', userId)
      .eq('session_status', 'completed')

    if (discError) {
      console.error('❌ Error fetching DISC assessments:', discError)
    }

    // Get Typing Hero assessments count
    const { count: typingCount, error: typingError } = await supabaseAdmin
      .from('candidate_typing_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', userId)
      .eq('session_status', 'completed')

    if (typingError) {
      console.error('❌ Error fetching Typing Hero assessments:', typingError)
    }

    // Calculate games completed (1 if DISC completed, 1 if Typing Hero completed)
    const gamesCompleted = (discCount && discCount > 0 ? 1 : 0) + (typingCount && typingCount > 0 ? 1 : 0)
    
    // Total sessions is the sum of both
    const totalSessions = (discCount || 0) + (typingCount || 0)

    // Get XP from profile gamification
    let achievementPoints = 0
    try {
      const { getProfileByCandidate } = await import('@/lib/db/profiles')
      const profile = await getProfileByCandidate(userId)
      achievementPoints = profile?.gamification?.total_xp || 0
    } catch (profileError) {
      console.error('❌ Error fetching profile XP:', profileError)
    }

    const progress = {
      completed: gamesCompleted,
      totalSessions,
      achievementPoints,
      discSessions: discCount || 0,
      typingSessions: typingCount || 0
    }

    console.log('✅ Games progress fetched:', progress)

    return NextResponse.json(progress)

  } catch (error) {
    console.error('❌ Error fetching games progress:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

