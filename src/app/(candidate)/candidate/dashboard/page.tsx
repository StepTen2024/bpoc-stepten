'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import ProfileCompletionModal from '@/components/candidate/ProfileCompletionModal'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { 
  User, 
  FileText, 
  Briefcase, 
  Trophy, 
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowRight,
  Play,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar_url?: string
  completed_data?: boolean
  slug?: string
}

interface DashboardStats {
  profile_completion: number
  has_resume: boolean
  has_disc: boolean
  has_typing: boolean
  applications_count: number
  job_matches_count: number
}

export default function CandidateDashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return

      if (user) {
        setCurrentUserId(user.id)
        setCheckingAuth(false)
        fetchProfile(user.id)
        fetchStats(user.id)
        return
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error && error.message && !error.message.includes('session')) {
          router.push('/')
          return
        }

        if (session?.user) {
          setCurrentUserId(session.user.id)
          setCheckingAuth(false)
          fetchProfile(session.user.id)
          fetchStats(session.user.id)
          return
        }

        router.push('/')
      } catch (error) {
        console.error('Error in auth check:', error)
      }
    }

    checkAuth()
  }, [user, loading, router])

  async function fetchProfile(userId: string) {
    if (!userId) return
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async function fetchStats(userId: string) {
    if (!userId) return
    try {
      setLoadingStats(true)
      
      const profileRes = await fetch(`/api/user/profile?userId=${userId}`)
      const profileData = profileRes.ok ? await profileRes.json() : null
      
      const resumeRes = await fetch('/api/user/saved-resumes')
      const hasResume = resumeRes.ok
      
      const gamesRes = await fetch('/api/user/games-count')
      const gamesData = gamesRes.ok ? await gamesRes.json() : { disc_count: 0, typing_count: 0 }
      
      const appsRes = await fetch('/api/applications')
      const appsData = appsRes.ok ? await appsRes.json() : { applications: [] }
      
      const matchesRes = await fetch('/api/user/job-matches-count')
      const matchesData = matchesRes.ok ? await matchesRes.json() : { count: 0 }

      const profileCompletion = profileData?.user?.completed_data ? 100 : 
        profileData?.user ? 50 : 0

      setStats({
        profile_completion: profileCompletion,
        has_resume: hasResume,
        has_disc: (gamesData.disc_count || 0) > 0,
        has_typing: (gamesData.typing_count || 0) > 0,
        applications_count: appsData.applications?.length || 0,
        job_matches_count: matchesData.count || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  if (loading || loadingStats || checkingAuth || !currentUserId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const completionSteps = [
    { 
      key: 'profile', 
      label: 'Complete Profile', 
      completed: stats?.profile_completion === 100,
      href: '/candidate/profile'
    },
    { 
      key: 'disc', 
      label: 'Take DISC Assessment', 
      completed: stats?.has_disc || false,
      href: '/candidate/games'
    },
    { 
      key: 'resume', 
      label: 'Build Resume', 
      completed: stats?.has_resume || false,
      href: '/candidate/resume'
    },
    { 
      key: 'typing', 
      label: 'Complete Typing Test', 
      completed: stats?.has_typing || false,
      href: '/candidate/games'
    },
  ]

  const completedSteps = completionSteps.filter(s => s.completed).length
  const totalSteps = completionSteps.length

  return (
    <>
      <ProfileCompletionModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        userId={currentUserId}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{profile?.first_name || 'Candidate'}</span>! 👋
            </h1>
            <p className="mt-1 text-gray-400">
              Here's your career progress overview
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/candidate/profile">
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                View Profile
              </Button>
            </Link>
            <Link href="/candidate/jobs">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 border-none">
                Find Jobs
              </Button>
            </Link>
          </div>
        </div>

        {/* Profile Completion Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-1">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent opacity-50" />
          <div className="relative bg-[#0B0B0D]/80 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Profile Status</h2>
                </div>
                <p className="text-gray-400 max-w-md">
                  Complete your profile to unlock more opportunities and increase your visibility to recruiters.
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {stats?.profile_completion || 0}%
                </div>
                <p className="text-sm text-gray-500">Completion Rate</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {completionSteps.map((step) => (
                <Link key={step.key} href={step.href}>
                  <div className={cn(
                    "group relative p-4 rounded-xl border transition-all duration-300",
                    step.completed 
                      ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
                      : "bg-white/5 border-white/10 hover:border-cyan-500/30 hover:bg-white/10"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn(
                        "p-2 rounded-full",
                        step.completed ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400 group-hover:text-cyan-400"
                      )}>
                        {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </div>
                      {!step.completed && <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />}
                    </div>
                    <p className={cn(
                      "font-medium",
                      step.completed ? "text-green-400" : "text-gray-300 group-hover:text-white"
                    )}>
                      {step.label}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Applications */}
          <Link href="/candidate/applications" className="group">
            <div className="h-full relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium group-hover:text-cyan-400 transition-colors">Applications</h3>
                <Briefcase className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{stats?.applications_count || 0}</span>
                <span className="text-sm text-gray-500 mb-1">Active</span>
              </div>
            </div>
          </Link>

          {/* Job Matches */}
          <Link href="/candidate/jobs" className="group">
            <div className="h-full relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-green-500/30 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium group-hover:text-green-400 transition-colors">Job Matches</h3>
                <TrendingUp className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{stats?.job_matches_count || 0}</span>
                <span className="text-sm text-gray-500 mb-1">New</span>
              </div>
            </div>
          </Link>

          {/* Resume Status */}
          <Link href="/candidate/resume" className="group">
            <div className="h-full relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium group-hover:text-purple-400 transition-colors">Resume</h3>
                <FileText className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "border-0",
                  stats?.has_resume ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                )}>
                  {stats?.has_resume ? 'Optimized' : 'Pending'}
                </Badge>
              </div>
            </div>
          </Link>

          {/* Assessments */}
          <Link href="/candidate/games" className="group">
            <div className="h-full relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-yellow-500/30 hover:shadow-[0_0_30px_-10px_rgba(234,179,8,0.3)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 font-medium group-hover:text-yellow-400 transition-colors">Assessments</h3>
                <Trophy className="w-5 h-5 text-gray-500 group-hover:text-yellow-400 transition-colors" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">
                  {[stats?.has_disc, stats?.has_typing].filter(Boolean).length}
                </span>
                <span className="text-sm text-gray-500 mb-1">/ 2 Completed</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/candidate/games" className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="p-3 rounded-lg bg-blue-500/20 w-fit mb-4">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">DISC Assessment</h3>
              <p className="text-sm text-gray-400">Discover your personality type and strengths.</p>
            </div>
          </Link>

          <Link href="/candidate/resume" className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="p-3 rounded-lg bg-purple-500/20 w-fit mb-4">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">AI Resume Builder</h3>
              <p className="text-sm text-gray-400">Create a professional resume in minutes.</p>
            </div>
          </Link>

          <Link href="/candidate/jobs" className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="p-3 rounded-lg bg-green-500/20 w-fit mb-4">
                <Briefcase className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Browse Jobs</h3>
              <p className="text-sm text-gray-400">Find the perfect role for your skills.</p>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
