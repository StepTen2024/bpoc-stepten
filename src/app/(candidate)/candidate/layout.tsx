'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { CandidateSidebar } from '@/components/candidate/CandidateSidebar'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for AuthContext to finish loading
      if (loading) {
        return
      }

      // If AuthContext has a user, we're good
      if (user) {
        setIsAuthenticated(true)
        setAuthChecked(true)
        fetchProfile(user.id)
        return
      }

      // Double-check with Supabase directly (AuthContext might not have updated yet)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('✅ Layout: Session found directly from Supabase')
          setIsAuthenticated(true)
          setAuthChecked(true)
          fetchProfile(session.user.id)
          return
        }
      } catch (error) {
        console.error('Layout auth check error:', error)
      }

      // No user found anywhere - redirect to home
      console.log('❌ Layout: No user found, redirecting to home')
      router.push('/')
    }

    checkAuth()
  }, [user, loading, router])

  async function fetchProfile(userId: string) {
    if (!userId) return
    try {
      // DISABLED: API route not available
      // const response = await fetch(`/api/user/profile?userId=${userId}`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setProfile(data.user)
      // }
      setProfile(null)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  // Show loading state while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Portal...</p>
        </div>
      </div>
    )
  }

  // If not authenticated after check, return null (redirect already happening)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-gray-300">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#0B0B0D] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          BPOC.IO
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-400 hover:text-white"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Reusable Sidebar */}
        <CandidateSidebar 
          profile={profile}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          {/* Background Gradient Orb */}
          <div className="absolute top-0 left-0 w-full h-96 bg-cyan-500/5 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
