/**
 * Assessments Database Layer
 * ALWAYS uses Supabase - Migration complete
 */
import * as supabase from './queries.supabase'

// ALWAYS use Supabase - no more Railway
export const getDiscAssessmentCount = (candidateId: string) => supabase.getDiscAssessmentCount(candidateId)
export const getTypingAssessmentCount = (candidateId: string) => supabase.getTypingAssessmentCount(candidateId)
export const getUltimateAssessmentCount = (candidateId: string) => supabase.getUltimateAssessmentCount(candidateId)
export const getCulturalAssessmentCount = (candidateId: string) => supabase.getCulturalAssessmentCount(candidateId)
export const getTotalAssessmentSessions = (candidateId: string) => supabase.getTotalAssessmentSessions(candidateId)
export const hasDiscData = (candidateId: string) => supabase.hasDiscData(candidateId)
export const hasTypingData = (candidateId: string) => supabase.hasTypingData(candidateId)
export const saveDiscAssessment = (candidateId: string, data: Parameters<typeof supabase.saveDiscAssessment>[1]) => supabase.saveDiscAssessment(candidateId, data)
export const saveTypingAssessment = (candidateId: string, data: Parameters<typeof supabase.saveTypingAssessment>[1]) => supabase.saveTypingAssessment(candidateId, data)

