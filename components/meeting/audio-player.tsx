'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pause, Play, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/api-client'

type Part = { seq: number; url: string; start: number; duration: number | null }

export type AudioPlayerHandle = {
  /** Jump to a moment in the whole recording (seconds) and play. */
  seek: (seconds: number) => void
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const mmss = `${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return h ? `${h}:${mmss}` : mmss
}

/**
 * Plays a recording stored as several segment files as if it were one,
 * so transcript lines and search citations can jump to any moment.
 */
export const AudioPlayer = forwardRef<
  AudioPlayerHandle,
  { meetingId: string; totalSeconds?: number; onTime?: (seconds: number) => void }
>(function AudioPlayer({ meetingId, totalSeconds, onTime }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [parts, setParts] = useState<Part[] | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const pendingSeek = useRef<number | null>(null)

  useEffect(() => {
    authFetch(`/api/meeting/${meetingId}/audio`)
      .then((r) => r.json())
      .then((d) => setParts(d.ok ? d.parts : []))
      .catch(() => setParts([]))
  }, [meetingId])

  const partEnd = useCallback(
    (i: number) => {
      if (!parts) return 0
      const p = parts[i]
      if (p.duration != null) return p.start + p.duration
      return parts[i + 1]?.start ?? Infinity
    },
    [parts],
  )

  const seek = useCallback(
    (seconds: number) => {
      if (!parts || parts.length === 0 || !audioRef.current) return
      let i = parts.findIndex((_, k) => seconds < partEnd(k))
      if (i < 0) i = parts.length - 1
      const local = Math.max(0, seconds - parts[i].start)
      if (i !== index) {
        pendingSeek.current = local
        setIndex(i)
      } else {
        audioRef.current.currentTime = local
        void audioRef.current.play()
      }
    },
    [parts, index, partEnd],
  )

  useImperativeHandle(ref, () => ({ seek }), [seek])

  // Load a new part and apply any pending seek once it's ready.
  useEffect(() => {
    const el = audioRef.current
    if (!el || !parts || !parts[index]) return
    el.src = parts[index].url
    const onLoaded = () => {
      if (pendingSeek.current !== null) {
        el.currentTime = pendingSeek.current
        pendingSeek.current = null
        void el.play()
      } else if (playing) {
        void el.play()
      }
    }
    el.addEventListener('loadedmetadata', onLoaded, { once: true })
    el.load()
    return () => el.removeEventListener('loadedmetadata', onLoaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, index])

  if (parts === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading audio…
      </div>
    )
  }
  if (parts.length === 0) return null

  const total = totalSeconds || partEnd(parts.length - 1) || 0

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          const el = audioRef.current
          if (!el) return
          if (el.paused) void el.play()
          else el.pause()
        }}
        aria-label={playing ? 'Pause' : 'Play'}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={Number.isFinite(total) ? total : 0}
        step={1}
        value={time}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        className="flex-1 accent-[var(--primary)]"
      />
      <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
        {fmt(time)} / {Number.isFinite(total) ? fmt(total) : '--:--'}
      </span>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const t = parts[index].start + e.currentTarget.currentTime
          setTime(t)
          onTime?.(t)
        }}
        onEnded={() => {
          if (index < parts.length - 1) {
            pendingSeek.current = 0
            setIndex(index + 1)
          } else {
            setPlaying(false)
          }
        }}
        className="hidden"
      />
    </div>
  )
})
