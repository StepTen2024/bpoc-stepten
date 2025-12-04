import { NextRequest, NextResponse } from 'next/server'
import { getCandidateById } from '@/lib/db/candidates'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = await Promise.resolve(params)
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const candidate = await getCandidateById(userId)
    if (!candidate) {
      return NextResponse.json({ slug: null }, { status: 200 })
    }

    const slug = candidate.slug || null
    if (!slug) return NextResponse.json({ slug: null }, { status: 200 })
    return NextResponse.json({ slug })
  } catch (e) {
    return NextResponse.json({ 
      error: 'Failed to fetch user slug',
      details: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 })
  }
}
