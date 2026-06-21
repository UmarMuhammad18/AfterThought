'use client'

import { useEffect, useState } from 'react'
import { Brain, Clock, Layers, Loader2 } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { MeetingCard } from '@/components/meeting-card'
import { authFetch } from '@/lib/api-client'
import type { Meeting } from '@/lib/data'

const stats = [
  { icon: Layers, label: 'Meetings remembered', value: '128' },
  { icon: Clock, label: 'Hours indexed', value: '94.5' },
  { icon: Brain, label: 'Insights generated', value: '1,402' },
]

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMeetings() {
      try {
        const res = await authFetch('/api/meetings')
        const data = await res.json()
        if (data.ok && data.meetings) {
          setMeetings(data.meetings)
        }
      } catch (err) {
        console.error('Failed to load meetings', err)
      } finally {
        setLoading(false)
      }
    }
    loadMeetings()
  }, [])

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-pink" />
            AI meeting memory engine
          </span>
          <h1 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Every meeting, perfectly remembered.
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Search, summarize, and revisit every conversation. AfterThought turns
            your meetings into a living, queryable memory.
          </p>
        </div>

        <SearchBar size="lg" className="max-w-3xl" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="glass flex items-center gap-3 rounded-2xl p-4"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-glass-border bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="font-heading text-xl font-semibold text-foreground">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Meetings grid */}
      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Recent meetings
          </h2>
          <span className="text-sm text-muted-foreground">
            {meetings.length} meetings
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
