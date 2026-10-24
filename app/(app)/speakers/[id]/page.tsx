'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ListTodo, Hash, Loader2, MessagesSquare } from 'lucide-react'
import { authFetch } from '@/lib/api-client'

type SpeakerDetail = {
  speaker: { id: string; name: string; mentions: number | null; action_items: string[] | null }
  meetings: { id: string; title: string; created_at: string; kind: string | null }[]
}

export default function SpeakerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<SpeakerDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch(`/api/speakers/${id}`)
      .then((r) => r.json())
      .then((d) => d.ok && setData(d))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!data) return <div className="mt-20 text-center text-destructive">Speaker not found.</div>

  const { speaker, meetings } = data
  const actionItems = speaker.action_items ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="glass flex items-center gap-5 rounded-2xl p-6">
        <span className="grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/10 font-heading text-2xl font-bold text-primary">
          {speaker.name.substring(0, 2).toUpperCase()}
        </span>
        <h1 className="font-heading text-3xl font-bold text-foreground">{speaker.name}</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass flex flex-col gap-4 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <Hash className="size-5 text-primary" /> Key stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{meetings.length}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Conversations</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{speaker.mentions ?? 0}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Speaking turns</span>
            </div>
          </div>
        </div>

        <div className="glass flex flex-col gap-4 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <ListTodo className="size-5 text-primary" /> Action items
          </h2>
          {actionItems.length ? (
            <ul className="flex flex-col gap-2">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No action items assigned.</p>
          )}
        </div>
      </div>

      <div className="glass flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <MessagesSquare className="size-5 text-primary" /> Conversations
        </h2>
        {meetings.map((m) => (
          <Link key={m.id} href={`/meeting/${m.id}`} className="flex items-center justify-between gap-3 rounded-xl p-2 text-sm hover:bg-secondary/60">
            <span className="truncate text-foreground">
              {m.kind === 'interview' && <span className="mr-2 text-xs text-primary">Interview</span>}
              {m.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
