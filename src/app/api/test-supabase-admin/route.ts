import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Test endpoint to verify Supabase admin client configuration
 * GET /api/test-supabase-admin
 */
export async function GET() {
  try {
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const urlLength = process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
    const keyLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    
    console.log('🔍 Testing Supabase Admin Client Configuration:')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL:', hasUrl ? `✅ Set (${urlLength} chars)` : '❌ Missing')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', hasServiceKey ? `✅ Set (${keyLength} chars)` : '❌ Missing')
    
    if (!hasUrl || !hasServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl,
          hasServiceKey,
          urlPreview: hasUrl ? process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...' : null,
          keyPreview: hasServiceKey ? process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...' : null,
        },
        message: 'Please check your .env.local or Vercel environment variables'
      }, { status: 500 })
    }

    // Test admin client connection
    console.log('🔍 Testing admin client connection...')
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .select('id, email')
      .limit(1)

    if (error) {
      console.error('❌ Admin client test failed:', error)
      return NextResponse.json({
        success: false,
        error: 'Admin client connection failed',
        details: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        envCheck: {
          hasUrl,
          hasServiceKey,
        }
      }, { status: 500 })
    }

    console.log('✅ Admin client test successful')
    return NextResponse.json({
      success: true,
      message: 'Supabase admin client is working correctly',
      testQuery: {
        table: 'candidates',
        result: data ? `${data.length} row(s) returned` : 'No data',
      },
      envCheck: {
        hasUrl,
        hasServiceKey,
        urlLength,
        keyLength,
      }
    })
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

