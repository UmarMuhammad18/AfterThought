'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, FileText, ArrowUpRight, Quote } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { GlassPanel } from '@/components/glass-panel'
import { examplePrompts } from '@/lib/data'

type SearchResult = {
  type: string
  text: string
  speaker?: string
  category?: string
  meetingId?: string
}

const sampleAnswer = {
  text: 'The team decided on a usage-based pricing tier layered on top of a flat team plan. This tested best with the Northwind account during customer discovery, and pricing will be revisited before the public launch readiness review on Jul 15.',
  highlights: ['usage-based pricing tier', 'flat team plan', 'Jul 15'],
  citations: [
    {
      meeting: 'Go-To-Market Planning',
      id: 'gtm-planning',
      timestamp: '04:51',
      quote: 'A usage-based tier on top of a flat team plan tested best with Northwind.',
    },
    {
      meeting: 'Customer Discovery — Northwind',
      id: 'customer-discovery',
      timestamp: '11:20',
      quote: 'People want answers fast — willingness to pay tracks with relevance.',
    },
  ],
}

function highlight(text: string, terms: string[]) {
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(regex).map((part, i) =>
    terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} className="rounded bg-primary/15 px-1 font-medium text-primary">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  async function runSearch(value: string) {
    if (!value.trim()) return

    setQuery(value)
    setSubmitted(true)
    setIsSearching(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      const data = await response.json()
      const results = Array.isArray(data.results)
        ? (data.results as SearchResult[])
        : []
      setSearchResults(results)
    } catch (error) {
      console.error('Search request failed', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col items-center gap-4 pt-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl border border-glass-border bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </span>
        <h1 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground">
          Ask anything about your meetings
        </h1>
        <p className="text-pretty text-muted-foreground">
          Natural-language search across every transcript, decision, and action
          item you have ever recorded.
        </p>
      </div>

      <SearchBar
        size="lg"
        autoFocus
        value={query}
        onChange={setQuery}
        onSubmit={(v) => runSearch(v)}
      />

      {!submitted && (
        <div className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">Try asking</span>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((p) => (
              <button
                key={p}
                onClick={() => runSearch(p)}
                className="glass rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {submitted && (
        <div className="flex flex-col gap-4">
          {/* AI answer */}
          <GlassPanel neon className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              AI Answer
            </div>
            <p className="text-pretty leading-relaxed text-foreground">
              {isSearching
                ? 'Searching your meeting memory…'
                : highlight(sampleAnswer.text, sampleAnswer.highlights)}
            </p>
          </GlassPanel>

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-sm text-muted-foreground">Related results</span>
              <div className="flex flex-col gap-2">
                {searchResults.map((result, index) => (
                  <Link
                    key={`${result.text}-${index}`}
                    href={result.meetingId ? `/meeting/${result.meetingId}` : '/dashboard'}
                    className="glass rounded-2xl p-4 transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-primary">
                        {result.type}
                      </span>
                      {result.speaker && (
                        <span className="text-xs text-muted-foreground">
                          {result.speaker}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {result.text}
                    </p>
                    {result.category && (
                      <span className="mt-2 inline-block text-xs text-muted-foreground">
                        {result.category}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          <div className="flex flex-col gap-3">
            <span className="text-sm text-muted-foreground">
              Citations &amp; sources
            </span>
            {sampleAnswer.citations.map((c) => (
              <Link
                key={c.id}
                href={`/meeting/${c.id}`}
                className="glass group flex flex-col gap-2 rounded-2xl p-4 transition-all hover:border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="size-4 text-primary" />
                    {c.meeting}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{c.timestamp}</span>
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
                <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                  {c.quote}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
