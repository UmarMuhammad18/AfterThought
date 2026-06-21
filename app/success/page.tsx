'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Brain } from 'lucide-react'

export default function SuccessPage() {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="glass flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-10 text-center"
      >
        <Link href="/" className="flex items-center gap-2 text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
            <Brain className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold text-foreground">AfterThought</span>
        </Link>

        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
          className="grid size-16 place-items-center rounded-full bg-primary/12 text-primary"
        >
          <CheckCircle2 className="size-8" />
        </motion.span>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Welcome back to AfterThought
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You&apos;re signed in. Your meeting memory is ready whenever you are.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="neon-glow flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Dashboard
          <ArrowRight className="size-4" />
        </Link>
      </motion.div>
    </main>
  )
}
