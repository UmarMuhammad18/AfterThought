'use client'

import { Users, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

// Placeholder data for scaffolding
const placeholderSpeakers = [
  { id: '1', name: 'Maya Chen', mentions: 48, actionItemsCount: 5 },
  { id: '2', name: 'Devon Park', mentions: 39, actionItemsCount: 3 },
]

export default function SpeakersPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="size-8 text-primary" />
          Speaker Profiles
        </h1>
        <p className="text-muted-foreground">
          Profiles, mentions, and action items for everyone in your network.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {placeholderSpeakers.length > 0 ? (
          placeholderSpeakers.map((speaker) => (
            <Link key={speaker.id} href={`/speakers/${speaker.id}`} className="glass group rounded-2xl p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="grid size-10 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground border border-glass-border">
                  {speaker.name.substring(0, 2).toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">{speaker.mentions} mentions</span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{speaker.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{speaker.actionItemsCount} action items</p>
            </Link>
          ))
        ) : (
          <div className="col-span-full glass p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <AlertTriangle className="size-8 opacity-50" />
            <p>No speakers found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
