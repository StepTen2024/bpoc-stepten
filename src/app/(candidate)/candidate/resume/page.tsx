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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Resume Builder</h1>
        <p className="text-gray-400 mt-1">
          Create a professional AI-enhanced resume in 3 simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-white mb-6">Your Progress</h2>
          
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                getStepStatus(1) === 'completed' 
                  ? 'bg-cyan-500 border-cyan-500 text-white' 
                  : getStepStatus(1) === 'current'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10' 
                    : 'border-gray-600 text-gray-500'
              }`}>
                {getStepStatus(1) === 'completed' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <span className={`mt-2 text-sm font-medium ${
                getStepStatus(1) === 'completed' ? 'text-cyan-400' :
                getStepStatus(1) === 'current' ? 'text-white' : 'text-gray-500'
              }`}>Upload</span>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-4 rounded ${
              hasExtractedResume ? 'bg-cyan-500' : 'bg-gray-700'
            }`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                getStepStatus(2) === 'completed' 
                  ? 'bg-purple-500 border-purple-500 text-white' 
                  : getStepStatus(2) === 'current'
                    ? 'border-purple-400 text-purple-400 bg-purple-500/10' 
                    : 'border-gray-600 text-gray-500'
              }`}>
                {getStepStatus(2) === 'completed' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <span className={`mt-2 text-sm font-medium ${
                getStepStatus(2) === 'completed' ? 'text-purple-400' :
                getStepStatus(2) === 'current' ? 'text-white' : 'text-gray-500'
              }`}>AI Analysis</span>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-4 rounded ${
              hasAIAnalysis ? 'bg-purple-500' : 'bg-gray-700'
            }`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                getStepStatus(3) === 'completed' 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : getStepStatus(3) === 'current'
                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' 
                    : 'border-gray-600 text-gray-500'
              }`}>
                {getStepStatus(3) === 'completed' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Edit3 className="h-6 w-6" />
                )}
              </div>
              <span className={`mt-2 text-sm font-medium ${
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
          className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-cyan-400/50 transition-all cursor-pointer"
          onClick={() => router.push(getNextStep())}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                {!hasExtractedResume ? (
                  <Upload className="h-6 w-6 text-white" />
                ) : !hasAIAnalysis ? (
                  <Sparkles className="h-6 w-6 text-white" />
                ) : (
                  <Edit3 className="h-6 w-6 text-white" />
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              {!hasExtractedResume ? 'Start New Resume' : 
               !hasAIAnalysis ? 'Continue to AI Analysis' : 
               'Edit Your Resume'}
            </h3>
            <p className="text-gray-400 text-sm">
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
            className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-emerald-400/50 transition-all cursor-pointer"
            onClick={() => window.open(`/resume/${resumeSlug}`, '_blank')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">View Public Resume</h3>
              <p className="text-gray-400 text-sm">
                See your resume as others will see it
              </p>
              
              {lastUpdated && (
                <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>Last updated: {new Date(lastUpdated).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Start Fresh Card */}
        {hasExtractedResume && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-orange-400/50 transition-all cursor-pointer"
            onClick={() => router.push('/candidate/resume/upload')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">Upload New Resume</h3>
              <p className="text-gray-400 text-sm">
                Start fresh with a different resume file
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Features Info */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
      >
        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-white mb-4">What You'll Get</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Smart Extraction</h4>
                <p className="text-gray-400 text-xs">AI extracts your info from any resume format</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Claude AI Enhancement</h4>
                <p className="text-gray-400 text-xs">Get suggestions to improve your content</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Edit3 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Beautiful Templates</h4>
                <p className="text-gray-400 text-xs">Choose from professional resume designs</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
