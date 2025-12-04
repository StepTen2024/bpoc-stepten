import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Very permissive CORS for public consumption (adjust later if needed)
const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400'
}

function withCors(response: NextResponse) {
	Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
	return response
}

export async function OPTIONS() {
	return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const page = Math.max(1, Number(url.searchParams.get('page') || 1))
	const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))
	const q = (url.searchParams.get('q') || '').trim()
	const status = (url.searchParams.get('status') || 'active').trim()
	const offset = (page - 1) * pageSize

	try {
		// Build query for Supabase
		let query = supabaseAdmin
			.from('jobs')
			.select('*', { count: 'exact' })
			.eq('status', status)

		// Search filter
		if (q) {
			query = query.or(`title.ilike.%${q}%,department.ilike.%${q}%`)
		}

		// Get count
		const { count } = await query

		// Get paginated data
		const { data, error } = await supabaseAdmin
			.from('jobs')
			.select('*')
			.eq('status', status)
			.order('created_at', { ascending: false })
			.range(offset, offset + pageSize - 1)

		if (q) {
			// Re-apply search filter for data query
			const searchQuery = supabaseAdmin
				.from('jobs')
				.select('*')
				.eq('status', status)
				.or(`title.ilike.%${q}%,department.ilike.%${q}%`)
				.order('created_at', { ascending: false })
				.range(offset, offset + pageSize - 1)
			
			const searchResult = await searchQuery
			if (!searchResult.error) {
				return withCors(NextResponse.json({
					page,
					pageSize,
					total: count || 0,
					items: searchResult.data || []
				}))
			}
		}

		if (error) {
			console.error('Error fetching jobs:', error)
			return withCors(NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 }))
		}

		return withCors(NextResponse.json({
			page,
			pageSize,
			total: count || 0,
			items: data || []
		}))
	} catch (e) {
		console.error('Error in public jobs API:', e)
		return withCors(NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 }))
	}
}
