'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Redirect zu unserer eigenen 500 Fehlerseite
    window.location.href = '/500'
  }, [])

  return null
}
