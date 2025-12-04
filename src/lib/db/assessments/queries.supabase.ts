/**
 * Supabase Queries for Game Assessments
 * Direct queries to Supabase assessment tables
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function getDiscAssessmentCount(candidateId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('candidate_disc_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .eq('session_status', 'completed')

  if (error) return 0
  return count || 0
}

export async function getTypingAssessmentCount(candidateId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('candidate_typing_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .eq('session_status', 'completed')

  if (error) return 0
  return count || 0
}

export async function getUltimateAssessmentCount(candidateId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('candidate_ultimate_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .eq('session_status', 'completed')

  if (error) return 0
  return count || 0
}

export async function getCulturalAssessmentCount(candidateId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('candidate_cultural_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .eq('session_status', 'completed')

  if (error) return 0
  return count || 0
}

export async function getTotalAssessmentSessions(candidateId: string): Promise<{
  disc: number
  typing: number
  ultimate: number
  cultural: number
}> {
  const supabase = await createClient()

  const [discRes, typingRes, ultimateRes, culturalRes] = await Promise.all([
    supabase.from('candidate_disc_assessments').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('candidate_typing_assessments').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('candidate_ultimate_assessments').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('candidate_cultural_assessments').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId),
  ])

  return {
    disc: discRes.count || 0,
    typing: typingRes.count || 0,
    ultimate: ultimateRes.count || 0,
    cultural: culturalRes.count || 0,
  }
}

export async function hasDiscData(candidateId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidate_disc_assessments')
    .select('primary_type')
    .eq('candidate_id', candidateId)
    .limit(1)

  return !error && data && data.length > 0 && !!data[0].primary_type
}

export async function hasTypingData(candidateId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidate_typing_assessments')
    .select('wpm')
    .eq('candidate_id', candidateId)
    .limit(1)

  return !error && data && data.length > 0 && (data[0].wpm || 0) > 0
}

// Save DISC assessment
export async function saveDiscAssessment(candidateId: string, data: {
  started_at?: string
  finished_at?: string
  duration_seconds?: number
  total_questions?: number
  d_score: number
  i_score: number
  s_score: number
  c_score: number
  primary_type: string
  secondary_type?: string | null
  confidence_score: number
  consistency_index?: number | null
  cultural_alignment: number
  authenticity_score?: number | null
  ai_assessment: any
  ai_bpo_roles: any[]
  core_responses: any[]
  personalized_responses: any[]
  response_patterns: any
  user_position?: string | null
  user_location?: string | null
  user_experience?: string | null
  xp_earned?: number
}): Promise<{ id: string; xp_earned: number }> {
  const { data: assessment, error } = await supabaseAdmin
    .from('candidate_disc_assessments')
    .insert({
      candidate_id: candidateId,
      session_status: 'completed',
      started_at: data.started_at || new Date().toISOString(),
      finished_at: data.finished_at || new Date().toISOString(),
      duration_seconds: data.duration_seconds || 0,
      total_questions: data.total_questions || 30,
      d_score: data.d_score,
      i_score: data.i_score,
      s_score: data.s_score,
      c_score: data.c_score,
      primary_type: data.primary_type,
      secondary_type: data.secondary_type || null,
      confidence_score: data.confidence_score,
      consistency_index: data.consistency_index || null,
      cultural_alignment: data.cultural_alignment,
      authenticity_score: data.authenticity_score || null,
      ai_assessment: data.ai_assessment,
      ai_bpo_roles: data.ai_bpo_roles,
      core_responses: data.core_responses,
      personalized_responses: data.personalized_responses,
      response_patterns: data.response_patterns,
      user_position: data.user_position || null,
      user_location: data.user_location || null,
      user_experience: data.user_experience || null,
      xp_earned: data.xp_earned || 0,
    })
    .select('id, xp_earned')
    .single()

  if (error) throw new Error(error.message)

  // Update profile gamification XP
  const { getProfileByCandidate, updateProfile } = await import('@/lib/db/profiles')
  const profile = await getProfileByCandidate(candidateId)
  if (profile) {
    const currentXp = profile.gamification?.total_xp || 0
    const newXp = currentXp + (data.xp_earned || 0)
    await updateProfile(candidateId, {
      gamification: {
        ...profile.gamification,
        total_xp: newXp,
      },
    })
  }

  return {
    id: assessment.id,
    xp_earned: assessment.xp_earned || data.xp_earned || 0,
  }
}

// Save Typing Hero assessment
export async function saveTypingAssessment(candidateId: string, data: {
  difficulty_level?: string
  elapsed_time: number
  score: number
  wpm: number
  overall_accuracy: number
  longest_streak: number
  correct_words: number
  wrong_words: number
  words_correct: any[]
  words_incorrect: any[]
  ai_analysis?: any
  vocabulary_strengths?: any[]
  vocabulary_weaknesses?: any[]
  generated_story?: string | null
}): Promise<{ id: string }> {
  const { data: assessment, error } = await supabaseAdmin
    .from('candidate_typing_assessments')
    .insert({
      candidate_id: candidateId,
      session_status: 'completed',
      difficulty_level: data.difficulty_level || 'rockstar',
      elapsed_time: data.elapsed_time,
      score: data.score,
      wpm: data.wpm,
      overall_accuracy: data.overall_accuracy,
      longest_streak: data.longest_streak,
      correct_words: data.correct_words,
      wrong_words: data.wrong_words,
      words_correct: data.words_correct,
      words_incorrect: data.words_incorrect,
      ai_analysis: data.ai_analysis || {},
      vocabulary_strengths: data.vocabulary_strengths || [],
      vocabulary_weaknesses: data.vocabulary_weaknesses || [],
      generated_story: data.generated_story || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  return { id: assessment.id }
}
