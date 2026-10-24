import { Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ScorecardData = {
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'
  overall_score: number
  summary: string
  criteria: { name: string; score: number; evidence: { quote: string; timestamp?: string }[]; notes: string }[]
  strengths: string[]
  concerns: string[]
  follow_up_questions: string[]
}

const RECOMMENDATION_LABELS: Record<ScorecardData['recommendation'], string> = {
  strong_yes: 'Strong yes',
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
  strong_no: 'Strong no',
}

/** "mm:ss" or "h:mm:ss" -> seconds */
function toSeconds(ts?: string): number | null {
  if (!ts) return null
  const parts = ts.split(':').map(Number)
  if (parts.some((p) => Number.isNaN(p))) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

export function Scorecard({
  data,
  onSeekTimestamp,
}: {
  data: ScorecardData
  onSeekTimestamp?: (seconds: number) => void
}) {
  const positive = data.recommendation === 'yes' || data.recommendation === 'strong_yes'
  const negative = data.recommendation === 'no' || data.recommendation === 'strong_no'

  return (
    <section className="glass flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Briefcase className="size-5 text-primary" /> Interview scorecard
        </h2>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold',
            positive && 'bg-primary/15 text-primary',
            negative && 'bg-destructive/15 text-destructive',
            !positive && !negative && 'bg-secondary text-foreground',
          )}
        >
          {RECOMMENDATION_LABELS[data.recommendation]} · {data.overall_score}/5
        </span>
      </div>

      {data.summary && <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>}

      <div className="flex flex-col gap-4">
        {data.criteria.map((c) => (
          <div key={c.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="flex gap-1" aria-label={`${c.score} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={cn('h-1.5 w-5 rounded-full', n <= c.score ? 'bg-primary' : 'bg-secondary')} />
                ))}
              </span>
            </div>
            {c.notes && <p className="text-xs leading-relaxed text-muted-foreground">{c.notes}</p>}
            {c.evidence.map((e, i) => {
              const seconds = toSeconds(e.timestamp)
              return (
                <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-xs italic leading-relaxed text-muted-foreground">
                  “{e.quote}”
                  {e.timestamp && (
                    <button
                      type="button"
                      disabled={seconds === null || !onSeekTimestamp}
                      onClick={() => seconds !== null && onSeekTimestamp?.(seconds)}
                      className="ml-2 not-italic tabular-nums text-primary hover:underline disabled:no-underline"
                    >
                      {e.timestamp}
                    </button>
                  )}
                </blockquote>
              )
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MiniList title="Strengths" items={data.strengths} />
        <MiniList title="Concerns" items={data.concerns} />
      </div>
      <MiniList title="Follow-up questions for the next round" items={data.follow_up_questions} />
      <p className="text-xs text-muted-foreground">
        AI-generated from the transcript only. Use it as a starting point for your own judgement, not as a decision.
      </p>
    </section>
  )
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed text-muted-foreground">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
