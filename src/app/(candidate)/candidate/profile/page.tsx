'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/hooks/use-toast'
// DISABLED: Google Places API not being used
// import PlacesAutocomplete from '@/components/shared/ui/places-autocomplete'
import { User, MapPin, Phone, Briefcase, FileText, Loader2, CheckCircle, X, Info, Sparkles, Camera, Image as ImageIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/shared/ui/tooltip'
import { cn, slugify } from '@/lib/utils'
import { uploadProfilePhoto, optimizeImage } from '@/lib/storage'

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
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
      fetchCandidateData()
    }
  }, [user])

  // Fetch candidate data to get avatar_url
  async function fetchCandidateData() {
    if (!user?.id) return
    try {
      const response = await fetch(`/api/candidates/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.candidate?.avatar_url) {
          setAvatarUrl(data.candidate.avatar_url)
        }
      }
    } catch (error) {
      console.error('Error fetching candidate data:', error)
    }
  }

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

  // Calculate form completion percentage
  const calculateCompletion = () => {
    const requiredFields = [
      'username', 'gender', 'location', 'phone', 'birthday', 'bio',
      'work_status', 'expected_salary_min', 'expected_salary_max',
      'preferred_shift', 'preferred_work_setup'
    ]
    
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData]
      if (field === 'expected_salary_min' || field === 'expected_salary_max') {
        return value && value.toString().trim() !== ''
      }
      return value && value.toString().trim() !== ''
    }).length

    return Math.round((filledFields / requiredFields.length) * 100)
  }

  // Validate form fields
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'username':
        if (!value || value.trim().length < 3) return 'Username must be at least 3 characters'
        if (value.length > 20) return 'Username must be 20 characters or less'
        if (!/^[a-z0-9_]+$/.test(value.toLowerCase())) return 'Username can only contain letters, numbers, and underscores'
        if (usernameAvailable === false) return 'This username is already taken'
        return ''
      case 'phone':
        if (!value || value.trim() === '') return 'Phone number is required'
        if (!/^\+?\d{10,15}$/.test(value.replace(/\s/g, ''))) return 'Please enter a valid phone number with country code'
        return ''
      case 'bio':
        if (!value || value.trim().length < 10) return 'Bio must be at least 10 characters'
        if (value.length > 500) return 'Bio must be 500 characters or less'
        return ''
      case 'location':
        if (!value || value.trim() === '') return 'Location is required'
        return ''
      case 'birthday':
        if (!value) return 'Birthday is required'
        const birthDate = new Date(value)
        const today = new Date()
        if (birthDate > today) return 'Birthday cannot be in the future'
        if (today.getFullYear() - birthDate.getFullYear() < 13) return 'You must be at least 13 years old'
        return ''
      case 'gender':
        if (!value) return 'Gender is required'
        if (value === 'others' && !formData.gender_custom?.trim()) return 'Please specify your gender'
        return ''
      case 'expected_salary_min':
        if (!value || value.trim() === '') return 'Minimum expected salary is required'
        const minSalary = parseFloat(value)
        if (isNaN(minSalary) || minSalary < 0) return 'Please enter a valid number'
        return ''
      case 'expected_salary_max':
        if (!value || value.trim() === '') return 'Maximum expected salary is required'
        const maxSalary = parseFloat(value)
        if (isNaN(maxSalary) || maxSalary < 0) return 'Please enter a valid number'
        if (formData.expected_salary_min && parseFloat(formData.expected_salary_min) > maxSalary) {
          return 'Maximum salary must be greater than minimum salary'
        }
        return ''
      case 'work_status':
        if (!value) return 'Work status is required'
        return ''
      case 'preferred_shift':
        if (!value) return 'Preferred shift is required'
        return ''
      case 'preferred_work_setup':
        if (!value) return 'Preferred work setup is required'
        return ''
      default:
        return ''
    }
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const fieldsToValidate = [
      'username', 'gender', 'location', 'phone', 'birthday', 'bio',
      'work_status', 'expected_salary_min', 'expected_salary_max',
      'preferred_shift', 'preferred_work_setup'
    ]

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData])
      if (error) {
        newErrors[field] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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
      // DISABLED: API route not available
      // const response = await fetch(`/api/user/profile?userId=${user?.id}`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setProfile(data.user)
      //   setFormData({
      //     username: data.user.username || '',
      //     bio: data.user.bio || '',
      //     position: data.user.position || '',
      //     location: data.user.location || '',
      //     location_place_id: data.user.location_place_id || '',
      //     location_lat: data.user.location_lat || null,
      //     location_lng: data.user.location_lng || null,
      //     location_city: data.user.location_city || '',
      //     location_province: data.user.location_province || '',
      //     location_country: data.user.location_country || '',
      //     location_barangay: data.user.location_barangay || '',
      //     location_region: data.user.location_region || '',
      //     birthday: data.user.birthday || '',
      //     gender: data.user.gender || '',
      //     gender_custom: data.user.gender_custom || '',
      //     phone: data.user.phone || '',
      //     work_status: data.user.work_status || '',
      //     current_employer: data.user.company || data.user.current_employer || '',
      //     current_position: data.user.current_position || '',
      //     current_salary: data.user.current_salary ? String(data.user.current_salary) : '',
      //     expected_salary_min: data.user.expected_salary_min ? String(data.user.expected_salary_min) : '',
      //     expected_salary_max: data.user.expected_salary_max ? String(data.user.expected_salary_max) : '',
      //     notice_period_days: data.user.notice_period_days ? String(data.user.notice_period_days) : '',
      //     preferred_shift: data.user.preferred_shift || '',
      //     preferred_work_setup: data.user.preferred_work_setup || '',
      //     current_mood: data.user.current_mood || '',
      //   })
      // }
      
      // Set empty defaults instead
      setProfile(null)
      setFormData({
        username: '',
        bio: '',
        position: '',
        location: '',
        location_place_id: '',
        location_lat: null,
        location_lng: null,
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
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

    // Validate field in real-time
    if (touched[field]) {
      const error = validateField(field, value)
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }))
      }
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof typeof formData])
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    try {
      setPhotoUploading(true)
      setPhotoError(null)

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file (JPG, PNG, etc.)')
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      console.log('📸 Starting photo upload...')

      // Optimize image
      const optimizedFile = await optimizeImage(file)
      console.log('✅ Image optimized')

      // Upload to Supabase Storage
      const { fileName, publicUrl } = await uploadProfilePhoto(optimizedFile, user.id)
      console.log('✅ Photo uploaded to Supabase:', publicUrl)

      // Update candidates table with avatar_url
      const response = await fetch(`/api/candidates/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: publicUrl
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to update avatar_url:', response.status, errorText)
        throw new Error('Failed to update profile photo')
      }

      // Update local state
      setAvatarUrl(publicUrl)
      console.log('✅ Profile photo updated successfully')

      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated successfully.',
      })

      // Trigger header update if needed
      window.dispatchEvent(new CustomEvent('profileUpdated'))

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
    // Mark all fields as touched
    const allFields = Object.keys(formData)
    setTouched(prev => {
      const newTouched = { ...prev }
      allFields.forEach(field => {
        newTouched[field] = true
      })
      return newTouched
    })

    // Validate form before saving
    if (!validateForm()) {
      toast({
        title: 'Please fix errors',
        description: 'Some fields have errors. Please check and correct them before saving.',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    try {
      setSaving(true)
      
      const candidateUpdate: any = {}
      if (formData.username) {
        const usernameLower = formData.username.toLowerCase().trim()
        candidateUpdate.username = usernameLower
        // Generate slug from username
        candidateUpdate.slug = slugify(usernameLower)
      }
      if (formData.phone) {
        candidateUpdate.phone = formData.phone.trim()
      }
      
      const profileUpdate: any = {
        bio: formData.bio?.trim() || null,
        position: formData.position?.trim() || null,
        location: formData.location?.trim() || null,
        location_place_id: formData.location_place_id?.trim() || null,
        location_lat: formData.location_lat ? Number(formData.location_lat) : null,
        location_lng: formData.location_lng ? Number(formData.location_lng) : null,
        location_city: formData.location_city?.trim() || null,
        location_province: formData.location_province?.trim() || null,
        location_country: formData.location_country?.trim() || null,
        location_barangay: formData.location_barangay?.trim() || null,
        location_region: formData.location_region?.trim() || null,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        gender_custom: formData.gender === 'others' ? (formData.gender_custom?.trim() || null) : null,
        work_status: formData.work_status || null,
        current_employer: formData.current_employer?.trim() || null,
        current_position: formData.current_position?.trim() || null,
        current_salary: formData.current_salary ? parseFloat(formData.current_salary) : null,
        expected_salary_min: formData.expected_salary_min ? parseFloat(formData.expected_salary_min) : null,
        expected_salary_max: formData.expected_salary_max ? parseFloat(formData.expected_salary_max) : null,
        notice_period_days: formData.notice_period_days ? parseInt(formData.notice_period_days, 10) : null,
        preferred_shift: formData.preferred_shift || null,
        preferred_work_setup: formData.preferred_work_setup || null,
        current_mood: formData.current_mood === 'prefer_not_to_say' ? null : (formData.current_mood || null),
        profile_completed: true, // Mark as completed when saved
      }
      
      console.log('💾 Saving profile data:', {
        candidateUpdate,
        profileUpdateKeys: Object.keys(profileUpdate),
        hasBio: !!profileUpdate.bio,
        hasLocation: !!profileUpdate.location,
        hasBirthday: !!profileUpdate.birthday,
        hasGender: !!profileUpdate.gender,
      })
      
      // Update candidate (username, phone, slug) - goes to candidates table in Supabase
      if (Object.keys(candidateUpdate).length > 0) {
        console.log('📤 Updating candidate in Supabase candidates table:', candidateUpdate)
        const candidateResponse = await fetch(`/api/candidates/${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(candidateUpdate),
        })
        
        if (!candidateResponse.ok) {
          const errorText = await candidateResponse.text()
          console.error('❌ Failed to update candidate:', candidateResponse.status, errorText)
          throw new Error(`Failed to update candidate: ${candidateResponse.status}`)
        }
        console.log('✅ Candidate updated successfully')
      }
      
      // Update profile - goes to candidate_profiles table in Supabase
      console.log('📤 Updating profile in Supabase candidate_profiles table:', {
        candidateId: user?.id,
        fieldsCount: Object.keys(profileUpdate).length,
      })
      const profileResponse = await fetch(`/api/candidates/${user?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdate),
      })

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text()
        console.error('❌ Failed to update profile:', profileResponse.status, errorText)
        throw new Error(`Failed to update profile: ${profileResponse.status}`)
      }
      console.log('✅ Profile updated successfully')

        toast({
          title: 'Profile updated',
          description: 'Your profile has been saved successfully.',
        })
        // DISABLED: fetchProfile() - API route not available
        // fetchProfile()
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">
              Complete Your Profile
            </h1>
            <p className="text-gray-400 mt-1">
              Fill in your details to unlock better job matches and opportunities
            </p>
            
            {/* Progress Indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Profile Completion</span>
                <span className="text-sm font-semibold text-cyan-400">{calculateCompletion()}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${calculateCompletion()}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-start">
            <Button 
              onClick={handleSave} 
              disabled={saving || Object.keys(errors).length > 0} 
              size="lg" 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Info Banner */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Complete your profile</span> to get personalized job recommendations and increase your visibility to recruiters.
              </p>
            </div>
            {Object.keys(errors).length > 0 && (
              <div className="ml-12 mt-2">
                <p className="text-xs text-red-400">
                  ⚠️ Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} before saving
                </p>
              </div>
            )}
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

            {/* Profile Photo Upload */}
            <div className="mb-6 pb-6 border-b border-white/10">
              <Label className={cn(labelClass, "mb-3 block")}>
                Profile Photo
              </Label>
              <div className="flex items-center gap-6">
                {/* Photo Preview */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-500/50 bg-white/5 flex items-center justify-center">
                    {photoUploading ? (
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    ) : avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  {avatarUrl && !photoUploading && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0B0B0D] flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photoUploading}
                    />
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                      photoUploading 
                        ? "border-gray-500/50 bg-white/5 cursor-not-allowed opacity-50"
                        : "border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer hover:border-cyan-500/70"
                    )}>
                      {photoUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                          <span className="text-sm text-gray-400">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm text-white">
                            {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                  {photoError && (
                    <p className="text-xs text-red-400 mt-2">{photoError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG or GIF. Max size 5MB. Recommended: 400x400px
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
                <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="username" className={cn(labelClass)}>
                    Username <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Choose a unique username (3-20 characters, letters, numbers, and underscores only)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    onBlur={() => handleBlur('username')}
                    placeholder="e.g., john_doe123"
                    className={cn(
                      inputClass, 
                      "pl-10",
                      errors.username && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
                      usernameAvailable === true && !errors.username && "border-green-500/50"
                    )}
                    maxLength={20}
                  />
                  {usernameChecking && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {usernameAvailable === true && !usernameChecking && !errors.username && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {usernameAvailable === false && !usernameChecking && (
                    <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{formData.username.length}/20 characters</span>
                  {usernameAvailable === true && !errors.username && (
                    <span className="text-xs text-green-400">✓ Available</span>
                  )}
                  {usernameAvailable === false && (
                    <span className="text-xs text-red-400">✗ Taken</span>
                  )}
                </div>
                {errors.username && touched.username && (
                  <p className="text-xs text-red-400 mt-1">{errors.username}</p>
                )}
              </div>

              {/* Gender */}
                <div>
                <Label htmlFor="gender" className={cn(labelClass, "mb-1.5 block")}>
                  Gender <span className="text-red-400">*</span>
                </Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => {
                    handleInputChange('gender', value)
                    handleBlur('gender')
                  }}
                >
                  <SelectTrigger className={cn(
                    inputClass,
                    errors.gender && touched.gender && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  )}>
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
                    className={cn(
                      inputClass, 
                      "mt-2",
                      errors.gender && touched.gender && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    )}
                    placeholder="Please specify your gender"
                    value={formData.gender_custom}
                    onChange={(e) => handleInputChange('gender_custom', e.target.value)}
                    onBlur={() => handleBlur('gender')}
                  />
                )}
                {errors.gender && touched.gender && (
                  <p className="text-xs text-red-400 mt-1">{errors.gender}</p>
                )}
              </div>

              {/* Location */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="location" className={cn(labelClass)}>
                    Location <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Enter your city, province, municipality, or barangay (e.g., Manila, Metro Manila)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    onBlur={() => handleBlur('location')}
                    placeholder="e.g., Manila, Metro Manila or Quezon City"
                    className={cn(
                      inputClass, 
                      "pl-10",
                      errors.location && touched.location && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    )}
                  />
                </div>
                {errors.location && touched.location && (
                  <p className="text-xs text-red-400 mt-1">{errors.location}</p>
                )}
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
                    onBlur={() => handleBlur('phone')}
                    placeholder="e.g., +63 912 345 6789"
                    className={cn(
                      inputClass, 
                      "pl-10",
                      errors.phone && touched.phone && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    )}
                  />
                </div>
                {errors.phone && touched.phone && (
                  <p className="text-xs text-red-400 mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Birthday */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="birthday" className={cn(labelClass)}>
                    Birthday <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Select your birth date using the dropdowns below</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className={cn(
                  "grid grid-cols-3 gap-2 p-2 rounded-md border",
                  errors.birthday && touched.birthday ? "border-red-500/50" : "border-transparent"
                )}>
                  {/* Year */}
                  <Select 
                    value={formData.birthday ? new Date(formData.birthday).getFullYear().toString() : ''} 
                    onValueChange={(year) => {
                      const currentDate = formData.birthday ? new Date(formData.birthday) : new Date()
                      const month = currentDate.getMonth() + 1 || 1
                      const currentDay = currentDate.getDate() || 1
                      // Ensure day is valid for the selected month/year (handles leap years)
                      const maxDay = new Date(parseInt(year), month, 0).getDate()
                      const validDay = Math.min(currentDay, maxDay)
                      const newDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
                      handleInputChange('birthday', newDate)
                      handleBlur('birthday')
                    }}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1d] border-white/10 text-white max-h-[200px]">
                      {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => {
                        const year = new Date().getFullYear() - i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* Month */}
                  <Select 
                    value={formData.birthday ? (new Date(formData.birthday).getMonth() + 1).toString() : ''} 
                    onValueChange={(month) => {
                      const currentDate = formData.birthday ? new Date(formData.birthday) : new Date()
                      const year = currentDate.getFullYear() || new Date().getFullYear()
                      const currentDay = currentDate.getDate() || 1
                      // Ensure day is valid for the new month (e.g., if switching from Jan 31 to Feb, use Feb 28/29)
                      const maxDay = new Date(year, parseInt(month), 0).getDate()
                      const validDay = Math.min(currentDay, maxDay)
                      const newDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
                      handleInputChange('birthday', newDate)
                      handleBlur('birthday')
                    }}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                        return (
                          <SelectItem key={month} value={month.toString()}>
                            {monthNames[i]}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* Day */}
                  <Select 
                    value={formData.birthday ? new Date(formData.birthday).getDate().toString() : ''} 
                    onValueChange={(day) => {
                      const currentDate = formData.birthday ? new Date(formData.birthday) : new Date()
                      const year = currentDate.getFullYear() || new Date().getFullYear()
                      const month = currentDate.getMonth() + 1 || 1
                      // Ensure day is valid for the selected month/year (handles leap years)
                      const maxDay = new Date(year, month, 0).getDate()
                      const validDay = Math.min(parseInt(day), maxDay)
                      const newDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
                      handleInputChange('birthday', newDate)
                      handleBlur('birthday')
                    }}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1d] border-white/10 text-white max-h-[200px]">
                      {(() => {
                        const currentDate = formData.birthday ? new Date(formData.birthday) : new Date()
                        const year = currentDate.getFullYear() || new Date().getFullYear()
                        const month = currentDate.getMonth() + 1 || 1
                        // Get days in month (handles leap years)
                        const daysInMonth = new Date(year, month, 0).getDate()
                        return Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1
                          return (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          )
                        })
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                {age !== null && (
                  <p className="text-xs text-cyan-400 mt-1">Age: {age} years old</p>
                )}
                {errors.birthday && touched.birthday && (
                  <p className="text-xs text-red-400 mt-1">{errors.birthday}</p>
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
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="bio" className={cn(labelClass)}>
                    Bio <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Write a brief introduction about yourself, your experience, and career goals (10-500 characters)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    onBlur={() => handleBlur('bio')}
                    rows={4}
                    placeholder="Tell us about yourself, your experience, and career goals. This helps recruiters understand who you are..."
                    className={cn(
                      inputClass, 
                      "pl-10",
                      errors.bio && touched.bio && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    )}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn(
                    "text-xs",
                    formData.bio.length < 10 ? "text-red-400" : formData.bio.length >= 500 ? "text-yellow-400" : "text-gray-500"
                  )}>
                    {formData.bio.length}/500 characters
                  </span>
                  {formData.bio.length > 0 && formData.bio.length < 10 && (
                    <span className="text-xs text-red-400">At least 10 characters required</span>
                  )}
                </div>
                {errors.bio && touched.bio && (
                  <p className="text-xs text-red-400 mt-1">{errors.bio}</p>
                )}
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
                <Select 
                  value={formData.work_status} 
                  onValueChange={(value) => {
                    handleInputChange('work_status', value)
                    handleBlur('work_status')
                  }}
                >
                  <SelectTrigger className={cn(
                    inputClass,
                    errors.work_status && touched.work_status && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  )}>
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
                {errors.work_status && touched.work_status && (
                  <p className="text-xs text-red-400 mt-1">{errors.work_status}</p>
                )}
              </div>

              {/* Current Mood */}
              <div>
                <Label htmlFor="current_mood" className={cn(labelClass, "mb-1.5 block")}>
                  Current Mood <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Select value={formData.current_mood || undefined} onValueChange={(value) => handleInputChange('current_mood', value)}>
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
                      <p className="text-xs">Enter full numbers in PHP (e.g., 60000, 80000) instead of abbreviated forms like 100k</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Min (e.g., 60000)"
                      value={formData.expected_salary_min}
                      onChange={(e) => handleInputChange('expected_salary_min', e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => handleBlur('expected_salary_min')}
                      className={cn(
                        inputClass,
                        errors.expected_salary_min && touched.expected_salary_min && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                      )}
                    />
                    {errors.expected_salary_min && touched.expected_salary_min && (
                      <p className="text-xs text-red-400 mt-1">{errors.expected_salary_min}</p>
                    )}
                  </div>
                  <span className="text-gray-500 font-medium">-</span>
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Max (e.g., 80000)"
                      value={formData.expected_salary_max}
                      onChange={(e) => handleInputChange('expected_salary_max', e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => handleBlur('expected_salary_max')}
                      className={cn(
                        inputClass,
                        errors.expected_salary_max && touched.expected_salary_max && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                      )}
                    />
                    {errors.expected_salary_max && touched.expected_salary_max && (
                      <p className="text-xs text-red-400 mt-1">{errors.expected_salary_max}</p>
                    )}
                  </div>
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
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="preferred_shift" className={cn(labelClass)}>
                    Preferred Shift <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Select your preferred working hours (Day, Night, or Both)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select 
                  value={formData.preferred_shift} 
                  onValueChange={(value) => {
                    handleInputChange('preferred_shift', value)
                    handleBlur('preferred_shift')
                  }}
                >
                  <SelectTrigger className={cn(
                    inputClass,
                    errors.preferred_shift && touched.preferred_shift && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  )}>
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
                {errors.preferred_shift && touched.preferred_shift && (
                  <p className="text-xs text-red-400 mt-1">{errors.preferred_shift}</p>
                )}
              </div>

              {/* Preferred Work Setup */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label htmlFor="preferred_work_setup" className={cn(labelClass)}>
                    Preferred Work Setup <span className="text-red-400">*</span>
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Choose your preferred work arrangement (Office, Remote, Hybrid, or Any)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select 
                  value={formData.preferred_work_setup} 
                  onValueChange={(value) => {
                    handleInputChange('preferred_work_setup', value)
                    handleBlur('preferred_work_setup')
                  }}
                >
                  <SelectTrigger className={cn(
                    inputClass,
                    errors.preferred_work_setup && touched.preferred_work_setup && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  )}>
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
                {errors.preferred_work_setup && touched.preferred_work_setup && (
                  <p className="text-xs text-red-400 mt-1">{errors.preferred_work_setup}</p>
                )}
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
