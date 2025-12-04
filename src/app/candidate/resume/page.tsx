'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CandidateResumePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to resume builder
    router.push('/resume-builder/build')
  }, [router])

  return (
    <div className="p-8">
      <div className="text-center">
        <p>Redirecting to resume builder...</p>
      </div>
    </div>
  )
}


