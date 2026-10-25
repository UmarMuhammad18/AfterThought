'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneOff, Mic, MicOff, Loader2, PhoneIncoming } from 'lucide-react'
import { authFetch } from '@/lib/api-client'
import { useAuth } from '@/components/auth-provider'
import { BrowserCall, playRing } from '@/lib/capture/whatsapp-call'
import { SegmentedRecorder } from '@/lib/capture/recorder'

type CallRow = {
  id: string
  invite_id: string | null
  direction: 'USER_INITIATED' | 'BUSINESS_INITIATED'
  peer_phone: string | null
  peer_name: string | null
  status: string
  offer_sdp: string | null
  answer_sdp: string | null
  meeting_id: string | null
  error: string | null
  created_at: string
}

export type InterviewContext = { inviteId?: string; candidate?: string; role?: string; rubric?: string }

export type CallConsoleHandle = {
  /** Place a call to a candidate who has granted permission. */
  call: (phone: string, context: InterviewContext) => Promise<void>
}

function fmt(seconds: number) {
  const s = Math.floor(seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * The browser is the business end of WhatsApp calls: it rings when a
 * candidate calls, answers over WebRTC, and records both sides (You / Them)
 * with a live transcript, exactly like any other AfterThought recording.
 */
export const CallConsole = forwardRef<CallConsoleHandle, { contextFor: (inviteId: string | null) => InterviewContext }>(
  function CallConsole({ contextFor }, ref) {
    const router = useRouter()
    const { getAccessToken } = useAuth()
    const [enabled, setEnabled] = useState<boolean | null>(null)
    const [iceServers, setIceServers] = useState<RTCIceServer[]>([])
    const [ringing, setRinging] = useState<CallRow | null>(null)
    const [active, setActive] = useState<{ id: string; peer: string; context: InterviewContext } | null>(null)
    const [phase, setPhase] = useState<'idle' | 'connecting' | 'live' | 'ending'>('idle')
    const [muted, setMuted] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [levels, setLevels] = useState({ mic: 0, system: 0 })
    const [live, setLive] = useState<{ speaker: string; text: string }[]>([])
    const [error, setError] = useState<string | null>(null)

    const callRef = useRef<BrowserCall | null>(null)
    const recorderRef = useRef<SegmentedRecorder | null>(null)
    const stopRingRef = useRef<(() => void) | null>(null)
    const handledRef = useRef(new Set<string>())

    const startRecording = useCallback(
      async (callId: string, call: BrowserCall, context: InterviewContext, peer: string) => {
        // Overlapping polls may both see the answer; only record once.
        if (recorderRef.current) return
        const recorder = new SegmentedRecorder({
          apiBase: window.location.origin,
          getToken: getAccessToken,
          mode: 'both',
          getSystemStream: () => call.remoteStream(),
          meta: {
            source: 'whatsapp_call',
            title: `WhatsApp call with ${context.candidate || peer}`,
            platform: 'WhatsApp',
            kind: context.rubric || context.inviteId ? 'interview' : 'meeting',
            interview: context.inviteId
              ? { candidate: context.candidate, role: context.role, rubric: context.rubric }
              : undefined,
            consentConfirmed: true, // WhatsApp plays the recording announcement
          },
          onLevels: setLevels,
          onError: setError,
        })
        recorderRef.current = recorder
        const meetingId = await recorder.start()
        await authFetch(`/api/calls/${encodeURIComponent(callId)}/meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId }),
        })
      },
      [getAccessToken],
    )

    const finish = useCallback(
      async (notifyServer: boolean) => {
        const current = active
        if (!current) return
        setPhase('ending')
        if (notifyServer) {
          await authFetch(`/api/calls/${encodeURIComponent(current.id)}/terminate`, { method: 'POST' }).catch(() => undefined)
        }
        callRef.current?.hangup()
        callRef.current = null
        const meetingId = await recorderRef.current?.stop()
        recorderRef.current = null
        setActive(null)
        setPhase('idle')
        setMuted(false)
        if (meetingId) router.push(`/meeting/${meetingId}`)
      },
      [active, router],
    )

    // Poll for incoming calls, answers to our calls, and remote hang-ups.
    useEffect(() => {
      let cancelled = false
      const poll = async () => {
        try {
          const res = await authFetch('/api/calls', { cache: 'no-store' })
          const data = await res.json()
          if (cancelled || !data.ok) return
          setEnabled(data.enabled)
          setIceServers(data.iceServers)
          const calls = data.calls as CallRow[]

          if (!active) {
            const incoming = calls.find(
              (c) => c.direction === 'USER_INITIATED' && c.status === 'ringing' && !handledRef.current.has(c.id),
            )
            setRinging(incoming ?? null)
          } else {
            const row = calls.find((c) => c.id === active.id)
            if (row?.answer_sdp && row.direction === 'BUSINESS_INITIATED' && callRef.current && phase === 'connecting') {
              await callRef.current.applyAnswer(row.answer_sdp)
              setPhase('live')
              await startRecording(active.id, callRef.current, active.context, active.peer)
            }
            if (row && ['ended', 'missed', 'failed', 'rejected'].includes(row.status) && phase !== 'ending') {
              if (row.error) setError(row.error)
              await finish(false)
            }
          }
        } catch {
          /* transient; try again next tick */
        }
      }
      void poll()
      const t = setInterval(poll, active ? 2000 : 1500)
      return () => {
        cancelled = true
        clearInterval(t)
      }
    }, [active, phase, finish, startRecording])

    // Ring (and notify if the tab is in the background) while a call is waiting.
    useEffect(() => {
      if (!ringing) return
      stopRingRef.current = playRing()
      if (typeof Notification !== 'undefined' && document.hidden && Notification.permission === 'granted') {
        new Notification('Incoming WhatsApp call', { body: ringing.peer_name || `+${ringing.peer_phone}` })
      }
      return () => {
        stopRingRef.current?.()
        stopRingRef.current = null
      }
    }, [ringing])

    useEffect(() => {
      if (phase !== 'live') return
      const tick = setInterval(() => setElapsed(recorderRef.current?.elapsedSeconds ?? 0), 500)
      const poll = setInterval(async () => {
        const id = recorderRef.current?.id
        if (!id) return
        const res = await authFetch(`/api/recordings/${id}`).catch(() => null)
        const data = await res?.json().catch(() => null)
        if (data?.ok) setLive(data.transcript ?? [])
      }, 8000)
      return () => {
        clearInterval(tick)
        clearInterval(poll)
      }
    }, [phase])

    async function accept(row: CallRow) {
      if (!row.offer_sdp) return
      handledRef.current.add(row.id)
      setRinging(null)
      setError(null)
      const context = contextFor(row.invite_id)
      const peer = row.peer_name || `+${row.peer_phone}`
      const call = new BrowserCall(iceServers)
      callRef.current = call
      setActive({ id: row.id, peer, context })
      setPhase('connecting')
      try {
        const sdp = await call.answer(row.offer_sdp)
        const res = await authFetch(`/api/calls/${encodeURIComponent(row.id)}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)
        setPhase('live')
        await startRecording(row.id, call, context, peer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not answer the call')
        call.hangup()
        callRef.current = null
        setActive(null)
        setPhase('idle')
      }
    }

    async function decline(row: CallRow) {
      handledRef.current.add(row.id)
      setRinging(null)
      await authFetch(`/api/calls/${encodeURIComponent(row.id)}/reject`, { method: 'POST' })
    }

    useImperativeHandle(ref, () => ({
      call: async (phone, context) => {
        if (active) throw new Error('You are already on a call.')
        setError(null)
        const call = new BrowserCall(iceServers)
        callRef.current = call
        try {
          const sdp = await call.offer()
          const res = await authFetch('/api/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phone, sdp, inviteId: context.inviteId, peerName: context.candidate }),
          })
          const data = await res.json()
          if (!data.ok) throw new Error(data.error)
          setActive({ id: data.id, peer: context.candidate || `+${phone}`, context })
          setPhase('connecting')
        } catch (err) {
          call.hangup()
          callRef.current = null
          throw err
        }
      },
    }))

    if (enabled === false) {
      return (
        <section className="glass flex flex-col gap-2 rounded-2xl p-5 text-sm text-muted-foreground">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <Phone className="size-4 text-primary" /> WhatsApp interview line
          </h2>
          WhatsApp calling isn&apos;t configured on this server yet. Voice-note interviews still work once the WhatsApp
          number is connected. See the README&apos;s WhatsApp section.
        </section>
      )
    }

    return (
      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <Phone className="size-4 text-primary" /> WhatsApp interview line
          </h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`size-2 rounded-full ${enabled ? 'bg-primary' : 'bg-muted-foreground'}`} />
            {enabled === null ? 'Connecting…' : active ? 'On a call' : 'Ready for calls'}
          </span>
        </div>

        {ringing && !active && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <PhoneIncoming className="size-5 animate-pulse text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{ringing.peer_name || `+${ringing.peer_phone}`} is calling</p>
                <p className="text-xs text-muted-foreground">
                  {ringing.invite_id ? `Interview: ${contextFor(ringing.invite_id).role || 'candidate'}` : 'WhatsApp call'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => accept(ringing)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Phone className="size-4" /> Answer
              </button>
              <button type="button" onClick={() => decline(ringing)} className="flex items-center gap-2 rounded-xl border border-glass-border bg-secondary px-4 py-2 text-sm text-foreground hover:text-destructive">
                <PhoneOff className="size-4" /> Decline
              </button>
            </div>
          </div>
        )}

        {active && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{active.peer}</p>
                <p className="text-xs text-muted-foreground">
                  {phase === 'connecting' ? 'Connecting…' : phase === 'ending' ? 'Saving the recording…' : `Live · ${fmt(elapsed)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    callRef.current?.setMuted(!muted)
                    setMuted(!muted)
                  }}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  className="grid size-10 place-items-center rounded-full border border-glass-border bg-secondary text-foreground"
                >
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => finish(true)}
                  disabled={phase === 'ending'}
                  aria-label="Hang up"
                  className="grid size-10 place-items-center rounded-full bg-destructive text-white disabled:opacity-60"
                >
                  {phase === 'ending' ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}
                </button>
              </div>
            </div>
            {phase === 'live' && (
              <div className="flex flex-col gap-2">
                <Meter label="You" value={levels.mic} />
                <Meter label="Them" value={levels.system} />
              </div>
            )}
            {live.length > 0 && (
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto scroll-slim">
                {live.slice(-8).map((l, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{l.speaker}:</span> {l.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {!ringing && !active && (
          <p className="text-sm text-muted-foreground">
            Keep this page open: when a candidate calls your WhatsApp number it rings here. Answer in the browser and
            AfterThought records both sides and scores the interview. WhatsApp tells the caller the call is recorded.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    )
  },
)

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="w-10">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-100 ease-linear"
          style={{ transform: `scaleX(${value.toFixed(2)})` }}
        />
      </div>
    </div>
  )
}
