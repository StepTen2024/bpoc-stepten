/**
 * Profiles Database Layer
 * ALWAYS uses Supabase - Migration complete
 */
import * as supabase from './queries.supabase'

export type { CandidateProfile } from './queries.prisma'

// ALWAYS use Supabase - no more Railway
export const getProfileByCandidate = (candidateId: string) => supabase.getProfileByCandidate(candidateId)
export const updateProfile = (candidateId: string, data: Parameters<typeof supabase.updateProfile>[1]) => supabase.updateProfile(candidateId, data)
export const createProfile = (candidateId: string, data: Parameters<typeof supabase.createProfile>[1]) => supabase.createProfile(candidateId, data)

