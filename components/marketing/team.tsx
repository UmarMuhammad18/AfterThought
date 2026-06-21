import { Code2, BrainCircuit, GitBranch } from 'lucide-react'
import { Reveal } from '@/components/marketing/reveal'

const TEAM = [
  {
    icon: Code2,
    name: 'Umar',
    role: 'Full-Stack Engineer',
    initials: 'UM',
    bio: 'Builds the web app, API, and data layer that keep every meeting in sync.',
    github: 'https://github.com/UmarMuhammad18',
  },
  {
    icon: BrainCircuit,
    name: 'Rayene',
    role: 'AI Engineer',
    initials: 'RB',
    bio: 'Designs the transcription and summarisation pipeline that powers the insights.',
    github: 'https://github.com/Rayene-B',
  },
]

export function Team() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Meet the team
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            A small team building a smarter way to remember your meetings.
          </p>
        </Reveal>

        <div className="mx-auto grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          {TEAM.map((member, i) => (
            <Reveal key={member.name} delay={i * 0.08}>
              <article className="glass flex h-full flex-col gap-4 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-14 place-items-center rounded-full border border-glass-border bg-primary/12 text-base font-semibold text-primary">
                    {member.initials}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-heading text-lg font-semibold text-foreground">
                      {member.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <member.icon className="size-3.5 text-primary" />
                      {member.role}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {member.bio}
                </p>

                <a
                  href={member.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-auto inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <GitBranch className="size-4" />
                  GitHub
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
