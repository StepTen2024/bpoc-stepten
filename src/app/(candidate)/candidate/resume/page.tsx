'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Edit3, 
  Eye,
  Loader2,
  ArrowRight,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken } from '@/lib/auth-helpers';

/**
 * Resume Builder Overview Page
 * Shows current status and directs user to appropriate step
 */
export default function ResumeOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasExtractedResume, setHasExtractedResume] = useState(false);
  const [hasAIAnalysis, setHasAIAnalysis] = useState(false);
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const checkResumeStatus = async () => {
      try {
        const sessionToken = await getSessionToken();
        if (!sessionToken || !user?.id) {
          setIsLoading(false);
          return;
        }

        // Check for existing resume data
        const response = await fetch('/api/user/resume-status', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'x-user-id': String(user.id)
          }
        });

        if (response.ok) {
          const data = await response.json();
          setHasExtractedResume(data.hasExtractedResume || false);
          setHasAIAnalysis(data.hasAIAnalysis || false);
          setHasSavedResume(data.hasSavedResume || false);
          setResumeSlug(data.resumeSlug || null);
          setLastUpdated(data.lastUpdated || null);
        }
      } catch (error) {
        console.error('Error checking resume status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkResumeStatus();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Determine which step user should go to
  const getNextStep = () => {
    if (!hasExtractedResume) return '/candidate/resume/upload';
    if (!hasAIAnalysis) return '/candidate/resume/analysis';
    return '/candidate/resume/build';
  };

  const getStepStatus = (step: number) => {
    if (step === 1) return hasExtractedResume ? 'completed' : 'current';
    if (step === 2) return hasAIAnalysis ? 'completed' : hasExtractedResume ? 'current' : 'pending';
    if (step === 3) return hasSavedResume ? 'completed' : hasAIAnalysis ? 'current' : 'pending';
    return 'pending';
  };

  return (
    <div className="min-h-screen cyber-grid overflow-hidden rounded-3xl relative">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 py-12 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="h-12 w-12 text-cyan-400 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              Resume Builder
            </h1>
          </div>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Create a professional AI-enhanced resume in 3 simple steps
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Progress Steps */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <h2 className="text-xl font-semibold text-white mb-8 text-center">Your Progress</h2>
              
              <div className="flex items-center justify-between relative max-w-3xl mx-auto">
                {/* Step 1 */}
                <div className="flex flex-col items-center px-2 z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-[#0B0B0D] ${
                    getStepStatus(1) === 'completed' 
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/30' 
                      : getStepStatus(1) === 'current'
                        ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20 animate-pulse' 
                        : 'border-gray-600 text-gray-500 bg-gray-800/50'
                  }`}>
                    {getStepStatus(1) === 'completed' ? (
                      <CheckCircle className="h-8 w-8" />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                  </div>
                  <span className={`mt-3 text-sm font-medium ${
                    getStepStatus(1) === 'completed' ? 'text-cyan-400' :
                    getStepStatus(1) === 'current' ? 'text-white' : 'text-gray-500'
                  }`}>Upload</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center px-2 z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-[#0B0B0D] ${
                    getStepStatus(2) === 'completed' 
                      ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/30' 
                      : getStepStatus(2) === 'current'
                        ? 'border-purple-400 text-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20 animate-pulse' 
                        : 'border-gray-600 text-gray-500 bg-gray-800/50'
                  }`}>
                    {getStepStatus(2) === 'completed' ? (
                      <CheckCircle className="h-8 w-8" />
                    ) : (
                      <Sparkles className="h-8 w-8" />
                    )}
                  </div>
                  <span className={`mt-3 text-sm font-medium ${
                    getStepStatus(2) === 'completed' ? 'text-purple-400' :
                    getStepStatus(2) === 'current' ? 'text-white' : 'text-gray-500'
                  }`}>AI Analysis</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center px-2 z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-[#0B0B0D] ${
                    getStepStatus(3) === 'completed' 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                      : getStepStatus(3) === 'current'
                        ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 animate-pulse' 
                        : 'border-gray-600 text-gray-500 bg-gray-800/50'
                  }`}>
                    {getStepStatus(3) === 'completed' ? (
                      <CheckCircle className="h-8 w-8" />
                    ) : (
                      <Edit3 className="h-8 w-8" />
                    )}
                  </div>
                  <span className={`mt-3 text-sm font-medium ${
                    getStepStatus(3) === 'completed' ? 'text-emerald-400' :
                    getStepStatus(3) === 'current' ? 'text-white' : 'text-gray-500'
                  }`}>Build Resume</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Start/Continue Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-cyan-400/50 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/20"
              onClick={() => router.push(getNextStep())}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    {!hasExtractedResume ? (
                      <Upload className="h-7 w-7 text-white" />
                    ) : !hasAIAnalysis ? (
                      <Sparkles className="h-7 w-7 text-white" />
                    ) : (
                      <Edit3 className="h-7 w-7 text-white" />
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">
                  {!hasExtractedResume ? 'Start New Resume' : 
                   !hasAIAnalysis ? 'Continue to AI Analysis' : 
                   'Edit Your Resume'}
                </h3>
                <p className="text-gray-400">
                  {!hasExtractedResume ? 'Upload your existing resume or start from scratch' :
                   !hasAIAnalysis ? 'Let Claude AI analyze and enhance your resume' :
                   'Customize your AI-enhanced resume'}
                </p>
              </div>
            </motion.div>

            {/* View Resume Card (if saved) */}
            {hasSavedResume && resumeSlug && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-emerald-400/50 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/20"
                onClick={() => window.open(`/resume/${resumeSlug}`, '_blank')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <Eye className="h-7 w-7 text-white" />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">View Public Resume</h3>
                  <p className="text-gray-400">
                    See your resume as others will see it
                  </p>
                  
                  {lastUpdated && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
                      <Clock className="h-4 w-4" />
                      <span>Updated: {new Date(lastUpdated).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Start Fresh Card - Only show if user has resume but wants to start over */}
            {hasExtractedResume && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:border-orange-400/50 transition-all cursor-pointer shadow-lg hover:shadow-orange-500/20"
                onClick={() => router.push('/candidate/resume/upload')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                      <Upload className="h-7 w-7 text-white" />
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Upload New Resume</h3>
                  <p className="text-gray-400">
                    Start fresh with a different resume file
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Features Info - Glassmorphism */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
          >
            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-white mb-6">What You'll Get</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Smart Extraction</h4>
                    <p className="text-gray-400 text-sm">AI extracts your info from any resume format</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Claude AI Enhancement</h4>
                    <p className="text-gray-400 text-sm">Get suggestions to improve your content</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Edit3 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Beautiful Templates</h4>
                    <p className="text-gray-400 text-sm">Choose from professional resume designs</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
