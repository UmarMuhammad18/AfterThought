'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Brain } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      >
        <Link href="/home" className="flex items-center gap-2 text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
            <Brain className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold text-foreground">AfterThought</span>
        </Link>

        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="font-heading text-7xl font-bold tracking-tight text-primary sm:text-8xl"
        >
          404
        </motion.h1>

        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Page not found
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
        </div>

        <Link
          href="/home"
          className="neon-glow flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Home className="size-4" />
          Back to Home
        </Link>
      </motion.div>
    </main>
  )
}
