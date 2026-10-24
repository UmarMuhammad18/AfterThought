import { Mic, MessageCircle, Briefcase, Search, Languages, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

const FEATURES = [
  {
    icon: Mic,
    title: 'Every platform',
    description:
      'Desktop app captures any app’s calls with one shortcut; the extension records browser calls; your phone records in person or imports call recordings.',
  },
  {
    icon: MessageCircle,
    title: 'Works in WhatsApp',
    description:
      'Send a voice note or forward a call recording to the AfterThought number and get notes back in the chat. Nothing to install.',
  },
  {
    icon: Briefcase,
    title: 'Interview scorecards',
    description:
      'Score candidates against your rubric, with every judgement backed by a quote and timestamp you can play.',
  },
  {
    icon: Search,
    title: 'Answers you can hear',
    description:
      'Ask anything across all your calls. Every answer cites the exact moment — click to hear it.',
  },
  {
    icon: Languages,
    title: 'Speaks your languages',
    description:
      'Transcribes speakers who switch languages mid-sentence, and labels who said what — you or them.',
  },
  {
    icon: ShieldCheck,
    title: 'Consent first, open source',
    description:
      'Consent prompts on every recording, private audio storage, one-click delete. Self-host it if you prefer.',
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for the calls other note-takers miss
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Not just Zoom at your desk — the WhatsApp interview, the phone call, the chat in the corridor.
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
