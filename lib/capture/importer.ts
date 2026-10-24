/**
 * Import an existing audio/video file (a phone's call recording, a voice
 * memo, a Zoom/Teams cloud recording, ...). The file goes straight to Storage
 * through a signed URL, so size is not limited by the API server.
 */

import type { RecordingMeta } from "./recorder"

export type ImportOptions = {
  apiBase: string
  getToken: () => Promise<string | null>
  meta?: Omit<RecordingMeta, "source">
  onProgress?: (fraction: number) => void
}

async function api(opts: ImportOptions, path: string, body: unknown) {
  const token = await opts.getToken()
  if (!token) throw new Error("You're not signed in.")
  const res = await fetch(opts.apiBase.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function putWithProgress(url: string, file: Blob, onProgress?: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."))
    xhr.send(file)
  })
}

/** Read a media file's duration in the browser (best effort). */
export function probeDuration(file: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(undefined)
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio")
    const url = URL.createObjectURL(file)
    const done = (v?: number) => {
      URL.revokeObjectURL(url)
      resolve(v && Number.isFinite(v) ? v : undefined)
    }
    el.preload = "metadata"
    el.onloadedmetadata = () => done(el.duration)
    el.onerror = () => done(undefined)
    el.src = url
    setTimeout(() => done(undefined), 5000)
  })
}

/** Guess a MIME type when the OS doesn't provide one (common on Android shares). */
export function guessMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split(".").pop()?.toLowerCase()
  const map: Record<string, string> = {
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    opus: "audio/ogg",
    amr: "audio/amr",
    "3gp": "audio/3gpp",
    aac: "audio/aac",
    flac: "audio/flac",
    webm: "audio/webm",
    mp4: "video/mp4",
    mov: "video/quicktime",
  }
  return (ext && map[ext]) || "audio/mpeg"
}

export async function importRecordingFile(file: File, opts: ImportOptions): Promise<string> {
  const mimeType = guessMimeType(file)
  const typed = file.type ? file : new File([file], file.name, { type: mimeType })

  const start = await api(opts, "/api/recordings/import", {
    ...opts.meta,
    filename: file.name,
    mimeType,
    size: file.size,
  })
  await putWithProgress(start.uploadUrl, typed, opts.onProgress)
  const durationSeconds = await probeDuration(typed)
  await api(opts, `/api/recordings/${start.id}/finish`, {
    path: start.path,
    mimeType,
    size: file.size,
    durationSeconds,
  })
  return start.id as string
}
