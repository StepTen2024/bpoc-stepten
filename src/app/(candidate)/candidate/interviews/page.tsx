'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { MessageSquare } from 'lucide-react'

export default function CandidateInterviewsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Interviews</h1>
        <p className="text-gray-400">Manage your interview schedule</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-white/5 mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Interviews Scheduled</h3>
          <p className="text-gray-400 max-w-md">
            You don't have any interviews scheduled at this time. When you receive interview invitations, they will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
