'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Clock, Layers, Loader2, Mic } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { MeetingCard } from '@/components/meeting-card'
import { authFetch } from '@/lib/api-client'
import type { Meeting } from '@/lib/data'

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ meetings: 0, hours: 0, actionItems: 0 })

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
    authFetch('/api/insights')
      .then((r) => r.json())
      .then((d) => d.ok && setTotals(d.totals))
      .catch(() => undefined)
  }, [])

  // Keep cards for in-progress recordings fresh.
  useEffect(() => {
    if (!meetings.some((m) => m.status === 'processing' || m.status === 'recording')) return
    const t = setInterval(async () => {
      const res = await authFetch('/api/meetings')
      const data = await res.json()
      if (data.ok) setMeetings(data.meetings)
    }, 5000)
    return () => clearInterval(t)
  }, [meetings])

  const stats = [
    { icon: Layers, label: 'Conversations remembered', value: totals.meetings.toLocaleString() },
    { icon: Clock, label: 'Hours recorded', value: totals.hours.toLocaleString() },
    { icon: Brain, label: 'Action items captured', value: totals.actionItems.toLocaleString() },
  ]

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-pink" />
            Any call · any device
          </span>
          <h1 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Every conversation, remembered.
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Record calls on WhatsApp, Zoom, Meet, Teams, the phone or in person —
            then search, summarise and revisit all of them in one place.
          </p>
        </div>

        <div className="flex max-w-3xl flex-col gap-3 sm:flex-row">
          <SearchBar size="lg" className="flex-1" />
          <Link
            href="/record"
            className="pressable flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Mic className="size-4" /> Record
          </Link>
        </div>

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
            {meetings.length} conversation{meetings.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">Nothing recorded yet.</p>
            <Link href="/record" className="pressable rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              Record your first conversation
            </Link>
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
