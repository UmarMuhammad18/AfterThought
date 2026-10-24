import { NextResponse } from "next/server"
import { CallError } from "./calls"

const DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }]

/** STUN/TURN servers for the browser's WebRTC connection (WEBRTC_ICE_SERVERS as JSON). */
export function iceServers(): RTCIceServer[] {
  try {
    return process.env.WEBRTC_ICE_SERVERS ? JSON.parse(process.env.WEBRTC_ICE_SERVERS) : DEFAULT_ICE
  } catch {
    return DEFAULT_ICE
  }
}

export function callErrorResponse(err: unknown) {
  if (err instanceof CallError) {
    const status =
      err.code === "not_found" ? 404 : err.code === "api" ? 502 : err.code === "not_configured" ? 503 : 409
    return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status })
  }
  return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Server error" }, { status: 500 })
}
