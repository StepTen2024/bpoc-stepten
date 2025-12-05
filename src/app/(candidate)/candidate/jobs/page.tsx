'use client'

import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Briefcase, TrendingUp, ArrowRight } from 'lucide-react'

export default function CandidateJobsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Jobs</h1>
        <p className="text-gray-400">Find your next career opportunity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Job Matching Card */}
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-green-500/30 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Job Matching</h3>
                <p className="text-sm text-gray-400">AI-powered recommendations</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 min-h-[3rem]">
              Get personalized job recommendations based on your unique profile, skills, and DISC personality assessment.
            </p>
            
            <Link href="/jobs/job-matching">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none">
                View Matches
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Browse All Jobs Card */}
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-blue-500/30 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Briefcase className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Browse All Jobs</h3>
                <p className="text-sm text-gray-400">Explore the marketplace</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 min-h-[3rem]">
              Search and filter through our complete list of available positions to find the perfect role for you.
            </p>
            
            <Link href="/jobs">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 hover:text-blue-400">
                Browse Jobs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
