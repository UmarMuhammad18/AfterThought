'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, BarChart3, Settings, Calendar, Users, Mail, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/components/auth-provider'

const tabs = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Insights', href: '/insights', icon: BarChart3 },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Speakers', href: '/speakers', icon: Users },
  { label: 'Templates', href: '/templates', icon: Mail },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, configured, signOut } = useAuth()

  // Hide navigation on the auth screens.
  const onAuthScreen =
    pathname === '/sign-in' || pathname === '/sign-up' || pathname.startsWith('/auth/')

  // When auth is configured, only show the full nav to signed-in users.
  const showNav = !onAuthScreen && (!configured || !!user)

  async function handleSignOut() {
    await signOut()
    router.replace('/sign-in')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <nav className="glass mx-auto flex h-14 w-full max-w-7xl items-center justify-between rounded-2xl px-3 sm:px-4">
        <Link href="/" className="flex items-center" aria-label="AfterThought home">
          <BrandLogo />
        </Link>

        {showNav && (
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const active =
                tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <span className="glass-neon absolute inset-0 -z-10 rounded-xl" />
                  )}
                  <Icon className="size-4" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </Link>
              )
            })}

            {configured && user && (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
