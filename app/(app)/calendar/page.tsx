'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, AlertTriangle, Loader2, Download } from 'lucide-react'
import { authFetch } from '@/lib/api-client'

type EventRow = {
  id: string
  title: string
  due_date?: string
  assignee?: string
  meeting_id?: string
}

type DisplayEvent = {
  id: string
  title: string
  date: string
  time: string
  assignee: string
  meetingId: string
}

function formatEvent(e: EventRow): DisplayEvent {
  const due = e.due_date ? new Date(e.due_date) : null
  const valid = due && !Number.isNaN(due.getTime())
  return {
    id: e.id,
    title: e.title,
    date: valid ? due!.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date',
    time: valid ? due!.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '',
    assignee: e.assignee ?? 'Unassigned',
    meetingId: e.meeting_id ?? '',
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<DisplayEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/api/calendar')
        const data = await res.json()
        if (data.ok && Array.isArray(data.events)) {
          setEvents(data.events.map(formatEvent))
        }
      } catch (err) {
        console.error('Failed to load calendar events', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function downloadIcs() {
    const res = await authFetch('/api/calendar/ics')
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = 'afterthought-action-items.ics'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="size-8 text-primary" />
          Calendar Events
        </h1>
        <p className="text-muted-foreground">
          Action items with deadlines, pulled from your conversations.
        </p>
        {events.some((e) => e.date !== 'No date') && (
          <button
            type="button"
            onClick={downloadIcs}
            className="flex w-fit items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground hover:text-primary"
          >
            <Download className="size-4" /> Add all to my calendar (.ics)
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="glass flex items-center justify-between gap-4 rounded-2xl p-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{event.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {event.date}</span>
                    {event.time && <span className="flex items-center gap-1.5"><Clock className="size-4" /> {event.time}</span>}
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{event.assignee}</span>
                  </div>
                  {event.meetingId && (
                    <Link href={`/meeting/${event.meetingId}`} className="text-xs text-primary hover:underline">
                      View conversation
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="glass p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertTriangle className="size-8 opacity-50" />
              <p>No action items yet. They appear here after you record a conversation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
