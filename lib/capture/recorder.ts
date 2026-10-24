/**
 * Framework-free segmented recorder shared by the web app, the browser
 * extension and the desktop app (bundled with esbuild for the latter two).
 *
 * - Captures the microphone, the "other side" (a tab, a window, or the whole
 *   system's audio), or both.
 * - With both, records stereo: LEFT = you (mic), RIGHT = them (call audio), so
 *   the server can label speakers reliably without guessing.
 * - Rotates into a fresh, self-contained audio file every `segmentSeconds`
 *   and uploads each one in the background with retries. Long calls never hit
 *   size limits, the transcript builds up while you talk, and a crash only
 *   loses the current segment.
 */

import type { SegmentStore } from "./segment-store"

export type CaptureMode = "mic" | "system" | "both"

export type RecorderState = "idle" | "starting" | "recording" | "paused" | "finishing" | "done" | "error"

export type RecordingMeta = {
  source: "web" | "extension" | "desktop" | "mobile" | "whatsapp_call"
  title?: string
  platform?: string
  kind?: "meeting" | "interview"
  interview?: { candidate?: string; role?: string; rubric?: string }
  consentConfirmed?: boolean
}

export type RecorderOptions = {
  apiBase: string
  getToken: () => Promise<string | null>
  mode: CaptureMode
  meta: RecordingMeta
  /** Provide the call-audio stream (tab capture, Electron loopback, ...). Defaults to getDisplayMedia. */
  getSystemStream?: () => Promise<MediaStream>
  micDeviceId?: string
  /** Play captured call audio back to the user (needed when capture mutes the source, e.g. chrome.tabCapture). */
  monitorSystemAudio?: boolean
  segmentSeconds?: number
  /** Keep segments on the device until uploaded (IndexedDB), so nothing is lost if the page dies. */
  store?: SegmentStore
  onState?: (state: RecorderState) => void
  onError?: (message: string) => void
  onLevels?: (levels: { mic: number; system: number }) => void
  onUpload?: (info: { seq: number; pending: number }) => void
}

export class RecorderError extends Error {}

const DEFAULT_SEGMENT_SECONDS = 120

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** Whether this browser can capture audio from tabs / other apps. */
export function canCaptureSystemAudio(): boolean {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return false
  if (isMobileDevice()) return false
  // Safari implements getDisplayMedia but never returns audio.
  const ua = navigator.userAgent
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)
  return typeof navigator.mediaDevices.getDisplayMedia === "function" && !isSafari
}

/** Ask the user to pick a tab / window / screen and share its audio. */
export async function getDisplayAudioStream(): Promise<MediaStream> {
  const constraints = {
    video: true, // required by the API; the video track is never recorded
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    systemAudio: "include",
    selfBrowserSurface: "exclude",
    surfaceSwitching: "include",
  } as DisplayMediaStreamOptions
  const stream = await navigator.mediaDevices.getDisplayMedia(constraints)
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop())
    throw new RecorderError(
      "No audio was shared. Pick the call's tab and tick “Share tab audio” (or “Share system audio” for the whole screen).",
    )
  }
  return stream
}

type PendingUpload = {
  seq: number
  blob: Blob
  start: number
  duration: number
  attempts: number
  /** Resolves once the local backup is written (so it's never deleted before it exists). */
  saved?: Promise<void>
}

export class SegmentedRecorder {
  private opts: RecorderOptions
  private state: RecorderState = "idle"
  private meetingId: string | null = null

  private ctx: AudioContext | null = null
  private streams: MediaStream[] = []
  private output: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private mimeType = ""
  private rotateTimer: ReturnType<typeof setInterval> | null = null
  private levelTimer: ReturnType<typeof setInterval> | null = null
  private wakeLock: { release: () => Promise<void> } | null = null

  private seq = 0
  private segmentStartedAt = 0
  private elapsedBeforeSegment = 0
  private queue: PendingUpload[] = []
  private uploading = false
  private drainWaiters: (() => void)[] = []

  constructor(opts: RecorderOptions) {
    this.opts = opts
  }

  get id() {
    return this.meetingId
  }

  get currentState() {
    return this.state
  }

  /** Seconds recorded so far (excluding pauses). */
  get elapsedSeconds(): number {
    const running = this.state === "recording" ? (performance.now() - this.segmentStartedAt) / 1000 : 0
    return this.elapsedBeforeSegment + running
  }

  get pendingUploads() {
    return this.queue.length + (this.uploading ? 1 : 0)
  }

  async start(): Promise<string> {
    if (this.state !== "idle") throw new RecorderError("Recorder already started")
    this.setState("starting")

    try {
      const { mic, system } = await this.openStreams()
      const layout = mic && system ? "me-them" : "mixed"
      this.output = this.buildMix(mic, system)

      this.mimeType = pickMimeType()
      this.meetingId = await this.createRecording(layout)
      await this.persist(() =>
        this.opts.store!.putRecording({ meetingId: this.meetingId!, apiBase: this.opts.apiBase, updatedAt: Date.now() }),
      )

      // If the user stops sharing from the browser UI, finish gracefully.
      system?.getAudioTracks().forEach((t) => t.addEventListener("ended", () => void this.stop()))

      this.startSegment()
      this.rotateTimer = setInterval(
        () => this.rotate(),
        (this.opts.segmentSeconds ?? DEFAULT_SEGMENT_SECONDS) * 1000,
      )
      await this.acquireWakeLock()
      this.setState("recording")
      return this.meetingId
    } catch (err) {
      this.cleanup()
      this.setState("error")
      throw err instanceof RecorderError ? err : new RecorderError(describeMediaError(err))
    }
  }

  pause() {
    if (this.state !== "recording" || !this.recorder) return
    this.recorder.pause()
    this.elapsedBeforeSegment += (performance.now() - this.segmentStartedAt) / 1000
    this.setState("paused")
  }

  resume() {
    if (this.state !== "paused" || !this.recorder) return
    this.recorder.resume()
    this.segmentStartedAt = performance.now()
    this.setState("recording")
  }

  /** Stop recording, flush every segment, and start server-side processing. */
  async stop(): Promise<string | null> {
    if (this.state !== "recording" && this.state !== "paused") return this.meetingId
    this.setState("finishing")
    if (this.rotateTimer) clearInterval(this.rotateTimer)
    await this.stopSegment()
    this.cleanup()
    await this.drain()

    try {
      await this.api(`/api/recordings/${this.meetingId}/finish`, { method: "POST", body: "{}" })
      await Promise.all(this.backups)
      await this.persist(() => this.opts.store!.deleteRecording(this.meetingId!))
      this.setState("done")
    } catch (err) {
      this.setState("error")
      this.opts.onError?.(err instanceof Error ? err.message : "Could not finish recording")
    }
    return this.meetingId
  }

  /** Abandon the recording without processing it. */
  cancel() {
    if (this.rotateTimer) clearInterval(this.rotateTimer)
    try {
      this.recorder?.stop()
    } catch {
      /* already stopped */
    }
    this.queue = []
    this.cleanup()
    this.setState("idle")
  }

  // -------------------------------------------------------------------------

  private setState(s: RecorderState) {
    this.state = s
    this.opts.onState?.(s)
  }

  private async openStreams(): Promise<{ mic: MediaStream | null; system: MediaStream | null }> {
    let system: MediaStream | null = null
    let mic: MediaStream | null = null

    if (this.opts.mode !== "mic") {
      system = await (this.opts.getSystemStream ?? getDisplayAudioStream)()
      this.streams.push(system)
    }
    if (this.opts.mode !== "system") {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.opts.micDeviceId ? { exact: this.opts.micDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      this.streams.push(mic)
    }
    return { mic, system }
  }

  /** Mix sources into one stream: stereo me/them, or mono passthrough. */
  private buildMix(mic: MediaStream | null, system: MediaStream | null): MediaStream {
    const ctx = new AudioContext()
    this.ctx = ctx
    const dest = ctx.createMediaStreamDestination()
    const analysers: { mic?: AnalyserNode; system?: AnalyserNode } = {}

    const monoFrom = (stream: MediaStream) => {
      const src = ctx.createMediaStreamSource(stream)
      const mono = ctx.createGain()
      mono.channelCount = 1
      mono.channelCountMode = "explicit"
      mono.channelInterpretation = "speakers"
      src.connect(mono)
      return { src, mono }
    }

    if (mic && system) {
      dest.channelCount = 2
      const merger = ctx.createChannelMerger(2)
      const m = monoFrom(mic)
      const s = monoFrom(system)
      m.mono.connect(merger, 0, 0) // left = you
      s.mono.connect(merger, 0, 1) // right = them
      merger.connect(dest)
      analysers.mic = attachAnalyser(ctx, m.mono)
      analysers.system = attachAnalyser(ctx, s.mono)
      if (this.opts.monitorSystemAudio) s.src.connect(ctx.destination)
    } else {
      const only = (mic ?? system)!
      const n = monoFrom(only)
      n.mono.connect(dest)
      const a = attachAnalyser(ctx, n.mono)
      if (mic) analysers.mic = a
      else {
        analysers.system = a
        if (this.opts.monitorSystemAudio) n.src.connect(ctx.destination)
      }
    }

    if (this.opts.onLevels) {
      const buf = new Uint8Array(256)
      const level = (a?: AnalyserNode) => {
        if (!a) return 0
        a.getByteTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
        return Math.min(1, peak / 100)
      }
      this.levelTimer = setInterval(
        () => this.opts.onLevels?.({ mic: level(analysers.mic), system: level(analysers.system) }),
        120,
      )
    }

    return dest.stream
  }

  private startSegment() {
    if (!this.output) return
    const chunks: Blob[] = []
    const seq = this.seq++
    const start = this.elapsedBeforeSegment
    const rec = this.mimeType
      ? new MediaRecorder(this.output, { mimeType: this.mimeType, audioBitsPerSecond: 48_000 })
      : new MediaRecorder(this.output)
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    rec.onstop = () => {
      const duration = Math.max(0, this.elapsedBeforeSegmentAt(rec) - start)
      const blob = new Blob(chunks, { type: rec.mimeType || this.mimeType || "audio/webm" })
      if (blob.size > 0) this.enqueue({ seq, blob, start, duration, attempts: 0 })
    }
    this.recorder = rec
    this.segmentStartedAt = performance.now()
    rec.start(1000)
  }

  private segmentEnds = new WeakMap<MediaRecorder, number>()

  private elapsedBeforeSegmentAt(rec: MediaRecorder): number {
    return this.segmentEnds.get(rec) ?? this.elapsedBeforeSegment
  }

  private stopSegment(): Promise<void> {
    const rec = this.recorder
    if (!rec || rec.state === "inactive") return Promise.resolve()
    if (rec.state === "recording") {
      this.elapsedBeforeSegment += (performance.now() - this.segmentStartedAt) / 1000
    }
    this.segmentEnds.set(rec, this.elapsedBeforeSegment)
    return new Promise((resolve) => {
      rec.addEventListener("stop", () => resolve(), { once: true })
      rec.stop()
    })
  }

  private async rotate() {
    if (this.state !== "recording" && this.state !== "paused") return
    // Heartbeat (also while paused): tells other tabs this recording is still alive.
    void this.persist(() =>
      this.opts.store!.putRecording({ meetingId: this.meetingId!, apiBase: this.opts.apiBase, updatedAt: Date.now() }),
    )
    if (this.state !== "recording") return
    await this.stopSegment()
    this.startSegment()
  }

  /** Storage is best effort: a failing IndexedDB must never break recording. */
  private async persist(fn: () => Promise<void>) {
    if (!this.opts.store) return
    try {
      await fn()
    } catch (err) {
      console.warn("[recorder] local backup failed:", err)
    }
  }

  private backups: Promise<void>[] = []

  private enqueue(item: PendingUpload) {
    item.saved = this.persist(() =>
      this.opts.store!.putSegment({
        meetingId: this.meetingId!,
        seq: item.seq,
        blob: item.blob,
        start: item.start,
        duration: item.duration,
      }),
    )
    this.backups.push(item.saved)
    this.queue.push(item)
    void this.pump()
  }

  private async pump() {
    if (this.uploading) return
    this.uploading = true
    while (this.queue.length > 0) {
      const item = this.queue[0]
      try {
        await this.api(`/api/recordings/${this.meetingId}/segments/${item.seq}`, {
          method: "PUT",
          body: item.blob,
          headers: {
            "Content-Type": item.blob.type || "audio/webm",
            "X-Start-Seconds": item.start.toFixed(2),
            "X-Duration-Seconds": item.duration.toFixed(2),
          },
        })
        this.queue.shift()
        void item.saved?.then(() => this.persist(() => this.opts.store!.deleteSegment(this.meetingId!, item.seq)))
        this.opts.onUpload?.({ seq: item.seq, pending: this.queue.length })
      } catch (err) {
        item.attempts++
        if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 429) {
          // Not retryable (bad request, too large, finished). Drop and report.
          this.queue.shift()
          this.opts.onError?.(`Segment ${item.seq + 1} was rejected: ${err.message}`)
          continue
        }
        // Network trouble: back off and keep trying (offline-tolerant).
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(item.attempts, 5))
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    this.uploading = false
    this.drainWaiters.splice(0).forEach((r) => r())
  }

  private drain(): Promise<void> {
    if (!this.uploading && this.queue.length === 0) return Promise.resolve()
    return new Promise((resolve) => this.drainWaiters.push(resolve))
  }

  private async createRecording(layout: "mixed" | "me-them"): Promise<string> {
    const res = await this.api("/api/recordings", {
      method: "POST",
      body: JSON.stringify({ ...this.opts.meta, layout }),
    })
    if (!res.id) throw new RecorderError("Server did not return a recording id")
    return res.id as string
  }

  private async api(path: string, init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }) {
    const token = await this.opts.getToken()
    if (!token) throw new RecorderError("You're not signed in. Add your API key or sign in again.")
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) }
    if (typeof init.body === "string") headers["Content-Type"] = "application/json"
    const res = await fetch(this.opts.apiBase.replace(/\/$/, "") + path, { ...init, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ok === false) {
      throw new HttpError(res.status, data.error || `Request failed (${res.status})`)
    }
    return data
  }

  private async acquireWakeLock() {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }
      this.wakeLock = (await nav.wakeLock?.request("screen")) ?? null
    } catch {
      // Not supported or denied: recording still works, the screen may just sleep.
    }
  }

  private cleanup() {
    if (this.levelTimer) clearInterval(this.levelTimer)
    this.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    this.streams = []
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    void this.wakeLock?.release().catch(() => undefined)
    this.wakeLock = null
  }
}

class HttpError extends RecorderError {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function attachAnalyser(ctx: AudioContext, node: AudioNode): AnalyserNode {
  const a = ctx.createAnalyser()
  a.fftSize = 256
  node.connect(a)
  return a
}

function describeMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Permission was denied. Allow microphone / screen sharing and try again."
    if (err.name === "NotFoundError") return "No microphone was found."
    if (err.name === "NotReadableError") return "The microphone is in use by another app."
  }
  return err instanceof Error ? err.message : "Could not start recording."
}
