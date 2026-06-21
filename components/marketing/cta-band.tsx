import Link from 'next/link'
import { ArrowRight, Puzzle } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

export function CtaBand() {
  return (
    <section id="install" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto w-full max-w-4xl">
        <div className="glass-neon flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start remembering every meeting
          </h2>
          <p className="max-w-xl text-pretty text-muted-foreground">
            Install the browser extension and connect your account to turn conversations into
            organised, searchable memory.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/sign-in"
              className="neon-glow flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#"
              className="flex items-center gap-2 rounded-xl border border-glass-border px-6 py-3 font-medium text-foreground transition-colors hover:text-primary"
            >
              <Puzzle className="size-4" />
              Install Extension
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
