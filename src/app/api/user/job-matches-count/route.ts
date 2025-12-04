import { NextRequest, NextResponse } from 'next/server'
import { getMatchCountByCandidate } from '@/lib/db/matches'
import { getCandidateById } from '@/lib/db/candidates'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get('x-user-id')
		if (!userId) {
			return NextResponse.json({ error: 'User ID not provided' }, { status: 400 })
		}

		// Verify candidate exists
		const candidate = await getCandidateById(userId)
		if (!candidate) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 })
		}

		const url = new URL(request.url)
		const thresholdParam = url.searchParams.get('threshold')
		const threshold = Math.max(0, Math.min(100, Number(thresholdParam ?? 70))) || 70

		// Count matches from Supabase
		const { count: matchesCount, error: matchesError } = await supabaseAdmin
			.from('job_matches')
			.select('*', { count: 'exact', head: true })
			.eq('candidate_id', userId)
			.gte('overall_score', threshold)

		if (matchesError) {
			console.error('Error counting matches:', matchesError)
		}

		// Count active jobs
		const { count: totalActiveJobs, error: jobsError } = await supabaseAdmin
			.from('jobs')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'active')

		if (jobsError) {
			console.error('Error counting active jobs:', jobsError)
		}

		return NextResponse.json({ 
			matches: matchesCount ?? 0, 
			totalActiveJobs: totalActiveJobs ?? 0, 
			threshold 
		})
	} catch (e) {
		console.error('Error computing job matches count:', e)
		return NextResponse.json({ error: 'Failed to compute job matches' }, { status: 500 })
	}
}

async function analyzeJobMatchWithAI(data: any) {
	try {
		const apiKey = process.env.CLAUDE_API_KEY
		if (!apiKey) {
			throw new Error('CLAUDE_API_KEY not configured')
		}

		const cleanUserSkills = Array.isArray(data.user.skills) ? data.user.skills.filter((s: any) => s && typeof s === 'string' && s.trim()) : []
		const cleanUserExperience = Array.isArray(data.user.experience) ? data.user.experience.filter((e: any) => e && typeof e === 'string' && e.trim()) : []
		const cleanUserEducation = Array.isArray(data.user.education) ? data.user.education.filter((ed: any) => ed && typeof ed === 'string' && ed.trim()) : []
		const cleanJobRequirements = Array.isArray(data.job.requirements) ? data.job.requirements.filter((r: any) => r && typeof r === 'string' && r.trim()) : []
		const cleanJobResponsibilities = Array.isArray(data.job.responsibilities) ? data.job.responsibilities.filter((r: any) => r && typeof r === 'string' && r.trim()) : []
		const cleanJobSkills = Array.isArray(data.job.skills) ? data.job.skills.filter((s: any) => s && typeof s === 'string' && s.trim()) : []

		const prompt = `You are an expert HR professional and career counselor. Analyze the match between a job candidate and a job posting.

CANDIDATE PROFILE:
- Name: ${data.user.name || 'Not specified'}
- Current Position: ${data.user.currentPosition || 'Not specified'}
- Location: ${data.user.location || 'Not specified'}
- Bio: ${data.user.bio || 'Not specified'}
- Skills: ${cleanUserSkills.length > 0 ? cleanUserSkills.join(', ') : 'Not specified'}
- Experience: ${cleanUserExperience.length > 0 ? cleanUserExperience.join(', ') : 'Not specified'}
- Education: ${cleanUserEducation.length > 0 ? cleanUserEducation.join(', ') : 'Not specified'}
- Resume Data: ${data.user.resumeData ? JSON.stringify(data.user.resumeData, null, 2) : 'Not available'}

JOB POSTING:
- Title: ${data.job.title || 'Not specified'}
- Company: ${data.job.company || 'Not specified'}
- Description: ${data.job.description || 'Not specified'}
- Requirements: ${cleanJobRequirements.length > 0 ? cleanJobRequirements.join(', ') : 'Not specified'}
- Responsibilities: ${cleanJobResponsibilities.length > 0 ? cleanJobResponsibilities.join(', ') : 'Not specified'}
- Benefits: ${Array.isArray(data.job.benefits) ? data.job.benefits.join(', ') : 'Not specified'}
- Required Skills: ${cleanJobSkills.length > 0 ? cleanJobSkills.join(', ') : 'Not specified'}
- Experience Level: ${data.job.experienceLevel || 'Not specified'}
- Industry: ${data.job.industry || 'Not specified'}
- Department: ${data.job.department || 'Not specified'}
- Work Arrangement: ${data.job.workArrangement || 'Not specified'}
- Salary Range: ${data.job.salaryRange || 'Not specified'}

TASK:
Analyze the match between the candidate and job posting. Consider:
1. Skills alignment (technical skills, soft skills)
2. Experience level compatibility
3. Industry/domain knowledge
4. Location preferences
5. Career progression fit
6. Overall suitability

Provide your analysis in this exact JSON format:
{
  "score": 85,
  "reasoning": "...",
  "breakdown": {
    "skillsMatch": 90,
    "experienceMatch": 85,
    "locationMatch": 80,
    "industryMatch": 70,
    "overallFit": 85
  }
}

The score should be 0-100. Be realistic and thorough. If insufficient data, provide a conservative estimate.`

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: 'claude-sonnet-4-20250514',
				max_tokens: 800,
				messages: [{ role: 'user', content: prompt }]
			})
		})
		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
		}
		const result = await response.json()
		const content = result?.content?.[0]?.text || ''
		const jsonMatch = String(content).match(/\{[\s\S]*\}/)
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0])
			if (typeof parsed.score === 'number' && parsed.score >= 0 && parsed.score <= 100) {
				return { score: parsed.score, reasoning: parsed.reasoning || '', breakdown: parsed.breakdown || {} }
			}
			throw new Error('Invalid score in AI response')
		}
		throw new Error('No valid JSON found in AI response')
	} catch (error: any) {
		return { error: true, score: 0, reasoning: `AI analysis failed: ${error?.message || 'Unknown error'}`, breakdown: {} }
	}
}


