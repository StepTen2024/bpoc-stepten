'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Calendar, Clock } from 'lucide-react'

export default function CandidateInterviewsPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interviews</h1>
        <p className="text-gray-600 mb-8">Manage your interview schedule</p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>No Interviews Scheduled</span>
            </CardTitle>
            <CardDescription>
              You don't have any interviews scheduled at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              When you receive interview invitations, they will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


