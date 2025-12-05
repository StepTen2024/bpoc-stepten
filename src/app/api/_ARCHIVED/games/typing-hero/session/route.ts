import { NextRequest, NextResponse } from 'next/server'
import { saveTypingAssessment } from '@/lib/db/assessments'

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized - User not authenticated' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      score,
      wpm,
      longest_streak,
      correct_words,
      wrong_words,
      elapsed_time,
      overall_accuracy,
      ai_analysis,
      words_correct,
      words_incorrect,
      generated_story,
      difficulty_level = 'rockstar',
      vocabulary_strengths,
      vocabulary_weaknesses,
    } = body || {}

    // Validate required fields
    if (typeof score !== 'number' || typeof wpm !== 'number' || typeof longest_streak !== 'number' ||
        typeof correct_words !== 'number' || typeof wrong_words !== 'number' || 
        typeof elapsed_time !== 'number' || typeof overall_accuracy !== 'number') {
      throw new Error('Missing required numeric fields')
    }

    // Validate word arrays
    const validatedWordsCorrect = Array.isArray(words_correct) ? words_correct : []
    const validatedWordsIncorrect = Array.isArray(words_incorrect) ? words_incorrect : []

    // Save to Supabase
    const result = await saveTypingAssessment(userId, {
      difficulty_level,
      elapsed_time: Math.round(elapsed_time),
      score: Math.round(score),
      wpm: Math.round(wpm),
      overall_accuracy: Math.round(overall_accuracy * 100) / 100,
      longest_streak: Math.round(longest_streak),
      correct_words: Math.round(correct_words),
      wrong_words: Math.round(wrong_words),
      words_correct: validatedWordsCorrect,
      words_incorrect: validatedWordsIncorrect,
      ai_analysis: ai_analysis || {},
      vocabulary_strengths: vocabulary_strengths || [],
      vocabulary_weaknesses: vocabulary_weaknesses || [],
      generated_story: generated_story || null,
    })

    const sessionId = result.id

    console.log(`✅ Typing Hero session saved successfully for user ${userId}:`, {
      sessionId,
      score: Math.round(score),
      wpm: Math.round(wpm),
      accuracy: Math.round(overall_accuracy * 100) / 100,
    })
    
    return NextResponse.json({ 
      success: true, 
      sessionId,
      message: 'Session saved successfully',
      userId: userId,
    })
  } catch (e) {
    console.error('Failed to save typing hero session', e)
    return NextResponse.json({ 
      error: 'Failed to save session',
      details: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 })
  }
}


