'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import { Label } from '@/components/shared/ui/label'
import { Textarea } from '@/components/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/hooks/use-toast'
import PlacesAutocomplete from '@/components/shared/ui/places-autocomplete'
import { User, MapPin, Phone, Briefcase, FileText, Loader2, CheckCircle, X, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/shared/ui/tooltip'

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
    // Candidate fields (candidates table)
    username: '',
    // Profile fields (candidate_profiles table)
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

  // Check username availability
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
    
    // Check username availability
    if (field === 'username') {
      if (usernameTimeout) {
        clearTimeout(usernameTimeout)
      }
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(value)
      }, 500)
      setUsernameTimeout(timeoutId)
    }
    
    // Clear gender_custom when gender changes
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
      
      // Prepare candidate update (username goes to candidates table)
      const candidateUpdate: any = {}
      if (formData.username) {
        candidateUpdate.username = formData.username.toLowerCase()
      }
      
      // Prepare profile update (everything else goes to candidate_profiles table)
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
      }
      
      // Store current_mood as dedicated column
      profileUpdate.current_mood = formData.current_mood || null
      
      // Update candidate (username)
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
      
      // Update phone in candidates table
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
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600 mb-8">Complete your profile to unlock more opportunities</p>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        placeholder="e.g., john_doe123"
                        className="pl-10"
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
                      <p className="text-xs text-green-600 mt-1">✓ Username available</p>
                    )}
                    {usernameAvailable === false && (
                      <p className="text-xs text-red-600 mt-1">✗ Username taken</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="others">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.gender === 'others' && (
                      <Input
                        className="mt-2"
                        placeholder="Please specify your gender"
                        value={formData.gender_custom}
                        onChange={(e) => handleInputChange('gender_custom', e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
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
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Enter a reachable mobile number with country code (e.g., +63 912 345 6789)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="e.g., +63 912 345 6789"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => handleInputChange('birthday', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      min="1900-01-01"
                    />
                    {age !== null && <p className="text-xs text-gray-500 mt-1">Age: {age} years old</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      placeholder="Tell us about yourself, your experience, and career goals..."
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>Your career details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="position">Position/Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="e.g. Customer Service Representative"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Status */}
            <Card>
              <CardHeader>
                <CardTitle>Work Status</CardTitle>
                <CardDescription>Your current employment status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_status">Work Status</Label>
                    <Select value={formData.work_status} onValueChange={(value) => handleInputChange('work_status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work status" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="current_mood">Current Mood (Optional)</Label>
                    <Select value={formData.current_mood} onValueChange={(value) => handleInputChange('current_mood', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Prefer not to say</SelectItem>
                        {MOOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="current_employer">Current Employer</Label>
                    <Input
                      id="current_employer"
                      value={formData.current_employer}
                      onChange={(e) => handleInputChange('current_employer', e.target.value)}
                      disabled={isFieldDisabled('current_employer')}
                      placeholder={isFieldDisabled('current_employer') ? 'Not applicable' : 'e.g., ABC Company'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="current_position">Current Position</Label>
                    <Input
                      id="current_position"
                      value={formData.current_position}
                      onChange={(e) => handleInputChange('current_position', e.target.value)}
                      placeholder="e.g., Customer Service Representative"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="current_salary">Current Salary</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <Info className="h-3 w-3" />
                          </button>
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
                      placeholder={isFieldDisabled('current_salary') ? 'Not applicable' : 'e.g., 60000'}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label>Expected Salary Range</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <Info className="h-3 w-3" />
                          </button>
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
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="text"
                        placeholder="Max (e.g., 80000)"
                        value={formData.expected_salary_max}
                        onChange={(e) => handleInputChange('expected_salary_max', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="notice_period_days">Notice Period (Days)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <Info className="h-3 w-3" />
                          </button>
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
                      placeholder={isFieldDisabled('notice_period_days') ? 'Not applicable' : 'e.g., 30'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferred_shift">Preferred Shift</Label>
                    <Select value={formData.preferred_shift} onValueChange={(value) => handleInputChange('preferred_shift', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preferred shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="preferred_work_setup">Preferred Work Setup</Label>
                    <Select value={formData.preferred_work_setup} onValueChange={(value) => handleInputChange('preferred_work_setup', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work setup" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_SETUP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
