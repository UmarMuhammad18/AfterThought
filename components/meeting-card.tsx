import Link from 'next/link'
import { Calendar, ArrowRight, ListTodo, Clock, Loader2 } from 'lucide-react'
import type { Meeting } from '@/lib/data'
import { cn } from '@/lib/utils'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web',
  extension: 'Browser',
  desktop: 'Desktop',
  mobile: 'Phone',
  import: 'Imported',
  whatsapp_voice: 'WhatsApp',
  whatsapp_text: 'WhatsApp',
  whatsapp_call: 'WhatsApp call',
}

const STATUS_LABELS: Record<string, string> = {
  recording: 'Recording…',
  processing: 'Processing…',
  failed: 'Failed',
  ready: 'Ready',
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return null
  const m = Math.round(seconds / 60)
  return m < 60 ? `${Math.max(1, m)} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const actionCount = meeting.action_items?.length ?? 0
  const status = meeting.status ?? 'ready'
  const duration = formatDuration(meeting.duration_seconds)
  const label = [
    meeting.kind === 'interview' ? 'Interview' : 'Meeting',
    meeting.platform || (meeting.source ? SOURCE_LABELS[meeting.source] : null),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="lift glass group relative flex flex-col gap-4 rounded-2xl p-5 transition-[translate,border-color,box-shadow] duration-200 ease-snappy hover:-translate-y-0.5 hover:border-primary/30 hover:neon-glow">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            status === 'failed' ? 'text-destructive' : 'text-primary',
          )}
        >
          {(status === 'processing' || status === 'recording') && <Loader2 className="size-3 animate-spin" />}
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <h3 className="text-balance font-heading text-lg font-semibold leading-snug text-foreground">
        {meeting.title}
      </h3>

      {meeting.summary && (
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {meeting.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {formatDate(meeting.created_at)}
        </span>
        {duration && (
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {duration}
          </span>
        )}
        {actionCount > 0 && (
          <span className="flex items-center gap-1.5">
            <ListTodo className="size-3.5" />
            {actionCount} action item{actionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-end pt-2">
        <Link
          href={`/meeting/${meeting.id}`}
          className={cn(
            'pressable inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20',
          )}
        >
          View Summary
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  )
}
