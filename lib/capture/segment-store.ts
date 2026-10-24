/**
 * Keeps audio segments in IndexedDB until the server has them, so a closed
 * tab, a crashed phone browser, or a dead connection doesn't lose the call.
 * On the next visit, resumePendingUploads() sends what's left and finishes
 * the recording.
 */

export type StoredSegment = {
  meetingId: string
  seq: number
  blob: Blob
  start: number
  duration: number
}

export type StoredRecording = { meetingId: string; apiBase: string; updatedAt: number }

export interface SegmentStore {
  putRecording(rec: StoredRecording): Promise<void>
  putSegment(seg: StoredSegment): Promise<void>
  deleteSegment(meetingId: string, seq: number): Promise<void>
  deleteRecording(meetingId: string): Promise<void>
  listRecordings(): Promise<StoredRecording[]>
  listSegments(meetingId: string): Promise<StoredSegment[]>
}

const DB_NAME = "afterthought-capture"
/** Longer than one segment (2 min) plus upload time. */
const STALE_AFTER_MS = 4 * 60 * 1000
const DB_VERSION = 1

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export class IdbSegmentStore implements SegmentStore {
  private db: Promise<IDBDatabase>

  constructor() {
    this.db = new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, DB_VERSION)
      open.onupgradeneeded = () => {
        const db = open.result
        if (!db.objectStoreNames.contains("recordings")) db.createObjectStore("recordings", { keyPath: "meetingId" })
        if (!db.objectStoreNames.contains("segments")) {
          const s = db.createObjectStore("segments", { keyPath: ["meetingId", "seq"] })
          s.createIndex("byMeeting", "meetingId")
        }
      }
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
  }

  /** IndexedDB can be missing or blocked (private mode, some webviews). */
  static available(): boolean {
    try {
      return typeof indexedDB !== "undefined"
    } catch {
      return false
    }
  }

  private async store(name: "recordings" | "segments", mode: IDBTransactionMode) {
    return (await this.db).transaction(name, mode).objectStore(name)
  }

  async putRecording(rec: StoredRecording) {
    await req((await this.store("recordings", "readwrite")).put(rec))
  }

  async putSegment(seg: StoredSegment) {
    await req((await this.store("segments", "readwrite")).put(seg))
  }

  async deleteSegment(meetingId: string, seq: number) {
    await req((await this.store("segments", "readwrite")).delete([meetingId, seq]))
  }

  async deleteRecording(meetingId: string) {
    for (const s of await this.listSegments(meetingId)) await this.deleteSegment(meetingId, s.seq)
    await req((await this.store("recordings", "readwrite")).delete(meetingId))
  }

  async listRecordings(): Promise<StoredRecording[]> {
    return req((await this.store("recordings", "readonly")).getAll())
  }

  async listSegments(meetingId: string): Promise<StoredSegment[]> {
    const segs = await req((await this.store("segments", "readonly")).index("byMeeting").getAll(meetingId))
    return (segs as StoredSegment[]).sort((a, b) => a.seq - b.seq)
  }
}

/**
 * Upload anything a previous session left behind, then finish those
 * recordings so they get transcribed. Returns the meeting ids recovered.
 * `activeIds` are recordings still in progress in this page; they're skipped.
 */
export async function resumePendingUploads(
  store: SegmentStore,
  getToken: () => Promise<string | null>,
  activeIds: string[] = [],
): Promise<string[]> {
  const token = await getToken()
  if (!token) return []
  const recovered: string[] = []

  for (const rec of await store.listRecordings()) {
    if (activeIds.includes(rec.meetingId)) continue
    // A recorder in another tab refreshes updatedAt every segment; leave live ones alone.
    if (Date.now() - rec.updatedAt < STALE_AFTER_MS) continue
    const base = rec.apiBase.replace(/\/$/, "")
    const headers = { Authorization: `Bearer ${token}` }

    for (const seg of await store.listSegments(rec.meetingId)) {
      const res = await fetch(`${base}/api/recordings/${rec.meetingId}/segments/${seg.seq}`, {
        method: "PUT",
        body: seg.blob,
        headers: {
          ...headers,
          "Content-Type": seg.blob.type || "audio/webm",
          "X-Start-Seconds": seg.start.toFixed(2),
          "X-Duration-Seconds": seg.duration.toFixed(2),
        },
      }).catch(() => null)
      if (!res) return recovered // offline: try again next visit
      // 4xx (already finished, deleted, ...) won't succeed later either.
      if (res.ok || (res.status >= 400 && res.status < 500)) await store.deleteSegment(rec.meetingId, seg.seq)
      else return recovered
    }

    const finish = await fetch(`${base}/api/recordings/${rec.meetingId}/finish`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => null)
    if (!finish) return recovered
    await store.deleteRecording(rec.meetingId)
    if (finish.ok) recovered.push(rec.meetingId)
  }
  return recovered
}
