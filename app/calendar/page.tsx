'use client'

import { Calendar, Clock, AlertTriangle } from 'lucide-react'

// Placeholder data for scaffolding
const placeholderEvents = [
  { id: '1', title: 'Follow up with the client', date: 'Jul 24, 2026', time: '10:00 AM', assignee: 'Maya Chen', meetingId: 'meeting-123' },
  { id: '2', title: 'Prepare the proposal', date: 'Jul 25, 2026', time: '2:00 PM', assignee: 'Devon Park', meetingId: 'meeting-124' },
]

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Calendar className="size-8 text-primary" />
          Calendar Events
        </h1>
        <p className="text-muted-foreground">
          Action items mapped to your schedule.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {placeholderEvents.length > 0 ? (
          placeholderEvents.map((event) => (
            <div key={event.id} className="glass flex items-center justify-between gap-4 rounded-2xl p-5">
              <div className="flex flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold text-foreground">{event.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {event.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="size-4" /> {event.time}</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{event.assignee}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <AlertTriangle className="size-8 opacity-50" />
            <p>No upcoming events found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
