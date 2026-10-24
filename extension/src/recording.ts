// Extension recorder page. Bundled by scripts/build.js into dist/recording.js.
// Captures the call tab with chrome.tabCapture (both sides of the call) plus
// the microphone, and streams segments to AfterThought via the shared recorder.

import { SegmentedRecorder, getDisplayAudioStream, type CaptureMode } from "../../lib/capture/recorder"

declare const chrome: any

const TOKEN_KEY = "afterthought_access_token"
const BASE_URL_KEY = "afterthought_base_url"
const DEFAULT_BASE_URL = "http://localhost:3000"

const params = new URLSearchParams(location.search)
const targetTabId = Number(params.get("tabId")) || null
const mode = (params.get("mode") as CaptureMode) || "both"

const $ = (id: string) => document.getElementById(id) as HTMLElement
const statusEl = $("status")
const timerEl = $("timer")
const stopBtn = $("stopBtn") as HTMLButtonElement
const pauseBtn = $("pauseBtn") as HTMLButtonElement
const backBtn = $("backBtn") as HTMLButtonElement
const micBar = $("micBar")
const tabBar = $("tabBar")
const errorBanner = $("errorBanner")

function showError(message: string) {
  $("errorText").textContent = message
  errorBanner.classList.add("show")
}

function setStatus(text: string) {
  statusEl.textContent = text
}

function storageGet(keys: string[]): Promise<Record<string, string>> {
  return new Promise((resolve) => chrome.storage.local.get(keys, (r: Record<string, string>) => resolve(r || {})))
}

/** Stream of the call tab's audio. tabCapture needs the toolbar click (activeTab) on that tab. */
async function tabStream(): Promise<MediaStream> {
  if (!targetTabId || !chrome.tabCapture?.getMediaStreamId) return getDisplayAudioStream()
  const self = await new Promise<{ id: number }>((r) => chrome.tabs.getCurrent(r))
  const streamId = await new Promise<string>((resolve, reject) =>
    chrome.tabCapture.getMediaStreamId({ targetTabId, consumerTabId: self.id }, (id: string) => {
      if (chrome.runtime.lastError || !id) reject(new Error(chrome.runtime.lastError?.message || "Tab capture failed"))
      else resolve(id)
    }),
  )
  return navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } } as MediaTrackConstraints,
    video: false,
  })
}

function fmt(seconds: number) {
  const s = Math.floor(seconds)
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

async function main() {
  const stored = await storageGet([TOKEN_KEY, BASE_URL_KEY])
  const apiBase = stored[BASE_URL_KEY] || DEFAULT_BASE_URL
  const token = stored[TOKEN_KEY]
  if (!token) {
    showError("No API key saved. Open the AfterThought popup and add one.")
    return
  }

  if (mode === "mic") tabBar.parentElement!.style.display = "none"
  if (mode === "system") micBar.parentElement!.style.display = "none"

  const recorder = new SegmentedRecorder({
    apiBase,
    getToken: async () => token,
    mode,
    getSystemStream: tabStream,
    // tabCapture mutes the tab for the user; play it back so they still hear the call.
    monitorSystemAudio: true,
    meta: {
      source: "extension",
      title: params.get("title") || undefined,
      platform: params.get("platform") || undefined,
      kind: params.get("kind") === "interview" ? "interview" : "meeting",
      consentConfirmed: true,
    },
    onState: (s) => {
      if (s === "recording") setStatus("Recording")
      if (s === "paused") setStatus("Paused")
      if (s === "finishing") setStatus("Uploading the last segment…")
    },
    onError: showError,
    onLevels: ({ mic, system }) => {
      micBar.style.width = `${Math.round(mic * 100)}%`
      tabBar.style.width = `${Math.round(system * 100)}%`
    },
  })

  try {
    setStatus("Starting…")
    await recorder.start()
  } catch (err) {
    showError(err instanceof Error ? err.message : "Could not start recording")
    setStatus("")
    return
  }

  const tick = setInterval(() => (timerEl.textContent = fmt(recorder.elapsedSeconds)), 500)
  window.addEventListener("beforeunload", (e) => {
    if (recorder.currentState === "recording" || recorder.currentState === "paused") e.preventDefault()
  })

  pauseBtn.addEventListener("click", () => {
    if (recorder.currentState === "recording") {
      recorder.pause()
      pauseBtn.textContent = "Resume"
    } else {
      recorder.resume()
      pauseBtn.textContent = "Pause"
    }
  })

  backBtn.addEventListener("click", () => {
    if (targetTabId) chrome.tabs.update(targetTabId, { active: true })
  })

  stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true
    pauseBtn.disabled = true
    clearInterval(tick)
    const id = await recorder.stop()
    if (id && recorder.currentState === "done") {
      setStatus("Done — opening your notes…")
      chrome.tabs.create({ url: `${apiBase}/meeting/${id}` })
      setTimeout(() => window.close(), 800)
    }
  })
}

void main()
