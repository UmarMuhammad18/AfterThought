'use client'

import { useRef, useState } from 'react'
import {
  Sparkles,
  X,
  Send,
  Radio,
  ListTodo,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const liveTranscript = [
  { speaker: 'Maya', text: 'Let us lock the beta scope before Friday.' },
  { speaker: 'Devon', text: 'I will own real-time indexing this sprint.' },
  { speaker: 'Lina', text: 'Mind-map specs are ready for review.' },
]

const liveActions = [
  'Finalize roadmap one-pager — Maya',
  'Spike on transcript indexing — Devon',
  'Deliver mind-map specs — Lina',
]

export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
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

        <div className="flex max-h-[22rem] flex-col gap-4 overflow-y-auto scroll-slim p-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Radio className="size-3.5 text-primary" />
              Live transcript
              <span className="ml-1 size-1.5 animate-pulse rounded-full bg-pink" />
            </div>
            <div className="flex flex-col gap-2">
              {liveTranscript.map((l, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{l.speaker}:</span>{' '}
                  {l.text}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-glass-border pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListTodo className="size-3.5 text-primary" />
              Live action items
            </div>
            <ul className="flex flex-col gap-2">
              {liveActions.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 border-t border-glass-border p-3"
        >
          <input
            placeholder="Ask about this meeting…"
            aria-label="Ask the assistant"
            className="h-10 w-full rounded-xl border border-glass-border bg-glass px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Send className="size-4" />
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
        {/* pink notification micro-dot ONLY */}
        {!open && (
          <span className="absolute right-3 top-3 size-2 rounded-full bg-pink ring-2 ring-background" />
        )}
      </button>
    </div>
  )
}
