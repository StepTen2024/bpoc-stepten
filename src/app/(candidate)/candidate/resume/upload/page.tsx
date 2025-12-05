'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken } from '@/lib/auth-helpers';
import { processResumeFile } from '@/lib/utils';
import { toast } from '@/components/shared/ui/toast';

/**
 * Step 1: Upload & Extract Resume
 * Clean, focused page for resume upload and extraction
 */
export default function ResumeUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'image/jpeg', 
      'image/png', 
      'image/webp'
    ];
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, Word document, or image file');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setError(null);
    setUploadedFile(file);
  };

  const handleProcessResume = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setError(null);
    
    try {
      // Get session token
      const sessionToken = await getSessionToken();
      if (!sessionToken) {
        throw new Error('Please log in to continue');
      }
      
      // Fetch API keys
      setLogs(prev => [...prev, '🔑 Authenticating and fetching configuration...']);
      setProgress(5);
      const keyResponse = await fetch('/api/get-api-key');
      if (!keyResponse.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const keyResult = await keyResponse.json();
      if (!keyResult.success) {
        throw new Error(keyResult.error || 'API keys not available');
      }
      
      setLogs(prev => [...prev, '🚀 Initializing resume extraction pipeline...']);
      setProgress(10);
      
      // Track progress from processing logs
      const originalConsoleLog = console.log;
      const progressMap: Record<string, number> = {
        '📄 Step 1: Reading file': 15,
        '✅ Step 1 Complete': 20,
        '🔄 Step 2: Converting to PDF': 25,
        '✅ Step 2 Complete': 40,
        '📄 Step 3: Creating DOCX': 50,
        '✅ Step 3 Complete': 60,
        '🔄 Step 4: Converting DOCX': 70,
        '✅ Step 4 Complete': 80,
        '🏗️ Step 5: Building resume': 90,
        '✅ Pipeline Complete': 95,
      };
      
      console.log = (...args: any[]) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        originalConsoleLog(...args);
        
        // Check for progress updates
        for (const [pattern, prog] of Object.entries(progressMap)) {
          if (message.includes(pattern)) {
            setProgress(prog);
            // Add to UI logs if it matches a known step or looks like a status update
            setLogs(prev => [...prev, message]);
            break;
          }
        }

        // Also capture other relevant logs that aren't in the progress map but are safe
        // Filter out sensitive data and too technical logs
        if (
          (message.includes('Step') || message.includes('Complete') || message.includes('Processing') || message.includes('Converting')) &&
          !message.includes('API Key') && 
          !message.includes('Bearer') &&
          !logs.includes(message) // Prevent duplicates
        ) {
           // Only add if not already added by the loop above (though setLogs is async so simple check might not be enough, but Set would be better. 
           // Since we break in the loop, we just need to handle non-progress map messages here.)
           // Actually, simpler approach: Just pass through specific safe messages
           const isProgressMsg = Object.keys(progressMap).some(k => message.includes(k));
           if (!isProgressMsg) {
             setLogs(prev => [...prev, message]);
           }
        }
      };
      
      // Process the resume
      const processedResume = await processResumeFile(
        uploadedFile,
        keyResult.openaiApiKey,
        keyResult.cloudConvertApiKey,
        sessionToken
      );
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      if (!processedResume) {
        throw new Error('No data extracted from resume');
      }
      
      setLogs(prev => [...prev, '💾 Saving extracted data to database...']);
      setProgress(98);
      
      // Save to database
      const saveResponse = await fetch('/api/candidates/resume/save-extracted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-user-id': String(user?.id)
        },
        body: JSON.stringify({
          resumeData: processedResume,
          originalFileName: uploadedFile.name,
          candidateId: user?.id
        })
      });
      
      if (!saveResponse.ok) {
        console.warn('Failed to save to database, but continuing...');
        setLogs(prev => [...prev, '⚠️ Warning: Failed to save to database backup, but proceeding...']);
      } else {
        setLogs(prev => [...prev, '✅ Data saved successfully!']);
      }
      
      setProgress(100);
      toast.success('Resume extracted successfully!');
      
      // Clear localStorage to prevent issues
      localStorage.removeItem('resumeData');
      localStorage.removeItem('bpoc_processed_resumes');
      
      // Navigate to analysis page
      setTimeout(() => {
        router.push('/candidate/resume/analysis');
      }, 1000); // Increased delay slightly so user can see "Complete"
      
    } catch (err) {
      console.error('Error processing resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
      setLogs(prev => [...prev, `❌ Error: ${err instanceof Error ? err.message : 'Failed to process resume'}`]);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Step 1: Upload Resume</h1>
          <p className="text-gray-400 mt-1">
            Upload your existing resume to get started
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
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center">
            <Upload className="h-5 w-5" />
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
            <span className="text-sm">2</span>
          </div>
          <span>Analysis</span>
        </div>
        <div className="w-16 h-0.5 bg-gray-700" />
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center">
            <span className="text-sm">3</span>
          </div>
          <span>Build</span>
        </div>
      </div>

      {/* Upload Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          {isProcessing ? (
            /* Processing State */
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 text-cyan-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">Extracting Resume Data</h2>
              <p className="text-gray-300 mb-6">
                Using AI to extract text and structure from your resume...
              </p>
              
              <div className="w-full max-w-md mx-auto mb-8">
                <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-gray-400 mt-2 text-sm">{progress}% complete</p>
              </div>

              {/* Live Console Log */}
              <div className="w-full max-w-xl mx-auto bg-black/80 rounded-lg border border-white/10 p-4 text-left font-mono text-sm overflow-hidden shadow-inner">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                  <Terminal className="h-3 w-3" />
                  <span>Live Process Log</span>
                </div>
                <div className="h-48 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {logs.map((log, i) => (
                    <div key={i} className="text-gray-300 break-words animate-in fade-in slide-in-from-left-1 duration-300">
                      <span className="text-gray-600 mr-2 select-none">
                        {'>'}
                      </span>
                      <span className={
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('❌') ? 'text-red-400' :
                        log.includes('🔑') ? 'text-yellow-400' :
                        log.includes('🚀') ? 'text-cyan-400' :
                        'text-gray-300'
                      }>
                        {log}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          ) : uploadedFile ? (
            /* File Selected State */
            <div className="flex flex-col items-center py-8">
              <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10 w-full max-w-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-white font-medium text-lg truncate">{uploadedFile.name}</p>
                      <p className="text-gray-400 text-sm">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                    className="text-gray-400 hover:text-red-400 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleProcessResume}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all w-full max-w-md"
              >
                Extract Resume Data
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          ) : (
            /* Upload State */
            <div 
              className={`text-center py-12 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                isDragActive 
                  ? 'border-cyan-400 bg-cyan-500/10' 
                  : 'border-white/20 hover:border-cyan-400/50 hover:bg-white/5'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              
              <Upload className={`h-16 w-16 mx-auto mb-4 ${
                isDragActive ? 'text-cyan-400' : 'text-gray-400'
              }`} />
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {isDragActive ? 'Drop your file here' : 'Upload Your Resume'}
              </h2>
              <p className="text-gray-400 mb-4">
                Drag and drop or click to browse
              </p>
              <p className="text-gray-500 text-sm">
                Supports PDF, Word documents, and images (max 10MB)
              </p>
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

      {/* Info Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
      >
        <div className="relative z-10">
          <h3 className="text-lg font-semibold text-white mb-3">What happens next?</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyan-400" />
              Your resume is converted to a readable format
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyan-400" />
              AI extracts your contact info, experience, education, and skills
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyan-400" />
              Data is saved securely to your profile
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyan-400" />
              You'll proceed to AI-powered analysis and enhancement
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
