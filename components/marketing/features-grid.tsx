import { Mic, FileText, Sparkles, ListChecks, Users, CalendarClock } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

const FEATURES = [
  {
    icon: Mic,
    title: 'Recording',
    description:
      'Capture meeting audio straight from your browser with a single click — no bots, no setup.',
  },
  {
    icon: FileText,
    title: 'Transcription',
    description:
      'Accurate, timestamped transcripts so you can revisit exactly what was said and when.',
  },
  {
    icon: Sparkles,
    title: 'Summaries',
    description:
      'Concise AI summaries surface the decisions and key points from every conversation.',
  },
  {
    icon: ListChecks,
    title: 'Action Items',
    description:
      'Tasks and follow-ups are extracted automatically and ready to assign after the call.',
  },
  {
    icon: Users,
    title: 'Speaker Profiles',
    description:
      'Recognise who said what and build a running profile of every participant over time.',
  },
  {
    icon: CalendarClock,
    title: 'Calendar Extraction',
    description:
      'Dates, deadlines, and scheduled follow-ups are detected and organised on your calendar.',
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to never forget a meeting
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            AfterThought handles the busywork so you can stay present in the conversation.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.06}>
              <article className="glass group h-full rounded-2xl p-6 transition-colors hover:border-primary/30">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary transition-transform group-hover:scale-105">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
