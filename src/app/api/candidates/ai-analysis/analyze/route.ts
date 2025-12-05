import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCandidateById } from '@/lib/db/candidates';
import { syncAllFromAnalysis } from '@/lib/db/candidates/sync-from-analysis';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/candidates/ai-analysis/analyze
 * Perform AI analysis on extracted resume data using Claude
 * Then save to candidate_ai_analysis and sync to structured tables
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/candidates/ai-analysis/analyze] Starting...');
    
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Verify candidate exists
    const candidate = await getCandidateById(userId, true);
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const { resumeData, candidateId } = await request.json();

    if (!resumeData) {
      return NextResponse.json({ error: 'No resume data provided' }, { status: 400 });
    }

    console.log('🤖 Starting AI analysis for candidate:', userId);

    // Prepare resume text for analysis
    const resumeText = formatResumeForAnalysis(resumeData);
    
    // Check if we have Claude API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    let analysis: any;
    let improvedResume: any;
    let skillsSnapshot: any[] = [];
    let experienceSnapshot: any[] = [];
    let educationSnapshot: any[] = [];

    if (anthropicApiKey) {
      // Perform real Claude AI analysis
      console.log('🧠 Calling Claude API for analysis...');
      
      try {
        const anthropic = new Anthropic({
          apiKey: anthropicApiKey,
        });

        const aiResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `Analyze this resume and provide:
1. An overall score (0-100)
2. ATS compatibility score (0-100)
3. Content quality score (0-100)
4. Professional presentation score (0-100)
5. Key strengths (array of strings)
6. Areas for improvement (array of strings)
7. Recommendations (array of strings)
8. An improved professional summary
9. Extract all skills as an array of objects with {name, category, proficiency_level}
10. Extract all work experiences as an array of objects with {company, title, location, start_date, end_date, description, achievements}
11. Extract all education as an array of objects with {institution, degree, field_of_study, start_date, end_date, grade}
12. Provide an improved version of the resume content with better action verbs and quantified achievements

Resume:
${resumeText}

Respond in this exact JSON format:
{
  "overall_score": number,
  "ats_compatibility_score": number,
  "content_quality_score": number,
  "professional_presentation_score": number,
  "key_strengths": ["string"],
  "improvements": ["string"],
  "recommendations": ["string"],
  "improved_summary": "string",
  "skills": [{"name": "string", "category": "technical|soft|language", "proficiency_level": "beginner|intermediate|advanced|expert"}],
  "experience": [{"company": "string", "title": "string", "location": "string", "start_date": "string", "end_date": "string", "description": "string", "achievements": ["string"]}],
  "education": [{"institution": "string", "degree": "string", "field_of_study": "string", "start_date": "string", "end_date": "string", "grade": "string"}],
  "improved_resume": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "bestJobTitle": "string",
    "summary": "string",
    "experience": [...],
    "education": [...],
    "skills": {"technical": [...], "soft": [...], "languages": [...]},
    "achievements": [...],
    "certifications": [...]
  }
}`
            }
          ]
        });

        // Parse Claude response
        const responseText = aiResponse.content[0].type === 'text' 
          ? aiResponse.content[0].text 
          : '';
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          
          analysis = {
            overallScore: parsedResponse.overall_score || 75,
            atsCompatibility: parsedResponse.ats_compatibility_score || 70,
            contentQuality: parsedResponse.content_quality_score || 70,
            professionalPresentation: parsedResponse.professional_presentation_score || 70,
            keyStrengths: parsedResponse.key_strengths || [],
            improvements: parsedResponse.improvements || [],
            recommendations: parsedResponse.recommendations || [],
            improvedSummary: parsedResponse.improved_summary || resumeData.summary || '',
          };
          
          improvedResume = parsedResponse.improved_resume || enhanceResumeData(resumeData, analysis);
          skillsSnapshot = parsedResponse.skills || extractSkillsFromResume(resumeData);
          experienceSnapshot = parsedResponse.experience || resumeData.experience || [];
          educationSnapshot = parsedResponse.education || resumeData.education || [];
          
          console.log('✅ Claude analysis complete');
        } else {
          throw new Error('Could not parse Claude response');
        }
      } catch (claudeError) {
        console.warn('⚠️ Claude API error, using fallback:', claudeError);
        // Use fallback analysis
        const fallback = generateFallbackAnalysis(resumeData, candidate);
        analysis = fallback.analysis;
        improvedResume = fallback.improvedResume;
        skillsSnapshot = fallback.skills;
        experienceSnapshot = fallback.experience;
        educationSnapshot = fallback.education;
      }
    } else {
      console.log('ℹ️ No Claude API key, using enhanced fallback analysis');
      // Use fallback analysis
      const fallback = generateFallbackAnalysis(resumeData, candidate);
      analysis = fallback.analysis;
      improvedResume = fallback.improvedResume;
      skillsSnapshot = fallback.skills;
      experienceSnapshot = fallback.experience;
      educationSnapshot = fallback.education;
    }

    // Generate session ID
    const sessionId = `analysis-${userId}-${Date.now()}`;

    // Save to candidate_ai_analysis table
    console.log('💾 Saving AI analysis to candidate_ai_analysis...');
    
    const { data: savedAnalysis, error: analysisError } = await supabaseAdmin
      .from('candidate_ai_analysis')
      .upsert({
        candidate_id: userId,
        session_id: sessionId,
        overall_score: analysis.overallScore,
        ats_compatibility_score: analysis.atsCompatibility,
        content_quality_score: analysis.contentQuality,
        professional_presentation_score: analysis.professionalPresentation,
        key_strengths: analysis.keyStrengths,
        improvements: analysis.improvements,
        recommendations: analysis.recommendations,
        improved_summary: analysis.improvedSummary,
        skills_snapshot: skillsSnapshot,
        experience_snapshot: experienceSnapshot,
        education_snapshot: educationSnapshot,
        candidate_profile_snapshot: {
          name: resumeData.name,
          email: resumeData.email,
          phone: resumeData.phone,
          bestJobTitle: resumeData.bestJobTitle,
        },
        analysis_metadata: {
          analyzed_at: new Date().toISOString(),
          model_used: anthropicApiKey ? 'claude-sonnet-4-20250514' : 'fallback',
          source: 'dashboard-resume-builder',
        },
      }, {
        onConflict: 'candidate_id',
      })
      .select()
      .single();

    if (analysisError) {
      console.error('❌ Error saving AI analysis:', analysisError);
      // Don't fail the request - still return the analysis
    } else {
      console.log('✅ AI analysis saved to candidate_ai_analysis:', savedAnalysis?.id);
    }

    // Sync to structured tables (candidate_skills, candidate_work_experiences, candidate_educations)
    console.log('🔄 Syncing to structured tables...');
    
    try {
      await syncAllFromAnalysis(userId, {
        skills_snapshot: skillsSnapshot,
        experience_snapshot: experienceSnapshot,
        education_snapshot: educationSnapshot,
      });
      console.log('✅ Structured data synced successfully');
    } catch (syncError) {
      console.error('⚠️ Error syncing structured data (non-critical):', syncError);
    }

    console.log('✅ AI analysis complete for candidate:', userId);

    return NextResponse.json({
      success: true,
      message: 'AI analysis completed successfully',
      analysis: analysis,
      improvedResume: improvedResume,
      savedToDatabase: !analysisError,
    });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform AI analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Format resume data as text for Claude analysis
 */
function formatResumeForAnalysis(resumeData: any): string {
  const sections = [];
  
  if (resumeData.name) sections.push(`Name: ${resumeData.name}`);
  if (resumeData.email) sections.push(`Email: ${resumeData.email}`);
  if (resumeData.phone) sections.push(`Phone: ${resumeData.phone}`);
  if (resumeData.bestJobTitle) sections.push(`Current Title: ${resumeData.bestJobTitle}`);
  
  if (resumeData.summary) {
    sections.push(`\nProfessional Summary:\n${resumeData.summary}`);
  }
  
  if (resumeData.experience?.length) {
    sections.push('\nWork Experience:');
    resumeData.experience.forEach((exp: any) => {
      sections.push(`\n- ${exp.title || exp.position} at ${exp.company}`);
      if (exp.location) sections.push(`  Location: ${exp.location}`);
      if (exp.dates || exp.start_date) sections.push(`  Dates: ${exp.dates || `${exp.start_date} - ${exp.end_date || 'Present'}`}`);
      if (exp.description) sections.push(`  ${exp.description}`);
      if (exp.achievements?.length) {
        sections.push('  Achievements:');
        exp.achievements.forEach((a: string) => sections.push(`    • ${a}`));
      }
    });
  }
  
  if (resumeData.education?.length) {
    sections.push('\nEducation:');
    resumeData.education.forEach((edu: any) => {
      sections.push(`\n- ${edu.degree || edu.qualification} at ${edu.institution || edu.school}`);
      if (edu.field_of_study || edu.major) sections.push(`  Field: ${edu.field_of_study || edu.major}`);
      if (edu.graduation_date || edu.end_date) sections.push(`  Graduated: ${edu.graduation_date || edu.end_date}`);
    });
  }
  
  if (resumeData.skills) {
    sections.push('\nSkills:');
    if (resumeData.skills.technical?.length) {
      sections.push(`Technical: ${resumeData.skills.technical.join(', ')}`);
    }
    if (resumeData.skills.soft?.length) {
      sections.push(`Soft Skills: ${resumeData.skills.soft.join(', ')}`);
    }
    if (resumeData.skills.languages?.length) {
      sections.push(`Languages: ${resumeData.skills.languages.join(', ')}`);
    }
  }
  
  if (resumeData.certifications?.length) {
    sections.push('\nCertifications:');
    resumeData.certifications.forEach((cert: any) => {
      sections.push(`- ${typeof cert === 'string' ? cert : cert.name || cert.title}`);
    });
  }
  
  return sections.join('\n');
}

/**
 * Generate fallback analysis when Claude API is not available
 */
function generateFallbackAnalysis(resumeData: any, candidate: any) {
  const hasExperience = resumeData.experience?.length > 0;
  const hasEducation = resumeData.education?.length > 0;
  const hasSkills = resumeData.skills && (
    resumeData.skills.technical?.length > 0 || 
    resumeData.skills.soft?.length > 0
  );
  
  // Calculate scores based on content completeness
  let overallScore = 50;
  if (hasExperience) overallScore += 15;
  if (hasEducation) overallScore += 10;
  if (hasSkills) overallScore += 10;
  if (resumeData.summary) overallScore += 10;
  if (resumeData.certifications?.length > 0) overallScore += 5;
  
  const analysis = {
    overallScore: Math.min(overallScore, 100),
    atsCompatibility: hasSkills ? 80 : 60,
    contentQuality: hasExperience ? 75 : 55,
    professionalPresentation: resumeData.summary ? 80 : 60,
    keyStrengths: [
      hasExperience ? `${resumeData.experience.length} work experience(s) listed` : null,
      hasEducation ? 'Educational background included' : null,
      hasSkills ? 'Skills section present' : null,
      resumeData.summary ? 'Professional summary included' : null,
    ].filter(Boolean),
    improvements: [
      !resumeData.summary ? 'Add a professional summary' : null,
      !hasExperience ? 'Add work experience details' : null,
      !hasSkills ? 'Add skills section' : null,
      'Include quantifiable achievements in experience',
      'Add relevant certifications if available',
    ].filter(Boolean),
    recommendations: [
      'Use action verbs to start bullet points',
      'Quantify achievements with numbers and percentages',
      'Tailor resume keywords to target job descriptions',
      'Keep formatting consistent throughout',
    ],
    improvedSummary: resumeData.summary || 
      `Experienced professional with a background in ${resumeData.bestJobTitle || 'their field'}. ${
        hasExperience ? `Bringing ${resumeData.experience.length} position(s) of relevant experience.` : ''
      } ${hasSkills ? 'Strong technical and interpersonal skills.' : ''}`
  };

  const improvedResume = enhanceResumeData(resumeData, analysis);
  
  // Extract skills for structured table
  const skills = extractSkillsFromResume(resumeData);
  
  return {
    analysis,
    improvedResume,
    skills,
    experience: resumeData.experience || [],
    education: resumeData.education || [],
  };
}

/**
 * Enhance resume data based on analysis
 */
function enhanceResumeData(resumeData: any, analysis: any) {
  return {
    name: resumeData.name || '',
    email: resumeData.email || '',
    phone: resumeData.phone || '',
    bestJobTitle: resumeData.bestJobTitle || resumeData.position || 'Professional',
    summary: analysis.improvedSummary || resumeData.summary || '',
    experience: resumeData.experience || [],
    education: resumeData.education || [],
    skills: resumeData.skills || {
      technical: [],
      soft: ['Communication', 'Problem Solving', 'Team Collaboration'],
      languages: ['English']
    },
    certifications: resumeData.certifications || [],
    projects: resumeData.projects || [],
    achievements: resumeData.achievements || [],
  };
}

/**
 * Extract skills from resume data in structured format
 */
function extractSkillsFromResume(resumeData: any): any[] {
  const skills: any[] = [];
  
  if (resumeData.skills?.technical) {
    resumeData.skills.technical.forEach((skill: string) => {
      skills.push({ name: skill, category: 'technical', proficiency_level: 'intermediate' });
    });
  }
  
  if (resumeData.skills?.soft) {
    resumeData.skills.soft.forEach((skill: string) => {
      skills.push({ name: skill, category: 'soft', proficiency_level: 'intermediate' });
    });
  }
  
  if (resumeData.skills?.languages) {
    resumeData.skills.languages.forEach((lang: string) => {
      skills.push({ name: lang, category: 'language', proficiency_level: 'intermediate' });
    });
  }
  
  return skills;
}
