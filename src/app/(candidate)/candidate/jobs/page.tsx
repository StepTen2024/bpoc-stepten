'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Briefcase, TrendingUp, ArrowRight } from 'lucide-react'

export default function CandidateJobsPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Jobs</h1>
        <p className="text-gray-600 mb-8">Find your next opportunity</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <CardTitle>Job Matching</CardTitle>
                  <CardDescription>Find jobs that match your profile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get personalized job recommendations based on your skills, experience, and preferences.
              </p>
              <Link href="/jobs/job-matching">
                <Button className="w-full">
                  View Matches
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Briefcase className="h-8 w-8 text-blue-500" />
                <div>
                  <CardTitle>Browse All Jobs</CardTitle>
                  <CardDescription>Explore all available positions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Browse through all available job listings and find opportunities that interest you.
              </p>
              <Link href="/jobs">
                <Button className="w-full" variant="outline">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


