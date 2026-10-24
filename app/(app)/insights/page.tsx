'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Tags, GitCommitVertical, Users, Loader2, Layers, Smile } from 'lucide-react'
import { InsightCard } from '@/components/insight-card'
import { authFetch } from '@/lib/api-client'
import type { Insights } from '@/lib/insights'

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/insights')
      .then((r) => r.json())
      .then((d) => d.ok && setData(d))
      .catch((err) => console.error('Failed to load insights', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data || data.totals.meetings === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-20 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Insights</h1>
        <p className="text-muted-foreground">
          Insights appear once you&apos;ve recorded a few conversations — topics, decisions and who speaks most,
          across all of them.
        </p>
        <Link href="/record" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Record your first call
        </Link>
      </div>
    )
  }

  const maxWeek = Math.max(...data.activity.map((w) => w.meetings), 1)
  const maxTopic = Math.max(...data.topTopics.map((t) => t.count), 1)
  const maxTurns = Math.max(...data.peopleMentions.map((p) => p.turns), 1)
  const maxKeyword = Math.max(...data.topKeywords.map((k) => k.count), 1)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Insights</h1>
        <p className="text-pretty text-muted-foreground">Patterns across every conversation you&apos;ve recorded.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Conversations" value={data.totals.meetings} />
        <Stat label="Hours recorded" value={data.totals.hours} />
        <Stat label="Action items" value={data.totals.actionItems} />
        <Stat label="Interviews" value={data.totals.interviews} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InsightCard icon={BarChart3} title="Conversations per week">
          <div className="flex h-44 items-end gap-2 pt-2" role="img" aria-label="Conversations per week, last 8 weeks">
            {data.activity.map((w) => (
              <div key={w.week} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="pointer-events-none absolute -top-1 z-10 hidden whitespace-nowrap rounded-lg border border-glass-border bg-background px-2 py-1 text-xs text-foreground shadow group-hover:block">
                  {w.meetings} conversation{w.meetings === 1 ? '' : 's'} · {w.hours} h
                </span>
                <div
                  className="w-full max-w-8 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                  style={{ height: `${(w.meetings / maxWeek) * 100}%`, minHeight: w.meetings ? 4 : 0 }}
                />
                <span className="text-[11px] text-muted-foreground">{shortDate(w.week)}</span>
              </div>
            ))}
          </div>
        </InsightCard>

        <InsightCard icon={Layers} title="Most discussed topics">
          {data.topTopics.length === 0 ? (
            <Empty>Topics are extracted by AI — set OPENROUTER_API_KEY to enable them.</Empty>
          ) : (
            <Bars items={data.topTopics.map((t) => ({ label: t.label, value: t.count, max: maxTopic, suffix: t.count === 1 ? 'conversation' : 'conversations' }))} />
          )}
        </InsightCard>

        <InsightCard icon={GitCommitVertical} title="Recent decisions">
          {data.decisionTimeline.length === 0 ? (
            <Empty>No decisions detected yet.</Empty>
          ) : (
            <ol className="relative flex flex-col gap-5 pl-5">
              <span className="absolute left-[3px] top-1 h-[calc(100%-0.5rem)] w-px bg-glass-border" />
              {data.decisionTimeline.map((d, i) => (
                <li key={`${d.meetingId}-${i}`} className="relative flex flex-col gap-0.5">
                  <span className="absolute -left-[18px] top-1 size-2 rounded-full bg-primary ring-4 ring-background" />
                  <span className="text-xs text-muted-foreground">{shortDate(d.date)}</span>
                  <span className="text-sm font-medium text-foreground">{d.title}</span>
                  <Link href={`/meeting/${d.meetingId}`} className="text-xs text-muted-foreground hover:text-primary">
                    {d.meeting}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </InsightCard>

        <InsightCard icon={Users} title="Who speaks most">
          {data.peopleMentions.length === 0 ? (
            <Empty>Name the speakers on a meeting&apos;s transcript to see them here.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.peopleMentions.map((p) => (
                <li key={p.name} className="flex items-center gap-3" title={`${p.name}: ${p.turns} turns`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-glass-border bg-secondary text-[11px] font-semibold text-secondary-foreground">
                    {p.initials}
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.turns} turns</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(p.turns / maxTurns) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </InsightCard>

        <InsightCard icon={Tags} title="Frequent words">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-2">
            {data.topKeywords.map((k) => {
              const r = k.count / maxKeyword
              return (
                <span
                  key={k.label}
                  title={`${k.count} mentions`}
                  className={
                    r > 0.75
                      ? 'text-2xl font-semibold text-foreground'
                      : r > 0.45
                        ? 'text-xl font-medium text-foreground'
                        : r > 0.25
                          ? 'text-base text-foreground/80'
                          : 'text-sm text-muted-foreground'
                  }
                >
                  {k.label}
                </span>
              )
            })}
          </div>
        </InsightCard>

        <InsightCard icon={Smile} title="Overall tone">
          {data.sentiment ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Positive" value={`${data.sentiment.positive}%`} />
              <Stat label="Neutral" value={`${data.sentiment.neutral}%`} />
              <Stat label="Negative" value={`${data.sentiment.negative}%`} />
            </div>
          ) : (
            <Empty>Tone is estimated by AI — set OPENROUTER_API_KEY to enable it.</Empty>
          )}
        </InsightCard>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass flex flex-col gap-1 rounded-2xl p-4">
      <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Bars({ items }: { items: { label: string; value: number; max: number; suffix: string }[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((t) => (
        <li key={t.label} className="flex flex-col gap-1" title={`${t.label}: ${t.value} ${t.suffix}`}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-foreground">{t.label}</span>
            <span className="text-xs text-muted-foreground">{t.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(t.value / t.max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
