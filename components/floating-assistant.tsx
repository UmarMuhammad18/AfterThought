'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Mic, GripVertical, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/api-client'

type Source = { meetingId: string; meetingTitle: string; timestamp?: string; start?: number }

export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [busy, setBusy] = useState(false)
  const pathname = usePathname()
  // On a meeting page, questions go to that meeting; elsewhere, across all.
  const meetingId = pathname.match(/^\/meeting\/([^/]+)/)?.[1]

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setBusy(true)
    try {
      const res = await authFetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, meetingId }),
      })
      const data = await res.json()
      setAnswer(data.answer || data.error || 'No answer found.')
      setSources(Array.isArray(data.results) ? data.results.slice(0, 3) : [])
    } catch {
      setAnswer('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(
    null,
  )

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    })
  }
  function onPointerUp() {
    dragRef.current = null
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Expanded panel */}
      <div
        className={cn(
          'glass-neon mb-3 w-[min(90vw,22rem)] origin-bottom-right overflow-hidden rounded-2xl transition-all duration-300',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <span className="font-heading text-sm font-semibold">AfterThought AI</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex max-h-[22rem] flex-col gap-3 overflow-y-auto scroll-slim p-4">
          {answer ? (
            <>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{answer}</p>
              {sources.map((src, i) => (
                <Link
                  key={i}
                  href={`/meeting/${src.meetingId}${src.start != null ? `?t=${Math.floor(src.start)}` : ''}`}
                  className="text-xs text-primary hover:underline"
                >
                  {src.meetingTitle}
                  {src.timestamp ? ` · ${src.timestamp}` : ''}
                </Link>
              ))}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {meetingId
                ? 'Ask anything about this conversation.'
                : 'Ask anything across all your conversations — decisions, promises, what a candidate said.'}
            </p>
          )}
          <Link
            href="/record"
            className="flex w-fit items-center gap-2 rounded-xl border border-glass-border bg-secondary px-3 py-2 text-sm text-foreground hover:text-primary"
          >
            <Mic className="size-4" /> Record now
          </Link>
        </div>

        <form
          onSubmit={ask}
          className="flex items-center gap-2 border-t border-glass-border p-3"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={meetingId ? 'Ask about this conversation…' : 'Ask about any conversation…'}
            aria-label="Ask the assistant"
            className="h-10 w-full rounded-xl border border-glass-border bg-glass px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>

      {/* Collapsed bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label={open ? 'Close assistant' : 'Open AI assistant'}
        className={cn(
          'glass-neon group relative grid size-14 cursor-grab touch-none place-items-center rounded-full transition-all hover:scale-105 active:cursor-grabbing',
          !open && 'neon-glow',
        )}
      >
        <GripVertical className="absolute left-0.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
        <Sparkles className="size-6 text-primary" />
      </button>
    </div>
  )
}
