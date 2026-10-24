'use client'

import { useEffect } from 'react'

/** Registers public/sw.js so the app is installable and can receive shared files. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  }, [])
  return null
}
