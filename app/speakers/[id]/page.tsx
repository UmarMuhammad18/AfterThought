'use client'

import { use } from 'react'
import { User, ListTodo, Hash } from 'lucide-react'

// Placeholder data for scaffolding
const placeholderSpeakerDetails = {
  name: 'Maya Chen',
  mentionsCount: 48,
  meetingsCount: 12,
  actionItems: [
    'Finalize the roadmap one-pager',
    'Follow up with the client',
  ],
  topMentions: ['Q3 beta', 'design layout'],
}

export default function SpeakerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const data = placeholderSpeakerDetails

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <header className="flex items-center gap-5 glass p-6 rounded-2xl">
        <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary font-heading text-2xl font-bold border border-primary/20">
          {data.name.substring(0, 2).toUpperCase()}
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold text-foreground">{data.name}</h1>
          <p className="text-sm text-muted-foreground">Speaker ID: {id}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-2xl flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <Hash className="size-5 text-primary" /> Key Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{data.meetingsCount}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Meetings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{data.mentionsCount}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Mentions</span>
            </div>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <ListTodo className="size-5 text-primary" /> Action Items
          </h2>
          <ul className="flex flex-col gap-2">
            {data.actionItems.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
