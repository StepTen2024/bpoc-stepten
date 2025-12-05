'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Eye, 
  EyeOff,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle,
  Briefcase,
  FileText,
  Sparkles,
  Trophy,
  Award,
  Camera,
  User,
  Loader2,
  ExternalLink,
  GraduationCap,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shared/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionToken } from '@/lib/auth-helpers';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/shared/ui/toast';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/image-crop-utils';

interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

interface ImprovedResumeContent {
  name: string;
  email?: string;
  phone?: string;
  bestJobTitle: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    achievements: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    highlights: string[];
  }>;
  certifications: string[];
  achievements: string[];
}

const resumeTemplates: ResumeTemplate[] = [
  {
    id: 'executive',
    name: 'Executive Power',
    description: 'Bold and authoritative design',
    primaryColor: '#1e293b',
    secondaryColor: '#475569',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'tech-innovator',
    name: 'Tech Innovator',
    description: 'Modern tech-focused design',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    fontFamily: 'monospace',
  },
  {
    id: 'minimalist-zen',
    name: 'Minimalist Zen',
    description: 'Clean with breathing space',
    primaryColor: '#6b7280',
    secondaryColor: '#9ca3af',
    fontFamily: 'Arial, sans-serif',
  },
  {
    id: 'corporate-chic',
    name: 'Corporate Chic',
    description: 'Elegant business design',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    fontFamily: 'Garamond, serif',
  },
];

/**
 * Step 3: Build Resume
 * Resume editor with templates and customization
 */
export default function ResumeBuildPage() {
  const router = useRouter();
  const { user } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeData, setResumeData] = useState<ImprovedResumeContent | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(resumeTemplates[0]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('summary');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  
  // Photo cropping states
  const [showPhotoCropper, setShowPhotoCropper] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Load resume data from database
  useEffect(() => {
    const loadResumeData = async () => {
      try {
        const sessionToken = await getSessionToken();
        if (!sessionToken || !user?.id) {
          toast.error('Please log in to continue');
          router.push('/candidate/resume');
          return;
        }

        // Fetch resume data
        const response = await fetch('/api/user/resume-for-build', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'x-user-id': String(user.id)
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasData) {
            setResumeData(data.improvedResume || data.extractedResume);
            setResumeSlug(data.slug);
            if (data.profilePhoto) {
              setProfilePhoto(data.profilePhoto);
            }
            if (data.template) {
              const template = resumeTemplates.find(t => t.id === data.template.id);
              if (template) setSelectedTemplate(template);
            }
          } else {
            toast.error('No resume data found. Please complete previous steps.');
            router.push('/candidate/resume');
            return;
          }
        } else {
          router.push('/candidate/resume');
          return;
        }
      } catch (error) {
        console.error('Error loading resume data:', error);
        toast.error('Failed to load resume data');
      } finally {
        setIsLoading(false);
      }
    };

    loadResumeData();
  }, [user?.id, router]);

  // Handle field updates
  const updateField = (field: string, value: any) => {
    if (!resumeData) return;
    setResumeData(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Handle nested field updates
  const updateNestedField = (section: string, index: number, field: string, value: any) => {
    if (!resumeData) return;
    setResumeData(prev => {
      if (!prev) return null;
      const sectionData = [...(prev as any)[section]];
      sectionData[index] = { ...sectionData[index], [field]: value };
      return { ...prev, [section]: sectionData };
    });
  };

  // Handle skill updates
  const updateSkills = (category: 'technical' | 'soft' | 'languages', skills: string[]) => {
    if (!resumeData) return;
    setResumeData(prev => prev ? {
      ...prev,
      skills: { ...prev.skills, [category]: skills }
    } : null);
  };

  // Add item to array
  const addItem = (section: string) => {
    if (!resumeData) return;
    const newItem = section === 'experience' 
      ? { title: '', company: '', duration: '', achievements: [] }
      : section === 'education'
        ? { degree: '', institution: '', year: '', highlights: [] }
        : '';
    
    setResumeData(prev => prev ? {
      ...prev,
      [section]: [...(prev as any)[section], newItem]
    } : null);
  };

  // Remove item from array
  const removeItem = (section: string, index: number) => {
    if (!resumeData) return;
    setResumeData(prev => prev ? {
      ...prev,
      [section]: (prev as any)[section].filter((_: any, i: number) => i !== index)
    } : null);
  };

  // Handle photo upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempPhotoUrl(event.target?.result as string);
      setShowPhotoCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!tempPhotoUrl || !croppedAreaPixels) return;
    
    try {
      const croppedImage = await getCroppedImg(tempPhotoUrl, croppedAreaPixels);
      
      // Upload to Supabase Storage
      const fileName = `${user?.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('resume_headshot')
        .upload(`resume_headshots/${fileName}`, croppedImage, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('resume_headshot')
        .getPublicUrl(`resume_headshots/${fileName}`);
      
      setProfilePhoto(publicUrl);
      setShowPhotoCropper(false);
      setTempPhotoUrl(null);
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    }
  };

  // Save resume
  const handleSave = async () => {
    if (!resumeData || !user?.id) return;
    
    setIsSaving(true);
    try {
      const sessionToken = await getSessionToken();
      if (!sessionToken) throw new Error('Please log in');
      
      const response = await fetch('/api/candidates/resume/save-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-user-id': String(user.id)
        },
        body: JSON.stringify({
          resumeData: {
            ...resumeData,
            profilePhoto
          },
          template: selectedTemplate,
          candidateId: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save resume');
      }
      
      const result = await response.json();
      setResumeSlug(result.slug);
      setShowSaveSuccess(true);
      toast.success('Resume saved successfully!');
      
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Failed to save resume');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your resume...</p>
        </div>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No resume data found</p>
          <Button
            onClick={() => router.push('/candidate/resume')}
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Step 3: Build Resume</h1>
          <p className="text-gray-400 mt-1">
            Customize your resume with templates and edits
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/candidate/resume')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Resume
          </Button>
        </div>
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
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium">Analysis</span>
        </div>
        <div className="w-16 h-0.5 bg-purple-500" />
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-medium">Build</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Sections & Templates */}
        <div className="space-y-4">
          {/* Sections */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="text-sm">{section.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Templates */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resumeTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    selectedTemplate.id === template.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: template.primaryColor }}
                    />
                    <span className="text-white text-sm font-medium">{template.name}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{template.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Profile Photo */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Profile Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              
              {profilePhoto ? (
                <div className="relative">
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-cyan-500/50"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-2 w-full text-xs"
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mx-auto hover:border-cyan-400/50 transition-colors"
                >
                  <User className="h-8 w-8 text-gray-500" />
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-2">
          <Card className="bg-white/5 border-white/10 min-h-[600px]">
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'summary' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Professional Summary</h3>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={resumeData.name || ''}
                          onChange={(e) => updateField('name', e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Job Title</label>
                        <input
                          type="text"
                          value={resumeData.bestJobTitle || ''}
                          onChange={(e) => updateField('bestJobTitle', e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Summary</label>
                        <textarea
                          value={resumeData.summary || ''}
                          onChange={(e) => updateField('summary', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {activeSection === 'experience' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Work Experience</h3>
                        <Button
                          size="sm"
                          onClick={() => addItem('experience')}
                          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {resumeData.experience?.map((exp, index) => (
                        <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                              Position {index + 1}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem('experience', index)}
                              className="text-red-400 hover:text-red-300 h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Job Title"
                              value={exp.title || ''}
                              onChange={(e) => updateNestedField('experience', index, 'title', e.target.value)}
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Company"
                              value={exp.company || ''}
                              onChange={(e) => updateNestedField('experience', index, 'company', e.target.value)}
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Duration (e.g., 2020 - Present)"
                            value={exp.duration || ''}
                            onChange={(e) => updateNestedField('experience', index, 'duration', e.target.value)}
                            className="w-full mt-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'education' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Education</h3>
                        <Button
                          size="sm"
                          onClick={() => addItem('education')}
                          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {resumeData.education?.map((edu, index) => (
                        <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                              Education {index + 1}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem('education', index)}
                              className="text-red-400 hover:text-red-300 h-6 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Degree"
                              value={edu.degree || ''}
                              onChange={(e) => updateNestedField('education', index, 'degree', e.target.value)}
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Institution"
                              value={edu.institution || ''}
                              onChange={(e) => updateNestedField('education', index, 'institution', e.target.value)}
                              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Year"
                            value={edu.year || ''}
                            onChange={(e) => updateNestedField('education', index, 'year', e.target.value)}
                            className="w-full mt-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'skills' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-white">Skills</h3>
                      
                      {['technical', 'soft', 'languages'].map((category) => (
                        <div key={category}>
                          <label className="block text-sm text-gray-400 mb-2 capitalize">
                            {category === 'languages' ? 'Languages' : `${category} Skills`}
                          </label>
                          <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-lg min-h-[60px]">
                            {(resumeData.skills as any)?.[category]?.map((skill: string, idx: number) => (
                              <Badge 
                                key={idx}
                                variant="outline" 
                                className={`${
                                  category === 'technical' ? 'text-cyan-400 border-cyan-500/30' :
                                  category === 'soft' ? 'text-purple-400 border-purple-500/30' :
                                  'text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {skill}
                                <button
                                  onClick={() => {
                                    const updated = [...(resumeData.skills as any)[category]];
                                    updated.splice(idx, 1);
                                    updateSkills(category as any, updated);
                                  }}
                                  className="ml-1 hover:text-red-400"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                            <input
                              type="text"
                              placeholder="Add skill..."
                              className="bg-transparent text-white text-sm focus:outline-none flex-1 min-w-[100px]"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                  const current = (resumeData.skills as any)?.[category] || [];
                                  updateSkills(category as any, [...current, e.currentTarget.value.trim()]);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'achievements' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Achievements</h3>
                        <Button
                          size="sm"
                          onClick={() => {
                            setResumeData(prev => prev ? {
                              ...prev,
                              achievements: [...(prev.achievements || []), '']
                            } : null);
                          }}
                          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {resumeData.achievements?.map((achievement, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-2">
                            <Trophy className="h-3 w-3 text-amber-400" />
                          </div>
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) => {
                              const updated = [...resumeData.achievements];
                              updated[index] = e.target.value;
                              updateField('achievements', updated);
                            }}
                            placeholder="Describe your achievement..."
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updated = resumeData.achievements.filter((_, i) => i !== index);
                              updateField('achievements', updated);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Cropper Dialog */}
      <Dialog open={showPhotoCropper} onOpenChange={setShowPhotoCropper}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Crop Profile Photo</DialogTitle>
            <DialogDescription className="text-gray-400">
              Adjust the crop area for your photo
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative h-64 bg-black rounded-lg overflow-hidden">
            {tempPhotoUrl && (
              <Cropper
                image={tempPhotoUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
              />
            )}
          </div>
          
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPhotoCropper(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropComplete} className="bg-cyan-500 hover:bg-cyan-600">
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Success Dialog */}
      <Dialog open={showSaveSuccess} onOpenChange={setShowSaveSuccess}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Resume Saved!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Your resume has been saved successfully.
            </DialogDescription>
          </DialogHeader>
          
          {resumeSlug && (
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Public URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-cyan-400 text-sm bg-black/30 px-3 py-2 rounded">
                  {window.location.origin}/resume/{resumeSlug}
                </code>
                <Button
                  size="sm"
                  onClick={() => window.open(`/resume/${resumeSlug}`, '_blank')}
                  className="bg-cyan-500/20 text-cyan-400"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowSaveSuccess(false)}>
              Continue Editing
            </Button>
            <Button
              onClick={() => router.push('/candidate/resume')}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

