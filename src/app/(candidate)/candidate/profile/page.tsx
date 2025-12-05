'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/hooks/use-toast'
import { User, MapPin, Phone, Briefcase, FileText, Loader2, CheckCircle, X, Info, Sparkles, Camera } from 'lucide-react'
import Image from 'next/image'
import { uploadProfilePhoto, optimizeImage } from '@/lib/storage'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/shared/ui/tooltip'
import { cn } from '@/lib/utils'

const WORK_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed', icon: '💼' },
  { value: 'unemployed', label: 'Unemployed Looking for Work', icon: '🔍' },
  { value: 'freelancer', label: 'Freelancer', icon: '🆓' },
  { value: 'part_time', label: 'Part-time', icon: '⏰' },
  { value: 'student', label: 'Student', icon: '🎓' },
]

const MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy', icon: '😊' },
  { value: 'satisfied', label: 'Satisfied', icon: '😌' },
  { value: 'sad', label: 'Sad', icon: '😔' },
  { value: 'undecided', label: 'Undecided', icon: '🤔' }
]

const SHIFT_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'both', label: 'Both' }
]

const WORK_SETUP_OPTIONS = [
  { value: 'office', label: 'Work From Office' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Work From Home' },
  { value: 'any', label: 'Any' }
]

export default function CandidateProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameTimeout, setUsernameTimeout] = useState<NodeJS.Timeout | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    position: '',
    location: '',
    location_place_id: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    location_city: '',
    location_province: '',
    location_country: '',
    location_barangay: '',
    location_region: '',
    birthday: '',
    gender: '',
    gender_custom: '',
    phone: '',
    work_status: '',
    current_employer: '',
    current_position: '',
    current_salary: '',
    expected_salary_min: '',
    expected_salary_max: '',
    notice_period_days: '',
    preferred_shift: '',
    preferred_work_setup: '',
    current_mood: '',
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  // Calculate age when birthday changes
  useEffect(() => {
    if (formData.birthday) {
      const today = new Date()
      const birthDate = new Date(formData.birthday)
      let calculatedAge = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
      }
      
      setAge(calculatedAge)
    } else {
      setAge(null)
    }
  }, [formData.birthday])

  // Handle work status changes - disable/enable fields
  useEffect(() => {
    if (!formData.work_status) return

    if (formData.work_status === 'unemployed' || formData.work_status === 'student') {
      // Clear disabled fields
      if (formData.current_employer || formData.current_salary || formData.notice_period_days) {
        setFormData(prev => ({
          ...prev,
          current_employer: '',
          current_salary: '',
          notice_period_days: ''
        }))
      }
    }
  }, [formData.work_status])

  async function fetchProfile() {
    try {
      setLoading(true)
      // Fetch candidate data including avatar_url
      const candidateRes = await fetch(`/api/candidates/${user?.id}`)
      if (candidateRes.ok) {
        const { candidate, profile: candidateProfile } = await candidateRes.json()
        console.log('📸 Fetched avatar_url:', candidate.avatar_url)
        setAvatarUrl(candidate.avatar_url)
        
        // Also fetch full profile for other data
        const response = await fetch(`/api/user/profile?userId=${user?.id}`)
        let profileData = null
        if (response.ok) {
          const data = await response.json()
          profileData = data.user
          setProfile(profileData)
        }
        
        // Use profileData if available, otherwise use candidateProfile or empty defaults
        const userData = profileData || candidateProfile || {}
        setFormData({
          username: candidate.username || userData.username || '',
          bio: userData.bio || '',
          position: userData.position || '',
          location: userData.location || '',
          location_place_id: userData.location_place_id || '',
          location_lat: userData.location_lat || null,
          location_lng: userData.location_lng || null,
          location_city: userData.location_city || '',
          location_province: userData.location_province || '',
          location_country: userData.location_country || '',
          location_barangay: userData.location_barangay || '',
          location_region: userData.location_region || '',
          birthday: userData.birthday || '',
          gender: userData.gender || '',
          gender_custom: userData.gender_custom || '',
          phone: candidate.phone || userData.phone || '',
          work_status: userData.work_status || '',
          current_employer: userData.company || userData.current_employer || '',
          current_position: userData.current_position || '',
          current_salary: userData.current_salary ? String(userData.current_salary) : '',
          expected_salary_min: userData.expected_salary_min ? String(userData.expected_salary_min) : '',
          expected_salary_max: userData.expected_salary_max ? String(userData.expected_salary_max) : '',
          notice_period_days: userData.notice_period_days ? String(userData.notice_period_days) : '',
          preferred_shift: userData.preferred_shift || '',
          preferred_work_setup: userData.preferred_work_setup || '',
          current_mood: userData.current_mood || 'prefer_not_to_say',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile. Please refresh the page.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setUsernameChecking(true)
    try {
      const response = await fetch('/api/user/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, userId: user?.id }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setUsernameAvailable(data.available)
      } else {
        setUsernameAvailable(false)
      }
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameAvailable(false)
    } finally {
      setUsernameChecking(false)
    }
  }

  // Handle profile picture upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      setPhotoUploading(true)
      setPhotoError(null)

      console.log('📸 Starting photo upload...')

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      // Optimize image
      const optimizedFile = await optimizeImage(file)
      console.log('✅ Image optimized')

      // Upload to Supabase
      const { publicUrl } = await uploadProfilePhoto(optimizedFile, user.id)
      console.log('✅ Photo uploaded to Supabase:', publicUrl)

      // Update candidate's avatar_url in Supabase via API route
      const response = await fetch(`/api/candidates/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: publicUrl,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to update avatar_url:', response.status, errorText)
        throw new Error('Failed to update profile photo')
      }

      // Update local state
      setAvatarUrl(publicUrl)
      console.log('✅ Profile photo updated successfully, avatarUrl set to:', publicUrl)

      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated successfully.',
      })

      // Trigger header update if needed
      window.dispatchEvent(new CustomEvent('profileUpdated'))
      
      // Refresh profile to ensure everything is in sync
      setTimeout(() => {
        fetchProfile()
      }, 500)

    } catch (error) {
      console.error('❌ Photo upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo'
      setPhotoError(errorMessage)
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setPhotoUploading(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (field === 'username') {
      if (usernameTimeout) {
        clearTimeout(usernameTimeout)
      }
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(value)
      }, 500)
      setUsernameTimeout(timeoutId)
    }
    
    if (field === 'gender' && value !== 'others') {
      setFormData(prev => ({ ...prev, gender_custom: '' }))
    }
  }

  const isFieldDisabled = (field: string) => {
    switch (formData.work_status) {
      case 'unemployed':
      case 'student':
        return ['current_employer', 'current_salary', 'notice_period_days'].includes(field)
      default:
        return false
    }
  }

  const getFieldPlaceholder = (field: string) => {
    switch (field) {
      case 'current_employer':
        if (isFieldDisabled('current_employer')) return 'Not applicable'
        return 'e.g., ABC Company or "Prefer not to disclose"'
      case 'current_salary':
        if (isFieldDisabled('current_salary')) return 'Not applicable'
        return 'e.g., 60000 (enter full numbers)'
      case 'notice_period_days':
        if (isFieldDisabled('notice_period_days')) return 'Not applicable'
        return 'e.g., 30 days'
      default:
        return ''
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      
      const candidateUpdate: any = {}
      if (formData.username) {
        candidateUpdate.username = formData.username.toLowerCase()
      }
      if (formData.phone) {
        candidateUpdate.phone = formData.phone
      }
      
      const profileUpdate: any = {
        bio: formData.bio || null,
        position: formData.position || null,
        location: formData.location || null,
        location_place_id: formData.location_place_id || null,
        location_lat: formData.location_lat || null,
        location_lng: formData.location_lng || null,
        location_city: formData.location_city || null,
        location_province: formData.location_province || null,
        location_country: formData.location_country || null,
        location_barangay: formData.location_barangay || null,
        location_region: formData.location_region || null,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        gender_custom: formData.gender === 'others' ? formData.gender_custom : null,
        work_status: formData.work_status || null,
        current_employer: formData.current_employer || null,
        current_position: formData.current_position || null,
        current_salary: formData.current_salary ? parseFloat(formData.current_salary) : null,
        expected_salary_min: formData.expected_salary_min ? parseFloat(formData.expected_salary_min) : null,
        expected_salary_max: formData.expected_salary_max ? parseFloat(formData.expected_salary_max) : null,
        notice_period_days: formData.notice_period_days ? parseInt(formData.notice_period_days) : null,
        preferred_shift: formData.preferred_shift || null,
        preferred_work_setup: formData.preferred_work_setup || null,
        current_mood: formData.current_mood === 'prefer_not_to_say' || !formData.current_mood ? null : formData.current_mood,
        profile_completed: true, // Mark as completed when saved
      }
      
      // Update candidate (username, phone)
      if (Object.keys(candidateUpdate).length > 0) {
        const candidateResponse = await fetch(`/api/candidates/${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(candidateUpdate),
        })
        
        if (!candidateResponse.ok) {
          throw new Error('Failed to update candidate')
        }
      }
      
      // Update profile
      const profileResponse = await fetch(`/api/candidates/${user?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdate),
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }

        toast({
          title: 'Profile updated',
          description: 'Your profile has been saved successfully.',
        })
        fetchProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Profile...</p>
        </div>
      </div>
    )
  }

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all"
  const labelClass = "text-gray-300"

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Complete Your Profile
            </h1>
            <p className="text-gray-400 mt-1">
              Fill in your details to unlock better job matches and opportunities
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="lg" 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>

        {/* Info Banner */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">Complete your profile</span> to get personalized job recommendations and increase your visibility to recruiters.
            </p>
          </div>
        </div>

        {/* Profile Photo Section */}
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Profile Photo</h2>
                <p className="text-sm text-gray-400">Upload a professional photo for your profile</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-cyan-500 transition-colors">
                {photoUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  </div>
                ) : avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile Avatar"
                    fill
                    className="object-cover rounded-full"
                    unoptimized
                    onError={(e) => {
                      console.error('Image load error:', e)
                      setAvatarUrl(null)
                    }}
                  />
                ) : (
                  <User className="w-full h-full text-gray-500 p-4 bg-gray-800 rounded-full" />
                )}
              </div>
              <Label htmlFor="profile-photo-upload" className="cursor-pointer">
                <Button
                  asChild
                  variant="outline"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 hover:border-white/30 transition-all"
                  disabled={photoUploading}
                >
                  <div className="flex items-center gap-2">
                    {photoUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" /> {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="sr-only"
                      disabled={photoUploading}
                    />
                  </div>
                </Button>
              </Label>
              {photoError && (
                <p className="text-xs text-red-400 mt-1">{photoError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Step 1: Profile Information */}
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-cyan-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Step 1: Profile Information</h2>
                <p className="text-sm text-gray-400">Your personal details and contact information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
                <div>
                <Label htmlFor="username" className={cn(labelClass, "mb-1.5 block")}>
                  Username <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="e.g., john_doe123"
                    className={cn(inputClass, "pl-10")}
                    maxLength={20}
                  />
                  {usernameChecking && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {usernameAvailable === true && !usernameChecking && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {usernameAvailable === false && !usernameChecking && (
                    <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{formData.username.length}/20 characters</span>
                  {usernameAvailable === true && (
                    <span className="text-xs text-green-400">✓ Available</span>
                  )}
                  {usernameAvailable === false && (
                    <span className="text-xs text-red-400">✗ Taken</span>
                  )}
                </div>
              </div>

              {/* Gender */}
                <div>
                <Label htmlFor="gender" className={cn(labelClass, "mb-1.5 block")}>
                  Gender <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="others">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.gender === 'others' && (
                  <Input
                    className={cn(inputClass, "mt-2")}
                    placeholder="Please specify your gender"
                    value={formData.gender_custom}
                    onChange={(e) => handleInputChange('gender_custom', e.target.value)}
                  />
                )}
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <Label htmlFor="location" className={cn(labelClass, "mb-1.5 block")}>
                  Location <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Type city, province, municipality, or barangay"
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="phone" className={labelClass}>
                    Phone Number <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Enter a reachable mobile number with country code (e.g., +63 912 345 6789)</p>
                    </TooltipContent>
                  </Tooltip>
              </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="phone"
                    type="tel"
                  value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="e.g., +63 912 345 6789"
                    className={cn(inputClass, "pl-10")}
                />
                </div>
              </div>

              {/* Birthday */}
              <div>
                <Label htmlFor="birthday" className={cn(labelClass, "mb-1.5 block")}>
                  Birthday <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min="1900-01-01"
                  className={inputClass}
                />
                {age !== null && (
                  <p className="text-xs text-cyan-400 mt-1">Age: {age} years old</p>
                )}
              </div>

              {/* Position */}
              <div className="md:col-span-2">
                <Label htmlFor="position" className={cn(labelClass, "mb-1.5 block")}>
                  Position/Title
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="e.g., Customer Service Representative"
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <Label htmlFor="bio" className={cn(labelClass, "mb-1.5 block")}>
                  Bio <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    placeholder="Tell us about yourself, your experience, and career goals..."
                    className={cn(inputClass, "pl-10")}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{formData.bio.length}/500 characters</span>
                  {formData.bio.length < 10 && formData.bio.length > 0 && (
                    <span className="text-xs text-red-400">At least 10 characters required</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Work Status Information */}
        <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Step 2: Work Status & Preferences</h2>
                <p className="text-sm text-gray-400">Your current employment situation and job preferences</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Work Status */}
              <div>
                <Label htmlFor="work_status" className={cn(labelClass, "mb-1.5 block")}>
                  Work Status <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.work_status} onValueChange={(value) => handleInputChange('work_status', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select your work status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                    {WORK_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Mood */}
              <div>
                <Label htmlFor="current_mood" className={cn(labelClass, "mb-1.5 block")}>
                  Current Mood <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Select value={formData.current_mood} onValueChange={(value) => handleInputChange('current_mood', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select your mood" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    {MOOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Employer */}
              <div>
                <Label htmlFor="current_employer" className={cn(labelClass, "mb-1.5 block")}>
                  Current Employer
                </Label>
                <Input
                  id="current_employer"
                  value={formData.current_employer}
                  onChange={(e) => handleInputChange('current_employer', e.target.value)}
                  disabled={isFieldDisabled('current_employer')}
                  placeholder={getFieldPlaceholder('current_employer')}
                  className={cn(inputClass, "disabled:opacity-50 disabled:cursor-not-allowed")}
                />
              </div>

              {/* Current Position */}
              <div>
                <Label htmlFor="current_position" className={cn(labelClass, "mb-1.5 block")}>
                  Current Position
                </Label>
                <Input
                  id="current_position"
                  value={formData.current_position}
                  onChange={(e) => handleInputChange('current_position', e.target.value)}
                  placeholder="e.g., Customer Service Representative"
                  className={inputClass}
                />
              </div>

              {/* Current Salary */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="current_salary" className={labelClass}>
                    Current Salary
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Enter full numbers (e.g., 60000) instead of abbreviated forms like 100k</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="current_salary"
                  type="text"
                  value={formData.current_salary}
                  onChange={(e) => handleInputChange('current_salary', e.target.value)}
                  disabled={isFieldDisabled('current_salary')}
                  placeholder={getFieldPlaceholder('current_salary')}
                  className={cn(inputClass, "disabled:opacity-50 disabled:cursor-not-allowed")}
                />
              </div>

              {/* Expected Salary Range */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className={labelClass}>
                    Expected Salary Range <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Enter full numbers (e.g., 60000, 80000) instead of abbreviated forms</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Min (e.g., 60000)"
                    value={formData.expected_salary_min}
                    onChange={(e) => handleInputChange('expected_salary_min', e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-gray-500 font-medium">-</span>
                  <Input
                    type="text"
                    placeholder="Max (e.g., 80000)"
                    value={formData.expected_salary_max}
                    onChange={(e) => handleInputChange('expected_salary_max', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Notice Period */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="notice_period_days" className={labelClass}>
                    Notice Period (Days)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">How many days notice you need to give your current employer</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="notice_period_days"
                  type="number"
                  value={formData.notice_period_days}
                  onChange={(e) => handleInputChange('notice_period_days', e.target.value)}
                  disabled={isFieldDisabled('notice_period_days')}
                  placeholder={getFieldPlaceholder('notice_period_days')}
                  className={cn(inputClass, "disabled:opacity-50 disabled:cursor-not-allowed")}
                />
              </div>

              {/* Preferred Shift */}
              <div>
                <Label htmlFor="preferred_shift" className={cn(labelClass, "mb-1.5 block")}>
                  Preferred Shift <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.preferred_shift} onValueChange={(value) => handleInputChange('preferred_shift', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select preferred shift" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                    {SHIFT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Work Setup */}
              <div>
                <Label htmlFor="preferred_work_setup" className={cn(labelClass, "mb-1.5 block")}>
                  Preferred Work Setup <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.preferred_work_setup} onValueChange={(value) => handleInputChange('preferred_work_setup', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select work setup" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                    {WORK_SETUP_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button Footer */}
        <div className="sticky bottom-0 bg-[#0B0B0D]/95 backdrop-blur-sm border-t border-white/10 p-4 -mx-4 md:-mx-8 -mb-8 md:-mb-8">
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              size="lg" 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
