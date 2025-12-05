import { NextRequest, NextResponse } from 'next/server'
import { getTotalAssessmentSessions, hasDiscData, hasTypingData } from '@/lib/db/assessments'
import { getCandidateById } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not provided' }, { status: 400 })
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get assessment counts from Supabase
    const sessions = await getTotalAssessmentSessions(userId)
    const hasDisc = await hasDiscData(userId)
    const hasTyping = await hasTypingData(userId)

    // Get achievement points from profile gamification
    const profile = await getProfileByCandidate(userId)
    const achievementPoints = profile?.gamification?.total_xp || 0

    const totalSessions = sessions.disc + sessions.typing + sessions.ultimate + sessions.cultural
    const totalCompleted = (hasTyping ? 1 : 0) + (hasDisc ? 1 : 0)
    
    return NextResponse.json({ 
      hasData: true,
      gamesCount: totalCompleted,
      totalSessions,
      achievementPoints,
      breakdown: {
        typingHero: hasTyping ? 1 : 0,
        discPersonality: hasDisc ? 1 : 0
      }
    })
  } catch (error) {
    console.error('❌ Error fetching games count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games count', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
