'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Progress } from '@/components/shared/ui/progress'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'

interface ProfileCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

const completionSteps = [
  { key: 'basic', label: 'Basic Information', required: true },
  { key: 'professional', label: 'Professional Details', required: true },
  { key: 'work_status', label: 'Work Status', required: true },
  { key: 'disc', label: 'DISC Assessment', required: false },
  { key: 'resume', label: 'Resume Builder', required: false },
]

export default function ProfileCompletionModal({
  open,
  onOpenChange,
  userId,
}: ProfileCompletionModalProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (open && userId) {
      fetchProfile()
    }
  }, [open, userId])

  async function fetchProfile() {
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
        checkCompletedSteps(data.user)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  function checkCompletedSteps(user: any) {
    const completed: string[] = []
    
    if (user.first_name && user.last_name && user.email) {
      completed.push('basic')
    }
    if (user.bio && user.position && user.location) {
      completed.push('professional')
    }
    if (user.work_status) {
      completed.push('work_status')
    }
    // DISC and resume checks would go here
    
    setCompletedSteps(completed)
    
    // Find first incomplete required step
    const requiredSteps = completionSteps.filter(s => s.required)
    const firstIncomplete = requiredSteps.findIndex(s => !completed.includes(s.key))
    setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : requiredSteps.length)
  }

  const progress = (completedSteps.length / completionSteps.filter(s => s.required).length) * 100

  const handleStepClick = (stepKey: string) => {
    switch (stepKey) {
      case 'basic':
      case 'professional':
      case 'work_status':
        router.push('/candidate/profile')
        onOpenChange(false)
        break
      case 'disc':
        router.push('/career-tools/assessments/disc')
        onOpenChange(false)
        break
      case 'resume':
        router.push('/resume-builder/build')
        onOpenChange(false)
        break
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
    router.push('/candidate/dashboard')
  }

  const handleComplete = () => {
    onOpenChange(false)
    router.push('/candidate/dashboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Let's get you set up! Complete these steps to unlock all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Profile Completion</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {completionSteps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.key)
              const isCurrent = index === currentStep
              
              return (
                <button
                  key={step.key}
                  onClick={() => handleStepClick(step.key)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${isCompleted 
                      ? 'bg-green-50 border-green-200' 
                      : isCurrent 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className={`h-5 w-5 ${isCurrent ? 'text-blue-500' : 'text-gray-300'}`} />
                    )}
                    <div className="text-left">
                      <div className={`font-medium ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                        {step.label}
                      </div>
                      {step.required && (
                        <div className="text-xs text-gray-500">Required</div>
                      )}
                    </div>
                  </div>
                  {!isCompleted && (
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleSkip}>
              Skip for Now
            </Button>
            {progress === 100 ? (
              <Button onClick={handleComplete}>
                Go to Dashboard
              </Button>
            ) : (
              <Button onClick={() => handleStepClick(completionSteps[currentStep]?.key)}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


