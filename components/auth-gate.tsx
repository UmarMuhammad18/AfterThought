'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

/** Routes that are always accessible without an authenticated session. */
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth/callback']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const needsAuth = configured && !loading && !user && !isPublic(pathname)

  useEffect(() => {
    if (needsAuth) {
      router.replace('/sign-in')
    }
  }, [needsAuth, router])

  // When auth isn't configured, run in open demo mode so the app still works.
  if (!configured) return <>{children}</>

  if (loading) {
    return (
      <div className="flex h-[60svh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user && !isPublic(pathname)) {
    // Redirecting — render nothing to avoid a flash of protected content.
    return (
      <div className="flex h-[60svh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
