'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Brain, Menu, X, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

const LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/home#features', label: 'Features' },
  { href: '/home#how-it-works', label: 'How it works' },
  { href: '/home#tech', label: 'Tech' },
]

export function MarketingNav() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6"
    >
      <nav className="glass mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
        <Link href="/home" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Brain className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            AfterThought
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl border border-glass-border px-4 py-2 text-sm text-foreground transition-colors hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-xl border border-glass-border text-foreground md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mx-auto mt-2 flex w-full max-w-6xl flex-col gap-1 rounded-2xl p-3 md:hidden"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-glass-border pt-3">
            {user ? (
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-glass-border px-4 py-2.5 text-center text-sm text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
