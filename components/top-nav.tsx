'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'

const tabs = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Insights', href: '/insights', icon: BarChart3 },
  { label: 'Calendar', href: '/calendar', icon: Search }, // Reusing icon
  { label: 'Speakers', href: '/speakers', icon: Search }, // Reusing icon
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <nav className="glass mx-auto flex h-14 w-full max-w-7xl items-center justify-between rounded-2xl px-3 sm:px-4">
        <Link href="/" className="flex items-center" aria-label="AfterThought home">
          <BrandLogo />
        </Link>

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
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
