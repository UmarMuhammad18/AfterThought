'use client'

import { use, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/meeting/${id}`, {
          cache: "no-store",
        })

        if (!res.ok) {
          setError(true)
          return
        }

        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Failed to load recording:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center text-red-500 mt-20">
        Failed to load recording.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">

      {/* Header */}
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {data.title || 'Recording Summary'}
        </h1>
        <p className="text-sm text-muted-foreground">Recording ID: {id}</p>
      </header>

      {/* Summary */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-3">📝 Summary</h2>
        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
          {data.summary || "No summary available."}
        </p>
      </section>

      {/* Action Items */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-3">📌 Action Items</h2>
        {data.action_items?.length ? (
          <ul className="flex flex-col gap-2.5">
            {data.action_items.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No action items detected.</p>
        )}
      </section>

      {/* Transcript */}
      <section className="glass rounded-2xl p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-3">💬 Transcript</h2>
        {data.segments?.length ? (
          <div className="space-y-3">
            {data.segments.map((seg: any, i: number) => (
              <div key={i} className="glass rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-1">{seg.speaker}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{seg.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Transcript not available.</p>
        )}
      </section>

    </div>
  )
}
