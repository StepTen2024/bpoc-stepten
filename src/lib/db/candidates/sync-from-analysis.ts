/**
 * Sync candidate structured data from AI analysis to separate tables
 * 
 * This function extracts skills, work experiences, and educations from
 * candidate_ai_analysis JSON snapshots and populates the structured tables.
 * 
 * Use this when you need:
 * - Job matching (matching job_skills to candidate_skills)
 * - Search/filtering candidates
 * - Analytics on candidate data
 * 
 * If you DON'T need these features, you can skip this and just use the JSON.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

interface SkillData {
  name: string
  category?: string
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_experience?: number
  is_primary?: boolean
}

interface WorkExperienceData {
  company_name: string
  job_title: string
  location?: string
  start_date?: string | Date
  end_date?: string | Date
  is_current?: boolean
  description?: string
  responsibilities?: string[]
  achievements?: string[]
}

interface EducationData {
  institution: string
  degree?: string
  field_of_study?: string
  start_date?: string | Date
  end_date?: string | Date
  is_current?: boolean
  grade?: string
  description?: string
}

/**
 * Sync skills from AI analysis snapshot to candidate_skills table
 */
export async function syncSkillsFromAnalysis(
  candidateId: string,
  skillsSnapshot: any
): Promise<void> {
  if (!skillsSnapshot || !Array.isArray(skillsSnapshot)) {
    console.log('⚠️ No skills snapshot to sync')
    return
  }

  // Parse skills from snapshot (handle different formats)
  const skills: SkillData[] = skillsSnapshot.map((skill: any) => {
    if (typeof skill === 'string') {
      return { name: skill }
    }
    return {
      name: skill.name || skill.skill || skill.title,
      category: skill.category || skill.type,
      proficiency_level: skill.proficiency_level || skill.level,
      years_experience: skill.years_experience || skill.years,
      is_primary: skill.is_primary || false,
    }
  }).filter((s: SkillData) => s.name)

  if (skills.length === 0) {
    console.log('⚠️ No valid skills found in snapshot')
    return
  }

  // Delete existing skills for this candidate
  await supabaseAdmin
    .from('candidate_skills')
    .delete()
    .eq('candidate_id', candidateId)

  // Insert new skills (using upsert to handle duplicates)
  const skillsToInsert = skills.map(skill => ({
    candidate_id: candidateId,
    name: skill.name.trim(),
    category: skill.category || null,
    proficiency_level: skill.proficiency_level || null,
    years_experience: skill.years_experience || null,
    is_primary: skill.is_primary || false,
    verified: false,
  }))

  const { error } = await supabaseAdmin
    .from('candidate_skills')
    .upsert(skillsToInsert, {
      onConflict: 'candidate_id,name',
    })

  if (error) {
    console.error('❌ Error syncing skills:', error)
    throw error
  }

  console.log(`✅ Synced ${skills.length} skills to candidate_skills table`)
}

/**
 * Sync work experiences from AI analysis snapshot to candidate_work_experiences table
 */
export async function syncWorkExperiencesFromAnalysis(
  candidateId: string,
  experienceSnapshot: any
): Promise<void> {
  if (!experienceSnapshot || !Array.isArray(experienceSnapshot)) {
    console.log('⚠️ No experience snapshot to sync')
    return
  }

  // Parse experiences from snapshot
  const experiences: WorkExperienceData[] = experienceSnapshot.map((exp: any) => ({
    company_name: exp.company || exp.company_name || exp.employer || 'Unknown',
    job_title: exp.title || exp.job_title || exp.position || 'Unknown',
    location: exp.location || null,
    start_date: exp.start_date || exp.start || null,
    end_date: exp.end_date || exp.end || null,
    is_current: exp.is_current || exp.current || false,
    description: exp.description || null,
    responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
    achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
  }))

  if (experiences.length === 0) {
    console.log('⚠️ No valid experiences found in snapshot')
    return
  }

  // Delete existing experiences for this candidate
  await supabaseAdmin
    .from('candidate_work_experiences')
    .delete()
    .eq('candidate_id', candidateId)

  // Insert new experiences
  const { error } = await supabaseAdmin
    .from('candidate_work_experiences')
    .insert(
      experiences.map(exp => ({
        candidate_id: candidateId,
        company_name: exp.company_name,
        job_title: exp.job_title,
        location: exp.location || null,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        is_current: exp.is_current || false,
        description: exp.description || null,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || [],
      }))
    )

  if (error) {
    console.error('❌ Error syncing work experiences:', error)
    throw error
  }

  console.log(`✅ Synced ${experiences.length} work experiences to candidate_work_experiences table`)
}

/**
 * Sync educations from AI analysis snapshot to candidate_educations table
 */
export async function syncEducationsFromAnalysis(
  candidateId: string,
  educationSnapshot: any
): Promise<void> {
  if (!educationSnapshot || !Array.isArray(educationSnapshot)) {
    console.log('⚠️ No education snapshot to sync')
    return
  }

  // Parse educations from snapshot
  const educations: EducationData[] = educationSnapshot.map((edu: any) => ({
    institution: edu.institution || edu.school || edu.university || 'Unknown',
    degree: edu.degree || edu.qualification || null,
    field_of_study: edu.field_of_study || edu.major || edu.field || null,
    start_date: edu.start_date || edu.start || null,
    end_date: edu.end_date || edu.end || edu.graduation_date || null,
    is_current: edu.is_current || edu.current || false,
    grade: edu.grade || edu.gpa || null,
    description: edu.description || null,
  }))

  if (educations.length === 0) {
    console.log('⚠️ No valid educations found in snapshot')
    return
  }

  // Delete existing educations for this candidate
  await supabaseAdmin
    .from('candidate_educations')
    .delete()
    .eq('candidate_id', candidateId)

  // Insert new educations
  const { error } = await supabaseAdmin
    .from('candidate_educations')
    .insert(
      educations.map(edu => ({
        candidate_id: candidateId,
        institution: edu.institution,
        degree: edu.degree || null,
        field_of_study: edu.field_of_study || null,
        start_date: edu.start_date || null,
        end_date: edu.end_date || null,
        is_current: edu.is_current || false,
        grade: edu.grade || null,
        description: edu.description || null,
      }))
    )

  if (error) {
    console.error('❌ Error syncing educations:', error)
    throw error
  }

  console.log(`✅ Synced ${educations.length} educations to candidate_educations table`)
}

/**
 * Sync all structured data from AI analysis
 * Call this after saving AI analysis to populate the structured tables
 */
export async function syncAllFromAnalysis(
  candidateId: string,
  analysisData: {
    skills_snapshot?: any
    experience_snapshot?: any
    education_snapshot?: any
  }
): Promise<void> {
  console.log('🔄 Syncing structured data from AI analysis...')

  try {
    if (analysisData.skills_snapshot) {
      await syncSkillsFromAnalysis(candidateId, analysisData.skills_snapshot)
    }

    if (analysisData.experience_snapshot) {
      await syncWorkExperiencesFromAnalysis(candidateId, analysisData.experience_snapshot)
    }

    if (analysisData.education_snapshot) {
      await syncEducationsFromAnalysis(candidateId, analysisData.education_snapshot)
    }

    console.log('✅ All structured data synced successfully')
  } catch (error) {
    console.error('❌ Error syncing structured data:', error)
    // Don't throw - allow analysis to succeed even if sync fails
    // You can decide if you want to make this critical or not
  }
}

