'use client'

import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Trophy, Keyboard, ArrowRight } from 'lucide-react'

export default function CandidateGamesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Games & Assessments</h1>
        <p className="text-gray-400">Complete assessments to showcase your skills</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DISC Assessment Card */}
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-blue-500/30 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">DISC Assessment</h3>
                <p className="text-sm text-gray-400">Personality & Behavior</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 min-h-[3rem]">
              Discover your personality type and understand your work style to find the perfect role fit.
            </p>
            
            <Link href="/career-tools/assessments/disc">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-none">
                Take Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Typing Hero Card */}
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-purple-500/30 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <Keyboard className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Typing Hero</h3>
                <p className="text-sm text-gray-400">Speed & Accuracy</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 min-h-[3rem]">
              Test and improve your typing speed and accuracy with our gamified typing test.
            </p>
            
            <Link href="/career-tools/games/typing-hero">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 hover:text-purple-400">
                Play Game
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
