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

    console.log('📖 Loading story from database for user:', userId)

    // Query Supabase for the latest assessment with a generated_story
    const { data: assessments, error } = await supabaseAdmin
      .from('candidate_typing_assessments')
      .select('generated_story, created_at')
      .eq('candidate_id', userId)
      .not('generated_story', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    if (!assessments || assessments.length === 0 || !assessments[0].generated_story) {
      console.log('📖 No story found in database for user:', userId)
      return NextResponse.json(
        { story: null, hasStory: false },
        { status: 200 }
      )
    }

    // Parse the generated_story (it might be a string or already an object)
    let story
    try {
      story = typeof assessments[0].generated_story === 'string' 
        ? JSON.parse(assessments[0].generated_story)
        : assessments[0].generated_story
    } catch (parseError) {
      console.error('❌ Error parsing story:', parseError)
      return NextResponse.json(
        { story: null, hasStory: false },
        { status: 200 }
      )
    }
    
    console.log('✅ Story loaded from database:', {
      storyId: story.id,
      title: story.title,
      chapters: story.chapters?.length || 0,
      createdAt: story.createdAt || assessments[0].created_at
    })

    return NextResponse.json({
      story,
      hasStory: true
    })

  } catch (error) {
    console.error('❌ Error loading user story:', error)
    return NextResponse.json(
      { error: `Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    console.log('📖 Loading story from database for user (POST):', userId)

    // Query Supabase for the latest assessment with a generated_story
    const { data: assessments, error } = await supabaseAdmin
      .from('candidate_typing_assessments')
      .select('generated_story, created_at')
      .eq('candidate_id', userId)
      .not('generated_story', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    if (!assessments || assessments.length === 0 || !assessments[0].generated_story) {
      console.log('📖 No story found in database for user:', userId)
      return NextResponse.json(
        { story: null, hasStory: false },
        { status: 200 }
      )
    }

    // Parse the generated_story (it might be a string or already an object)
    let story
    try {
      story = typeof assessments[0].generated_story === 'string' 
        ? JSON.parse(assessments[0].generated_story)
        : assessments[0].generated_story
    } catch (parseError) {
      console.error('❌ Error parsing story:', parseError)
      return NextResponse.json(
        { story: null, hasStory: false },
        { status: 200 }
      )
    }
    
    console.log('✅ Story loaded from database:', {
      storyId: story.id,
      title: story.title,
      chapters: story.chapters?.length || 0,
      createdAt: story.createdAt || assessments[0].created_at
    })

    return NextResponse.json({
      story,
      hasStory: true
    })

  } catch (error) {
    console.error('❌ Error loading user story:', error)
    return NextResponse.json(
      { error: `Failed to load story: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

