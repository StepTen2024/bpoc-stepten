'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Brain,
  Target,
  TrendingUp,
  Award,
  Database,
  ChevronRight,
  Star,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken } from '@/lib/auth-helpers';
import { toast } from '@/components/shared/ui/toast';

/**
 * Step 2: AI Analysis
 * Clean, focused page for Claude AI analysis
 */
export default function ResumeAnalysisPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [savedToDatabase, setSavedToDatabase] = useState(false);

  // Load extracted resume data
  useEffect(() => {
    const loadExtractedData = async () => {
      try {
        const sessionToken = await getSessionToken();
        if (!sessionToken || !user?.id) {
          setError('Please log in to continue');
          setIsLoading(false);
          return;
        }

        // Fetch extracted resume from database
        const response = await fetch('/api/user/extracted-resume', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'x-user-id': String(user.id)
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasData && data.resumeData) {
            setExtractedData(data.resumeData);
          } else {
            // No extracted data - redirect to upload
            toast.error('No extracted resume found. Please upload first.');
            router.push('/candidate/resume/upload');
            return;
          }
        } else {
          router.push('/candidate/resume/upload');
          return;
        }
      } catch (error) {
        console.error('Error loading extracted data:', error);
        setError('Failed to load resume data');
      } finally {
        setIsLoading(false);
      }
    };

    loadExtractedData();
  }, [user?.id, router]);

  const handleStartAnalysis = async () => {
    if (!extractedData) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    setError(null);
    setSavedToDatabase(false);
    
    try {
      const sessionToken = await getSessionToken();
      if (!sessionToken) {
        throw new Error('Please log in to continue');
      }
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);
      
      // Call AI analysis API
      console.log('🤖 Calling AI analysis API...');
      const response = await fetch('/api/candidates/ai-analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-user-id': String(user?.id)
        },
        body: JSON.stringify({
          resumeData: extractedData,
          candidateId: user?.id
        })
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI analysis failed');
      }
      
      const result = await response.json();
      console.log('✅ Analysis result:', result);
      
      setProgress(90);
      
      // Now save the analysis results separately using the save endpoint
      try {
        const sessionId = `analysis-${user?.id}-${Date.now()}`;
        
        console.log('💾 Saving analysis to database...');
        const saveResponse = await fetch('/api/candidates/ai-analysis/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'x-user-id': String(user?.id)
          },
          body: JSON.stringify({
            session_id: sessionId,
            resume_id: null,
            overall_score: result.analysis?.overallScore || 0,
            ats_compatibility_score: result.analysis?.atsCompatibility || null,
            content_quality_score: result.analysis?.contentQuality || null,
            professional_presentation_score: result.analysis?.professionalPresentation || null,
            skills_alignment_score: null,
            key_strengths: result.analysis?.keyStrengths || [],
            strengths_analysis: {},
            improvements: result.analysis?.improvements || [],
            recommendations: result.analysis?.recommendations || [],
            section_analysis: {},
            improved_summary: result.analysis?.improvedSummary || null,
            salary_analysis: null,
            career_path: null,
            candidate_profile_snapshot: {
              name: extractedData.name,
              email: extractedData.email,
              phone: extractedData.phone,
              bestJobTitle: extractedData.bestJobTitle
            },
            skills_snapshot: result.analysis?.skills || extractedData.skills || [],
            experience_snapshot: result.analysis?.experience || extractedData.experience || [],
            education_snapshot: result.analysis?.education || extractedData.education || [],
            analysis_metadata: {
              session_id: sessionId,
              analyzed_at: new Date().toISOString(),
              source: 'candidate-dashboard',
            },
            portfolio_links: null,
            files_analyzed: null,
          })
        });

        if (saveResponse.ok) {
          console.log('✅ Analysis saved to database');
          setSavedToDatabase(true);
          toast.success('AI analysis complete and saved!');
        } else {
          const saveError = await saveResponse.json().catch(() => ({}));
          console.error('❌ Failed to save analysis:', saveError);
          toast.warning('Analysis complete, but failed to save to database');
        }
      } catch (saveError) {
        console.error('❌ Error saving analysis:', saveError);
        toast.warning('Analysis complete, but failed to save to database');
      }
      
      setProgress(100);
      setAnalysisResults(result.analysis);
      setAnalysisComplete(true);
      
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(err instanceof Error ? err.message : 'AI analysis failed');
      setIsAnalyzing(false);
      setAnalysisComplete(false);
    }
  };

  const handleContinueToBuild = () => {
    router.push('/candidate/resume/build');
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Step 2: AI Analysis</h1>
          <p className="text-gray-400 mt-1">
            Let Claude AI analyze and enhance your resume
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push('/candidate/resume')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-cyan-400">
          <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <div className="w-16 h-0.5 bg-cyan-500" />
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-10 h-10 rounded-full border-2 border-purple-400 bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-medium">Analysis</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
            <span className="text-sm">3</span>
          </div>
          <span>Build</span>
        </div>
      </div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          {analysisComplete ? (
            /* Analysis Complete State - Show Full Results */
            <div className="space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="text-center"
              >
                <CheckCircle className="h-20 w-20 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Analysis Complete!</h2>
                <p className="text-gray-300">
                  Your resume has been analyzed and enhanced by AI
                </p>
                
                {/* Database Save Status */}
                <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                  savedToDatabase 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                }`}>
                  <Database className="h-4 w-4" />
                  {savedToDatabase ? 'Saved to Database' : 'Warning: Not saved to database'}
                </div>
              </motion.div>

              {/* Scores Section */}
              {analysisResults && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-cyan-500/30">
                    <div className="text-3xl font-bold text-cyan-400 mb-1">
                      {analysisResults.overallScore || 75}
                    </div>
                    <div className="text-sm text-gray-400">Overall Score</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-purple-500/30">
                    <div className="text-3xl font-bold text-purple-400 mb-1">
                      {analysisResults.atsCompatibility || 80}
                    </div>
                    <div className="text-sm text-gray-400">ATS Compatibility</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-emerald-500/30">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">
                      {analysisResults.contentQuality || 70}
                    </div>
                    <div className="text-sm text-gray-400">Content Quality</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-pink-500/30">
                    <div className="text-3xl font-bold text-pink-400 mb-1">
                      {analysisResults.professionalPresentation || 75}
                    </div>
                    <div className="text-sm text-gray-400">Presentation</div>
                  </div>
                </div>
              )}

              {/* Key Strengths */}
              {analysisResults?.keyStrengths?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-emerald-400" />
                    Key Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysisResults.keyStrengths.map((strength: string, i: number) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {analysisResults?.improvements?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {analysisResults.improvements.map((improvement: string, i: number) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <ChevronRight className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{improvement}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysisResults?.recommendations?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    AI Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {analysisResults.recommendations.map((recommendation: string, i: number) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span>{recommendation}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improved Summary */}
              {analysisResults?.improvedSummary && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-pink-400" />
                    AI-Improved Summary
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {analysisResults.improvedSummary}
                  </p>
                </div>
              )}

              {/* Continue Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleContinueToBuild}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
                >
                  Continue to Resume Builder
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          ) : isAnalyzing ? (
            /* Analyzing State */
            <div className="text-center py-12">
              <Brain className="h-20 w-20 text-purple-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-white mb-2">Claude AI is Analyzing</h2>
              <p className="text-gray-300 mb-6">
                Evaluating content quality, ATS compatibility, and generating improvements...
              </p>
              
              <div className="w-full max-w-md mx-auto">
                <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-gray-400 mt-2 text-sm">{Math.round(progress)}% complete</p>
              </div>
            </div>
          ) : (
            /* Ready to Analyze State */
            <div className="text-center py-8">
              <Sparkles className="h-20 w-20 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Ready for AI Analysis</h2>
              <p className="text-gray-300 mb-6 max-w-lg mx-auto">
                Claude AI will analyze your resume and provide personalized improvements, 
                score your content, and optimize for ATS systems.
              </p>
              
              {/* Extracted Data Preview */}
              {extractedData && (
                <div className="mb-8 p-6 bg-white/5 rounded-xl max-w-md mx-auto text-left">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    Extracted Resume
                  </h3>
                  <div className="space-y-2 text-sm">
                    {extractedData.name && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Name:</span> {extractedData.name}
                      </p>
                    )}
                    {extractedData.email && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Email:</span> {extractedData.email}
                      </p>
                    )}
                    {extractedData.experience?.length > 0 && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Experience:</span> {extractedData.experience.length} position(s)
                      </p>
                    )}
                    {extractedData.education?.length > 0 && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Education:</span> {extractedData.education.length} item(s)
                      </p>
                    )}
                    {(extractedData.skills?.technical?.length > 0 || extractedData.skills?.soft?.length > 0) && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Skills:</span>{' '}
                        {(extractedData.skills?.technical?.length || 0) + (extractedData.skills?.soft?.length || 0)} skill(s)
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleStartAnalysis}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Start AI Analysis
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* What AI Analysis Does */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">ATS Optimization</h4>
              <p className="text-gray-400 text-sm">Ensures your resume passes applicant tracking systems</p>
            </div>
          </div>
        </div>
        
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Content Enhancement</h4>
              <p className="text-gray-400 text-sm">Improves action verbs and quantifies achievements</p>
            </div>
          </div>
        </div>
        
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Skills Extraction</h4>
              <p className="text-gray-400 text-sm">Identifies and categorizes your skills for matching</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
