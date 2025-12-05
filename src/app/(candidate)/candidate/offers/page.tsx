'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Gift, CheckCircle2 } from 'lucide-react'

export default function CandidateOffersPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Offers</h1>
        <p className="text-gray-600 mb-8">View and manage your job offers</p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5" />
              <span>No Offers Yet</span>
            </CardTitle>
            <CardDescription>
              You don't have any job offers at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              When you receive job offers, they will appear here for you to review and respond to.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


