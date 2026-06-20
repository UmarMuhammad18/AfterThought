import Link from 'next/link'
import { Calendar, ArrowRight, ListTodo } from 'lucide-react'
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

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const actionCount = meeting.action_items?.length ?? 0

  return (
    <article className="glass group relative flex flex-col gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:neon-glow">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Meeting
        </span>
        <span className="text-xs text-primary">Recorded</span>
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
        {actionCount > 0 && (
          <span className="flex items-center gap-1.5">
            <ListTodo className="size-3.5" />
            {actionCount} action item{actionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-end pt-2">
        <Link
          href={`/recording/${meeting.id}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20',
          )}
        >
          View Summary
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  )
}
