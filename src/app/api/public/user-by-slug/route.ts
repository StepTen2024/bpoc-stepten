import { NextRequest, NextResponse } from 'next/server'
import { getCandidateBySlug } from '@/lib/db/candidates'
import { getProfileByCandidate } from '@/lib/db/profiles'
import { getResumeByCandidateId } from '@/lib/db/resumes'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasDiscData, hasTypingData } from '@/lib/db/assessments'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const viewerUserId = searchParams.get('viewerUserId') // Optional - if provided, check if viewing own profile
    
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    // Get candidate from Supabase
    const candidate = await getCandidateBySlug(slug)
    if (!candidate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwner = viewerUserId && viewerUserId === candidate.id

    // Get profile from Supabase
    const profile = await getProfileByCandidate(candidate.id)

    // Get privacy settings from Supabase
    const { data: privacyData } = await supabaseAdmin
      .from('privacy_settings')
      .select('*')
      .eq('candidate_id', candidate.id)
      .single()

    const privacySettings = privacyData || {
      username: 'public',
      first_name: 'public',
      last_name: 'only-me',
      location: 'public',
      job_title: 'public',
      birthday: 'only-me',
      age: 'only-me',
      gender: 'only-me',
      member_since: 'public',
      resume_score: 'public',
      games_completed: 'public',
      key_strengths: 'only-me'
    }

    // Build user object from candidate and profile
    const userData: any = {
      id: candidate.id,
      email: candidate.email,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      full_name: candidate.full_name,
      location: profile?.location || null,
      avatar_url: candidate.avatar_url,
      phone: candidate.phone,
      bio: profile?.bio || null,
      position: profile?.position || null,
      gender: profile?.gender || null,
      gender_custom: profile?.gender_custom || null,
      birthday: profile?.birthday || null,
      created_at: candidate.created_at,
      updated_at: candidate.updated_at,
      slug: candidate.slug,
      username: candidate.username,
      completed_data: profile?.profile_completed || false,
      // Work status from profile
      current_employer: profile?.current_employer || null,
      current_position: profile?.position || null,
      current_salary: profile?.current_salary || null,
      notice_period_days: profile?.notice_period_days || null,
      current_mood: profile?.current_mood || null,
      work_status: profile?.work_status || null,
      preferred_shift: profile?.preferred_shift || null,
      expected_salary: profile?.expected_salary || null,
      work_setup: profile?.work_setup || null,
      work_status_completed_data: profile?.profile_completed || false,
      // Resume analysis (would need separate table - placeholder for now)
      resume_score: null,
      ats_compatibility_score: null,
      content_quality_score: null,
      professional_presentation_score: null,
      skills_alignment_score: null,
      key_strengths: null,
      strengths_analysis: null,
    }

    // Filter data based on privacy settings
    const filteredUser = { ...userData }

    // Apply privacy filters (only if not owner)
    if (!isOwner) {
      if (privacySettings.first_name === 'only-me') {
        delete filteredUser.first_name
      }
      if (privacySettings.last_name === 'only-me') {
        delete filteredUser.last_name
        delete filteredUser.full_name
      }
      if (privacySettings.location === 'only-me') {
        delete filteredUser.location
      }
      if (privacySettings.birthday === 'only-me') {
        delete filteredUser.birthday
      }
      if (privacySettings.gender === 'only-me') {
        delete filteredUser.gender
        delete filteredUser.gender_custom
      }
      if (privacySettings.member_since === 'only-me') {
        delete filteredUser.created_at
      }
      if (privacySettings.job_title === 'only-me') {
        delete filteredUser.position
      }
      if (privacySettings.resume_score === 'only-me') {
        delete filteredUser.resume_score
        delete filteredUser.ats_compatibility_score
        delete filteredUser.content_quality_score
        delete filteredUser.professional_presentation_score
        delete filteredUser.skills_alignment_score
      }
      if (privacySettings.key_strengths === 'only-me') {
        delete filteredUser.key_strengths
        delete filteredUser.strengths_analysis
      }
      // Always hide private fields for non-owners
      delete filteredUser.email
      delete filteredUser.phone
      delete filteredUser.current_salary
    }

    // Get game stats - check if games are completed
    const totalGames = 2
    let gameStats = {
      disc_personality_stats: null as any,
      typing_hero_stats: null as any
    }

    let gamesCompleted = 0

    try {
      // Only fetch game stats if user is owner or games are public
      if (isOwner || privacySettings.games_completed === 'public') {
        // Check DISC data
        const hasDisc = await hasDiscData(candidate.id)
        if (hasDisc) {
          // Get latest DISC assessment
          const { data: discData } = await supabaseAdmin
            .from('candidate_disc_assessments')
            .select('*')
            .eq('candidate_id', candidate.id)
            .eq('session_status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (discData) {
            gameStats.disc_personality_stats = {
              d: discData.d_score || 0,
              i: discData.i_score || 0,
              s: discData.s_score || 0,
              c: discData.c_score || 0,
              primary_type: discData.primary_type,
              secondary_type: discData.secondary_type,
              confidence: discData.confidence_score,
              cultural_alignment: discData.cultural_alignment,
              last_taken_at: discData.finished_at,
              total_xp: discData.xp_earned || 0,
              latest_session_xp: discData.xp_earned || 0,
              badges_earned: discData.confidence_score >= 85 ? 1 : 0,
              latest_ai_assessment: discData.ai_assessment,
              latest_bpo_roles: discData.ai_bpo_roles,
            }
            gamesCompleted++
          }
        }

        // Check Typing Hero data
        const hasTyping = await hasTypingData(candidate.id)
        if (hasTyping) {
          const { data: typingData } = await supabaseAdmin
            .from('candidate_typing_assessments')
            .select('*')
            .eq('candidate_id', candidate.id)
            .eq('session_status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (typingData && typingData.wpm > 0) {
            gameStats.typing_hero_stats = {
              best_wpm: typingData.wpm,
              latest_wpm: typingData.wpm,
              best_accuracy: typingData.overall_accuracy,
              best_score: typingData.score,
            }
            gamesCompleted++
          }
        }
      }
    } catch (gameStatsError: any) {
      console.log('Game stats error:', gameStatsError)
    }

    // If privacy settings hide games, set to 0 for non-owners
    const completedGames = (!isOwner && privacySettings.games_completed === 'only-me') ? 0 : gamesCompleted

    return NextResponse.json({ 
      user: {
        ...filteredUser,
        completed_games: completedGames,
        total_games: totalGames,
        game_stats: gameStats,
        is_owner: isOwner
      }
    })

  } catch (e) {
    console.error('Error in user-by-slug:', e)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 })
  }
}


