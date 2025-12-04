import { NextRequest, NextResponse } from 'next/server'
import { saveDiscAssessment } from '@/lib/db/assessments'
import { getProfileByCandidate, updateProfile } from '@/lib/db/profiles'

// Save DISC personality session data to Supabase
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('💾 Saving DISC session to Supabase for user:', userId)

    const {
      sessionStartTime,
      coreResponses,
      coreScores,
      personalizedResponses,
      finalResults,
      aiAssessment,
      aiBpoRoles,
      userContext
    } = body || {}

    // Calculate session duration
    const startTime = sessionStartTime ? new Date(sessionStartTime) : new Date()
    const endTime = new Date()
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000))

    // Prepare session data for Supabase schema
    const safeScores = {
      D: Math.max(0, Math.min(100, Math.round(finalResults?.scores?.D || coreScores?.D || 0))),
      I: Math.max(0, Math.min(100, Math.round(finalResults?.scores?.I || coreScores?.I || 0))),
      S: Math.max(0, Math.min(100, Math.round(finalResults?.scores?.S || coreScores?.S || 0))),
      C: Math.max(0, Math.min(100, Math.round(finalResults?.scores?.C || coreScores?.C || 0)))
    }

    const pickPrimary = () => {
      if (finalResults?.primaryType && ['D','I','S','C'].includes(finalResults.primaryType)) return finalResults.primaryType
      const entries = Object.entries(safeScores).sort((a,b) => (b[1] as number) - (a[1] as number))
      return (entries[0]?.[0] as 'D'|'I'|'S'|'C') || 'D'
    }
    const pickSecondary = () => {
      if (finalResults?.secondaryType && ['D','I','S','C'].includes(finalResults.secondaryType)) return finalResults.secondaryType
      const entries = Object.entries(safeScores).sort((a,b) => (b[1] as number) - (a[1] as number))
      return (entries[1]?.[0] as 'D'|'I'|'S'|'C') || null
    }

    const primaryType = pickPrimary()
    const secondaryType = pickSecondary()
    const confidenceScore = Math.round(finalResults?.confidence || 85)
    const culturalAlignment = Math.round(finalResults?.culturalAlignment || 95)
    
    // Calculate XP
    const xpEarned = Math.round(
      (confidenceScore * 2) +
      (culturalAlignment * 1.5) +
      ((coreResponses?.length || 30) + (personalizedResponses?.length || 0)) * 5 +
      (durationSeconds < 600 ? 50 : 0)
    )

    // Prepare AI assessment
    const aiAssessmentObj = (aiAssessment && typeof aiAssessment === 'string' && aiAssessment.trim().length > 0)
      ? { text: aiAssessment, generated_at: new Date().toISOString() }
      : {
          text: `Your comprehensive assessment reveals a ${primaryType === 'D' ? 'dynamic leader' : primaryType === 'I' ? 'natural influencer' : primaryType === 'S' ? 'steady supporter' : 'analytical thinker'} with strong potential. Your response patterns show consistent decision-making that indicates excellent professional capabilities and cultural adaptability in the Philippine workplace.`,
          generated_at: new Date().toISOString(),
          isFallback: true
        }

    // Save to Supabase
    const result = await saveDiscAssessment(userId, {
      started_at: startTime.toISOString(),
      finished_at: endTime.toISOString(),
      duration_seconds: durationSeconds,
      total_questions: (coreResponses?.length || 30) + (personalizedResponses?.length || 0),
      d_score: safeScores.D,
      i_score: safeScores.I,
      s_score: safeScores.S,
      c_score: safeScores.C,
      primary_type: primaryType,
      secondary_type: secondaryType,
      confidence_score: confidenceScore,
      consistency_index: finalResults?.consistency || null,
      cultural_alignment: culturalAlignment,
      authenticity_score: finalResults?.authenticity ? Math.round(finalResults.authenticity) : null,
      ai_assessment: aiAssessmentObj,
      ai_bpo_roles: Array.isArray(aiBpoRoles) ? aiBpoRoles : [],
      core_responses: Array.isArray(coreResponses) ? coreResponses : [],
      personalized_responses: Array.isArray(personalizedResponses) ? personalizedResponses : [],
      response_patterns: {
        total_responses: (coreResponses?.length || 0) + (personalizedResponses?.length || 0),
        avg_response_time: coreResponses?.length > 0 ? 
          Math.round(coreResponses.reduce((sum: number, r: any) => sum + (r.responseTime || 0), 0) / coreResponses.length) : 0,
        consistency_score: confidenceScore
      },
      user_position: userContext?.position || null,
      user_location: userContext?.location || null,
      user_experience: userContext?.bio || null,
      xp_earned: xpEarned,
    })

    // Get updated profile for XP totals
    const profile = await getProfileByCandidate(userId)
    const totalXp = profile?.gamification?.total_xp || 0

    return NextResponse.json({ 
      success: true, 
      sessionId: result.id,
      message: 'DISC session saved successfully',
      totals: {
        total_xp: totalXp,
        latest_session_xp: xpEarned,
        badges_earned: confidenceScore >= 85 ? 1 : 0
      }
    })

  } catch (error) {
    console.error('❌ Failed to save DISC session:', error)
    return NextResponse.json({ 
      error: 'Failed to save session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}