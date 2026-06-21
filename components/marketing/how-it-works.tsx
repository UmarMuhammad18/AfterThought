import { Mic, UploadCloud, Cpu, FolderTree } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

const STEPS = [
  {
    icon: Mic,
    step: '01',
    title: 'Record',
    description: 'Start capturing meeting audio from the browser extension in one click.',
  },
  {
    icon: UploadCloud,
    step: '02',
    title: 'Upload',
    description: 'Audio is securely sent to your AfterThought account when the call ends.',
  },
  {
    icon: Cpu,
    step: '03',
    title: 'Process',
    description: 'The AI pipeline transcribes, summarises, and extracts the important details.',
  },
  {
    icon: FolderTree,
    step: '04',
    title: 'Organise',
    description: 'Summaries, action items, and speakers land neatly in your dashboard.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            From conversation to organised memory in four automatic steps.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.08}>
              <div className="glass relative h-full rounded-2xl p-6">
                <span className="font-heading text-sm font-bold text-primary/60">{step.step}</span>
                <span className="mt-4 grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
