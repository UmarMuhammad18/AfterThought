'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Chrome, Sparkles, Mic, ListChecks, Users } from 'lucide-react'
import { BrowserMock } from '@/components/marketing/browser-mock'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function Hero() {
  return (
    <section className="relative px-4 pt-36 pb-20 sm:px-6 sm:pt-44">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-4xl flex-col items-center gap-7 text-center"
      >
        <motion.span
          variants={item}
          className="glass-neon inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground"
        >
          <Sparkles className="size-3.5 text-primary" />
          AI meeting memory engine
        </motion.span>

        <motion.h1
          variants={item}
          className="text-balance font-heading text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl"
        >
          Your AI-powered meeting memory.
        </motion.h1>

        <motion.p
          variants={item}
          className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground"
        >
          AfterThought records, transcribes, and organises every meeting automatically — turning
          conversations into searchable summaries, action items, and speaker insights.
        </motion.p>

        <motion.div variants={item} className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className="neon-glow flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get Started
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#install"
            className="flex items-center gap-2 rounded-xl border border-glass-border px-6 py-3 font-medium text-foreground transition-colors hover:text-primary"
          >
            <Chrome className="size-4" />
            Install Extension
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-16 w-full max-w-5xl"
      >
        <BrowserMock label="afterthought.ai/dashboard">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-40 rounded-full bg-foreground/20" />
                <div className="h-2.5 w-28 rounded-full bg-foreground/10" />
              </div>
              <div className="glass-neon flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary">
                <Mic className="size-3.5" />
                Recording
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Sparkles, title: 'Summary' },
                { icon: ListChecks, title: 'Action items' },
                { icon: Users, title: 'Speakers' },
              ].map((card) => (
                <div key={card.title} className="glass flex flex-col gap-3 rounded-xl p-4">
                  <card.icon className="size-4 text-primary" />
                  <div className="h-2.5 w-20 rounded-full bg-foreground/15" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-2 w-full rounded-full bg-foreground/10" />
                    <div className="h-2 w-5/6 rounded-full bg-foreground/10" />
                    <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BrowserMock>
      </motion.div>
    </section>
  )
}
