import { NextResponse } from 'next/server'

/**
 * Test endpoint to verify Google Places API configuration
 * GET /api/test-google-places
 */
export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    // Check if API key is set
    const hasApiKey = !!apiKey
    const keyLength = apiKey?.length || 0
    const keyPreview = apiKey ? apiKey.substring(0, 10) + '...' : null
    
    console.log('🔍 Testing Google Places API Configuration:')
    console.log('  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:', hasApiKey ? `✅ Set (${keyLength} chars)` : '❌ Missing')
    
    if (!hasApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Maps API key not configured',
        details: {
          hasApiKey: false,
          message: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set',
        },
        instructions: [
          '1. Go to Google Cloud Console',
          '2. Enable "Places API (New)"',
          '3. Create an API key',
          '4. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to Vercel environment variables',
        ]
      }, { status: 500 })
    }

    // Test the API key with a simple autocomplete request
    console.log('🔍 Testing Google Places API with test query...')
    try {
      const testResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({
          input: 'Manila',
          languageCode: 'en',
          regionCode: 'PH',
        }),
      })

      const responseData = await testResponse.json()
      
      if (!testResponse.ok) {
        console.error('❌ Google Places API test failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          data: responseData,
        })
        
        return NextResponse.json({
          success: false,
          error: 'Google Places API request failed',
          details: {
            status: testResponse.status,
            statusText: testResponse.statusText,
            error: responseData,
          },
          commonIssues: {
            '403 Forbidden': [
              'API key is invalid or expired',
              'Places API (New) is not enabled in Google Cloud Console',
              'API key restrictions are blocking the request',
              'Billing is not enabled on the Google Cloud project',
            ],
            '400 Bad Request': [
              'Invalid request format',
              'Missing required fields',
            ],
          },
          apiKeyInfo: {
            hasKey: true,
            keyLength,
            keyPreview,
          }
        }, { status: testResponse.status })
      }

      console.log('✅ Google Places API test successful')
      const suggestions = responseData.suggestions || []
      
      return NextResponse.json({
        success: true,
        message: 'Google Places API is working correctly',
        testQuery: {
          input: 'Manila',
          suggestionsCount: suggestions.length,
          sampleSuggestions: suggestions.slice(0, 3).map((s: any) => ({
            placeId: s.placePrediction?.placeId,
            text: s.placePrediction?.text?.text,
          })),
        },
        apiKeyInfo: {
          hasKey: true,
          keyLength,
          keyPreview,
        }
      })
    } catch (fetchError) {
      console.error('❌ Network error testing Google Places API:', fetchError)
      return NextResponse.json({
        success: false,
        error: 'Network error testing Google Places API',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        apiKeyInfo: {
          hasKey: true,
          keyLength,
          keyPreview,
        }
      }, { status: 500 })
    }
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

