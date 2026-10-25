'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, FileText, ArrowUpRight, Quote } from 'lucide-react'
import { SearchBar } from '@/components/search-bar'
import { GlassPanel } from '@/components/glass-panel'
import { examplePrompts } from '@/lib/data'
import { authFetch } from '@/lib/api-client'

type SearchResult = {
  text: string
  speaker?: string
  timestamp?: string
  start?: number
  meetingId?: string
  meetingTitle?: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [answer, setAnswer] = useState('')

  async function runSearch(value: string) {
    if (!value.trim()) return

    setQuery(value)
    setSubmitted(true)
    setIsSearching(true)

    try {
      const response = await authFetch(`/api/search?q=${encodeURIComponent(value)}`)
      const data = await response.json()
      setAnswer(data.answer || data.error || '')
      setSearchResults(Array.isArray(data.results) ? (data.results as SearchResult[]) : [])
    } catch (error) {
      console.error('Search request failed', error)
      setAnswer('Search failed. Please try again.')
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
            <p className="whitespace-pre-line text-pretty leading-relaxed text-foreground">
              {isSearching ? 'Searching your meeting memory…' : answer || 'No answer found.'}
            </p>
          </GlassPanel>

          {!isSearching && searchResults.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-sm text-muted-foreground">Sources — click to hear the moment</span>
              {searchResults.map((c, index) => (
                <Link
                  key={`${c.meetingId}-${index}`}
                  href={c.meetingId ? `/meeting/${c.meetingId}${c.start != null ? `?t=${Math.floor(c.start)}` : ''}` : '/dashboard'}
                  className="glass group flex flex-col gap-2 rounded-2xl p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{c.meetingTitle ?? 'Meeting'}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {c.speaker && <span>{c.speaker}</span>}
                      {c.timestamp && <span className="font-mono">{c.timestamp}</span>}
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                  <p className="flex gap-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                    {c.text}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
