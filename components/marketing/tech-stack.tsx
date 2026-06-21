import { Triangle, Database, Cloud, AudioLines, Brain, Chrome, Wind } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

const STACK = [
  { icon: Triangle, label: 'Next.js' },
  { icon: Database, label: 'Supabase' },
  { icon: Cloud, label: 'Vercel' },
  { icon: AudioLines, label: 'Whisper' },
  { icon: Brain, label: 'GPT / Claude' },
  { icon: Chrome, label: 'Chrome Extension' },
  { icon: Wind, label: 'TailwindCSS' },
]

export function TechStack() {
  return (
    <section id="tech" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built on a modern stack
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Production-grade tools powering a fast, reliable meeting memory engine.
          </p>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {STACK.map((tech) => (
              <span
                key={tech.label}
                className="glass flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-foreground"
              >
                <tech.icon className="size-4 text-primary" />
                {tech.label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
