'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/hooks/use-toast'
import PlacesAutocomplete from '@/components/shared/ui/places-autocomplete'
import { User, MapPin, Phone, Briefcase, FileText, Loader2, CheckCircle, X, Info, Camera } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/shared/ui/tooltip'
import { cn } from '@/lib/utils'

const WORK_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed Looking for Work' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'student', label: 'Student' },
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

  async function fetchProfile() {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/profile?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        setFormData({
          username: data.user.username || '',
          bio: data.user.bio || '',
          position: data.user.position || '',
          location: data.user.location || '',
          location_place_id: data.user.location_place_id || '',
          location_lat: data.user.location_lat || null,
          location_lng: data.user.location_lng || null,
          location_city: data.user.location_city || '',
          location_province: data.user.location_province || '',
          location_country: data.user.location_country || '',
          location_barangay: data.user.location_barangay || '',
          location_region: data.user.location_region || '',
          birthday: data.user.birthday || '',
          gender: data.user.gender || '',
          gender_custom: data.user.gender_custom || '',
          phone: data.user.phone || '',
          work_status: data.user.work_status || '',
          current_employer: data.user.company || data.user.current_employer || '',
          current_position: data.user.current_position || '',
          current_salary: data.user.current_salary ? String(data.user.current_salary) : '',
          expected_salary_min: data.user.expected_salary_min ? String(data.user.expected_salary_min) : '',
          expected_salary_max: data.user.expected_salary_max ? String(data.user.expected_salary_max) : '',
          notice_period_days: data.user.notice_period_days ? String(data.user.notice_period_days) : '',
          preferred_shift: data.user.preferred_shift || '',
          preferred_work_setup: data.user.preferred_work_setup || '',
          current_mood: data.user.current_mood || '',
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

  async function handleSave() {
    try {
      setSaving(true)
      
      const candidateUpdate: any = {}
      if (formData.username) {
        candidateUpdate.username = formData.username.toLowerCase()
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
        current_mood: formData.current_mood || null,
      }
      
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
      
      const profileResponse = await fetch(`/api/candidates/${user?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdate),
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }
      
      if (formData.phone) {
        const phoneResponse = await fetch(`/api/candidates/${user?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone }),
        })
        
        if (!phoneResponse.ok) {
          console.warn('Failed to update phone')
        }
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
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
            <p className="text-gray-400">Complete your profile to unlock more opportunities</p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all hover:border-white/20 hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="username" className={labelClass}>Username</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="e.g., john_doe123"
                      className={cn(inputClass, "pl-10")}
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
                  {usernameAvailable === true && (
                    <p className="text-xs text-green-400 mt-1">✓ Username available</p>
                  )}
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-400 mt-1">✗ Username taken</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gender" className={labelClass}>Gender</Label>
                  <div className="mt-1.5">
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="others">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.gender === 'others' && (
                    <Input
                      className={cn(inputClass, "mt-2")}
                      placeholder="Please specify your gender"
                      value={formData.gender_custom}
                      onChange={(e) => handleInputChange('gender_custom', e.target.value)}
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="location" className={labelClass}>Location</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                    <PlacesAutocomplete
                      value={formData.location}
                      placeholder="Type city, province, municipality, or barangay"
                      onChange={(val) => handleInputChange('location', val)}
                      onSelect={(p) => {
                        handleInputChange('location', p.description)
                        handleInputChange('location_place_id', p.place_id)
                        handleInputChange('location_lat', p.lat)
                        handleInputChange('location_lng', p.lng)
                        handleInputChange('location_city', p.city || '')
                        handleInputChange('location_province', p.province || '')
                        handleInputChange('location_country', p.country || '')
                        handleInputChange('location_barangay', p.barangay || '')
                        handleInputChange('location_region', p.region || '')
                      }}
                      className={cn(inputClass, "pl-10")}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label htmlFor="phone" className={labelClass}>Phone Number</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Enter a reachable mobile number with country code</p>
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

                <div>
                  <Label htmlFor="birthday" className={labelClass}>Birthday</Label>
                  <div className="mt-1.5">
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => handleInputChange('birthday', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      min="1900-01-01"
                      className={inputClass}
                    />
                    {age !== null && <p className="text-xs text-gray-500 mt-1">Age: {age} years old</p>}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="bio" className={labelClass}>Bio</Label>
                  <div className="relative mt-1.5">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      placeholder="Tell us about yourself, your experience, and career goals..."
                      className={cn(inputClass, "pl-10")}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all hover:border-white/20 hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Professional Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="position" className={labelClass}>Position/Title</Label>
                  <div className="relative mt-1.5">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="e.g. Customer Service Representative"
                      className={cn(inputClass, "pl-10")}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="work_status" className={labelClass}>Work Status</Label>
                  <div className="mt-1.5">
                    <Select value={formData.work_status} onValueChange={(value) => handleInputChange('work_status', value)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select work status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                        {WORK_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="current_mood" className={labelClass}>Current Mood (Optional)</Label>
                  <div className="mt-1.5">
                    <Select value={formData.current_mood} onValueChange={(value) => handleInputChange('current_mood', value)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select your mood" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1d] border-white/10 text-white">
                        <SelectItem value="">Prefer not to say</SelectItem>
                        {MOOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="current_employer" className={labelClass}>Current Employer</Label>
                  <Input
                    id="current_employer"
                    value={formData.current_employer}
                    onChange={(e) => handleInputChange('current_employer', e.target.value)}
                    disabled={isFieldDisabled('current_employer')}
                    placeholder={isFieldDisabled('current_employer') ? 'Not applicable' : 'e.g., ABC Company'}
                    className={cn(inputClass, "mt-1.5 disabled:opacity-50")}
                  />
                </div>

                <div>
                  <Label htmlFor="current_position" className={labelClass}>Current Position</Label>
                  <Input
                    id="current_position"
                    value={formData.current_position}
                    onChange={(e) => handleInputChange('current_position', e.target.value)}
                    placeholder="e.g., Customer Service Representative"
                    className={cn(inputClass, "mt-1.5")}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label htmlFor="current_salary" className={labelClass}>Current Salary</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Enter full numbers (e.g., 60000)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="current_salary"
                    type="text"
                    value={formData.current_salary}
                    onChange={(e) => handleInputChange('current_salary', e.target.value)}
                    disabled={isFieldDisabled('current_salary')}
                    placeholder={isFieldDisabled('current_salary') ? 'Not applicable' : 'e.g., 60000'}
                    className={cn(inputClass, "disabled:opacity-50")}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label className={labelClass}>Expected Salary Range</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Enter full numbers (e.g., 60000, 80000)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Min"
                      value={formData.expected_salary_min}
                      onChange={(e) => handleInputChange('expected_salary_min', e.target.value)}
                      className={inputClass}
                    />
                    <span className="text-gray-500">-</span>
                    <Input
                      type="text"
                      placeholder="Max"
                      value={formData.expected_salary_max}
                      onChange={(e) => handleInputChange('expected_salary_max', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label htmlFor="notice_period_days" className={labelClass}>Notice Period (Days)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-500 cursor-pointer hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Days notice needed for current employer</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="notice_period_days"
                    type="number"
                    value={formData.notice_period_days}
                    onChange={(e) => handleInputChange('notice_period_days', e.target.value)}
                    disabled={isFieldDisabled('notice_period_days')}
                    placeholder={isFieldDisabled('notice_period_days') ? 'Not applicable' : 'e.g., 30'}
                    className={cn(inputClass, "disabled:opacity-50")}
                  />
                </div>

                <div>
                  <Label htmlFor="preferred_shift" className={labelClass}>Preferred Shift</Label>
                  <div className="mt-1.5">
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
                </div>

                <div>
                  <Label htmlFor="preferred_work_setup" className={labelClass}>Preferred Work Setup</Label>
                  <div className="mt-1.5">
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
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
