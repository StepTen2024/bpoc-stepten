'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CandidateApplicationsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to applications page
    router.push('/applications')
  }, [router])

  return (
    <div className="p-8">
      <div className="text-center">
        <p>Redirecting to applications...</p>
      </div>
    </div>
  )
}


