'use client'

import { Gift } from 'lucide-react'

export default function CandidateOffersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Job Offers</h1>
        <p className="text-gray-400">View and manage your job offers</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-white/5 mb-4">
            <Gift className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Offers Yet</h3>
          <p className="text-gray-400 max-w-md">
            You don't have any job offers at this time. When you receive job offers, they will appear here for you to review and respond to.
          </p>
        </div>
      </div>
    </div>
  )
}
