import { LayoutDashboard, Puzzle, AudioLines, Settings } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'
import { BrowserMock } from '@/components/marketing/browser-mock'

const SHOTS = [
  { icon: LayoutDashboard, label: 'afterthought.ai/dashboard', title: 'Dashboard', rows: 4 },
  { icon: Puzzle, label: 'AfterThought extension', title: 'Extension', rows: 3 },
  { icon: AudioLines, label: 'afterthought.ai/recording', title: 'Recording', rows: 5 },
  { icon: Settings, label: 'afterthought.ai/settings', title: 'Settings', rows: 4 },
]

export function Screenshots() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A look inside AfterThought
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            A focused, glassy interface across the web app and browser extension.
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          {SHOTS.map((shot, i) => (
            <Reveal key={shot.title} delay={i * 0.06}>
              <BrowserMock label={shot.label}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
                      <shot.icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{shot.title}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: shot.rows }).map((_, r) => (
                      <div
                        key={r}
                        className="h-2.5 rounded-full bg-foreground/10"
                        style={{ width: `${90 - r * 12}%` }}
                      />
                    ))}
                  </div>
                </div>
              </BrowserMock>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
