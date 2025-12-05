'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Briefcase } from 'lucide-react'

export default function CandidateApplicationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Applications</h1>
        <p className="text-gray-400">Track the status of your job applications</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-white/5 mb-4">
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Active Applications</h3>
          <p className="text-gray-400 max-w-md">
            You haven't applied to any jobs yet. Start browsing jobs to find your next opportunity.
          </p>
        </div>
      </div>
    </div>
  )
}
