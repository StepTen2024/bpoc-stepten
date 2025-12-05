'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Trophy, Keyboard, ArrowRight } from 'lucide-react'

export default function CandidateGamesPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Games & Assessments</h1>
        <p className="text-gray-600 mb-8">Complete assessments to showcase your skills</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-blue-500" />
                <div>
                  <CardTitle>DISC Assessment</CardTitle>
                  <CardDescription>Discover your personality type</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Complete the DISC personality assessment to understand your work style and preferences.
              </p>
              <Link href="/career-tools/assessments/disc">
                <Button className="w-full">
                  Take Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Keyboard className="h-8 w-8 text-purple-500" />
                <div>
                  <CardTitle>Typing Hero</CardTitle>
                  <CardDescription>Test your typing speed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Improve your typing speed and accuracy with our typing test game.
              </p>
              <Link href="/career-tools/games/typing-hero">
                <Button className="w-full">
                  Play Game
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


