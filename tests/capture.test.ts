import { afterEach, describe, expect, it, vi } from "vitest"
import {
  resumePendingUploads,
  type SegmentStore,
  type StoredRecording,
  type StoredSegment,
} from "@/lib/capture/segment-store"

class MemoryStore implements SegmentStore {
  recordings = new Map<string, StoredRecording>()
  segments = new Map<string, StoredSegment>()
  async putRecording(r: StoredRecording) {
    this.recordings.set(r.meetingId, r)
  }
  async putSegment(s: StoredSegment) {
    this.segments.set(`${s.meetingId}:${s.seq}`, s)
  }
  async deleteSegment(m: string, seq: number) {
    this.segments.delete(`${m}:${seq}`)
  }
  async deleteRecording(m: string) {
    for (const k of [...this.segments.keys()]) if (k.startsWith(`${m}:`)) this.segments.delete(k)
    this.recordings.delete(m)
  }
  async listRecordings() {
    return [...this.recordings.values()]
  }
  async listSegments(m: string) {
    return [...this.segments.values()].filter((s) => s.meetingId === m).sort((a, b) => a.seq - b.seq)
  }
}

const OLD = Date.now() - 10 * 60 * 1000

function seed(store: MemoryStore, meetingId: string, updatedAt: number, seqs: number[]) {
  store.recordings.set(meetingId, { meetingId, apiBase: "https://app.test/", updatedAt })
  for (const seq of seqs) {
    store.segments.set(`${meetingId}:${seq}`, { meetingId, seq, blob: new Blob(["x"], { type: "audio/webm" }), start: seq * 120, duration: 120 })
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("resumePendingUploads", () => {
  it("uploads leftover segments in order, finishes the recording and clears it", async () => {
    const store = new MemoryStore()
    seed(store, "m1", OLD, [2, 1])
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push(`${init.method} ${url}`)
      return new Response("{}", { status: 200 })
    }))

    const recovered = await resumePendingUploads(store, async () => "at_key")
    expect(recovered).toEqual(["m1"])
    expect(calls).toEqual([
      "PUT https://app.test/api/recordings/m1/segments/1",
      "PUT https://app.test/api/recordings/m1/segments/2",
      "POST https://app.test/api/recordings/m1/finish",
    ])
    expect(store.recordings.size).toBe(0)
    expect(store.segments.size).toBe(0)
  })

  it("leaves recordings that are still alive in another tab, or active here", async () => {
    const store = new MemoryStore()
    seed(store, "live", Date.now(), [0])
    seed(store, "here", OLD, [0])
    const fetchMock = vi.fn(async () => new Response("{}"))
    vi.stubGlobal("fetch", fetchMock)

    expect(await resumePendingUploads(store, async () => "t", ["here"])).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("keeps everything when offline, and drops segments the server rejects", async () => {
    const store = new MemoryStore()
    seed(store, "m1", OLD, [0, 1])
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline")
    }))
    expect(await resumePendingUploads(store, async () => "t")).toEqual([])
    expect(store.segments.size).toBe(2)

    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      new Response("{}", { status: url.includes("/segments/0") ? 409 : 200 }),
    ))
    expect(await resumePendingUploads(store, async () => "t")).toEqual(["m1"])
    expect(store.segments.size).toBe(0)
  })

  it("does nothing without credentials", async () => {
    const store = new MemoryStore()
    seed(store, "m1", OLD, [0])
    expect(await resumePendingUploads(store, async () => null)).toEqual([])
    expect(store.recordings.size).toBe(1)
  })
})
