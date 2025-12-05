'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Gamepad2, 
  Briefcase, 
  ClipboardList,
  MessageSquare,
  Gift,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface CandidateSidebarProps {
  profile: any
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const sidebarItems = [
  { href: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidate/profile', label: 'Profile', icon: User },
  { href: '/candidate/resume', label: 'Resume Builder', icon: FileText },
  { href: '/candidate/games', label: 'Games', icon: Gamepad2 },
  { href: '/candidate/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/candidate/applications', label: 'Applications', icon: ClipboardList },
  { href: '/candidate/interviews', label: 'Interviews', icon: MessageSquare },
  { href: '/candidate/offers', label: 'Offers', icon: Gift },
]

export function CandidateSidebar({ profile, mobileOpen, setMobileOpen }: CandidateSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-in-out",
          "bg-[#0B0B0D] border-r border-white/10",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Background Ambience */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/5 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-purple-500/5 to-transparent" />
          </div>

          {/* Header */}
          <div className="relative z-10 p-6 border-b border-white/10">
            <Link href="/candidate/dashboard" className="block">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                BPOC.IO
              </h2>
              <p className="text-xs text-gray-400 mt-1 tracking-wider uppercase">
                Candidate Portal
              </p>
            </Link>
            
            {/* User Info */}
            <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || profile?.first_name || 'Welcome Candidate'}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {profile?.email || 'Ready to start?'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="relative z-10 flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/candidate/dashboard' && pathname?.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]"
                      : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10 border border-transparent"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-cyan-400" : "text-gray-500 group-hover:text-white")} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-cyan-400 animate-pulse" />}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="relative z-10 p-4 border-t border-white/10 bg-[#0B0B0D]">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

