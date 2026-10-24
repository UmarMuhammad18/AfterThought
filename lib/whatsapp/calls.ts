/**
 * WhatsApp Business Calling API: signalling between Meta and the browser.
 *
 * The recruiter's browser is the business end of the call (WebRTC). The
 * server only relays SDP between Meta's webhooks and the browser:
 *
 *   Candidate calls  -> webhook "connect" (offer) -> row "ringing"
 *   Browser accepts  -> answer SDP -> pre_accept + accept (with recording) -> "connected"
 *   Recruiter calls  -> browser offer -> "connect" -> webhook "connect" (answer) -> "connected"
 *   Hang-up          -> terminate (either side) -> "ended"
 *   Meta recording   -> webhook "call_recording_available" -> pipeline (only if
 *                       the browser didn't already record the call)
 */

import { supabaseAdmin } from "@/lib/supabase"
import { callsApi, CloudWhatsAppAdapter, isCloudApiConfigured } from "./cloud-adapter"
import { getUserIdForPhone, normalizePhone } from "./users"
import type { CallEvent } from "./webhook"
import { createRecording, finalizeRecording, storeSegment } from "@/lib/pipeline"
import { isInsideWindow } from "./window"

export type CallRow = {
  id: string
  user_id: string | null
  invite_id: string | null
  direction: "USER_INITIATED" | "BUSINESS_INITIATED"
  peer_phone: string | null
  peer_name: string | null
  status: string
  offer_sdp: string | null
  answer_sdp: string | null
  meeting_id: string | null
  error: string | null
  duration_seconds: number | null
  created_at: string
}

export class CallError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "bad_state" | "permission_required" | "outside_window" | "not_configured" | "api",
  ) {
    super(message)
  }
}

/** The legally required announcement + Meta-side recording (backup copy). */
function recordingConfig() {
  if (process.env.WHATSAPP_CALL_RECORDING === "false") return undefined
  return {
    status: "ENABLED",
    purpose: (process.env.WHATSAPP_RECORDING_PURPOSE || "taking interview notes").slice(0, 250),
    announcement_language: process.env.WHATSAPP_RECORDING_LANGUAGE || "en_US",
  }
}

/**
 * Who answers an incoming call: the recruiter who invited this candidate to a
 * call interview, else the user who linked this number, else the line owner.
 */
async function routeIncomingCall(phone: string): Promise<{ userId: string | null; inviteId: string | null }> {
  const { data: invite } = await supabaseAdmin()
    .from("interview_invites")
    .select("id, user_id")
    .eq("candidate_phone", phone)
    .eq("mode", "call")
    .in("status", ["invited", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (invite) return { userId: invite.user_id, inviteId: invite.id }

  const owner = process.env.WHATSAPP_LINE_OWNER_USER_ID || null
  return { userId: owner ?? (await getUserIdForPhone(phone)), inviteId: null }
}

async function updateCall(id: string, fields: Partial<CallRow>) {
  await supabaseAdmin()
    .from("whatsapp_calls")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
}

export async function handleCallEvent(event: CallEvent): Promise<void> {
  const supabase = supabaseAdmin()

  if (event.kind === "permission") {
    await supabase.from("whatsapp_call_permissions").upsert(
      {
        phone: normalizePhone(event.phone),
        status: event.response,
        is_permanent: event.isPermanent,
        expires_at: event.expiresAt ? new Date(event.expiresAt * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" },
    )
    return
  }

  if (event.kind === "connect" && event.sdpType === "offer") {
    const phone = normalizePhone(event.from ?? "")
    const { userId, inviteId } = await routeIncomingCall(phone)
    if (!userId) {
      // Nobody can answer; tell WhatsApp straight away instead of ringing out.
      await callsApi({ call_id: event.callId, action: "reject" }).catch(() => undefined)
      console.warn(`[calls] no recruiter to route call from ${phone}; rejected. Set WHATSAPP_LINE_OWNER_USER_ID.`)
      return
    }
    await supabase.from("whatsapp_calls").upsert(
      {
        id: event.callId,
        user_id: userId,
        invite_id: inviteId,
        direction: "USER_INITIATED",
        peer_phone: phone,
        peer_name: event.peerName ?? null,
        status: "ringing",
        offer_sdp: event.sdp,
      },
      { onConflict: "id" },
    )
    return
  }

  if (event.kind === "connect" && event.sdpType === "answer") {
    await updateCall(event.callId, { answer_sdp: event.sdp, status: "connected" })
    return
  }

  if (event.kind === "terminate") {
    const failed = event.status.toUpperCase() === "FAILED"
    const { data: row } = await supabase.from("whatsapp_calls").select("status").eq("id", event.callId).maybeSingle()
    const neverAnswered = row?.status === "ringing" || row?.status === "accepting"
    await updateCall(event.callId, {
      status: failed ? "failed" : neverAnswered ? "missed" : "ended",
      duration_seconds: event.durationSeconds ?? null,
    })
    return
  }

  if (event.kind === "recording") {
    await processMetaRecording(event)
  }
}

/** Use Meta's recording only when the browser didn't capture the call itself. */
async function processMetaRecording(event: Extract<CallEvent, { kind: "recording" }>) {
  const supabase = supabaseAdmin()
  const { data: row } = await supabase.from("whatsapp_calls").select("*").eq("id", event.callId).maybeSingle()
  const call = row as CallRow | null

  if (call?.meeting_id) {
    const { count } = await supabase
      .from("recording_segments")
      .select("id", { count: "exact", head: true })
      .eq("meeting_id", call.meeting_id)
    if (count) return // the browser's two-channel recording is better; keep it
  }

  const phone = normalizePhone(call?.peer_phone ?? event.from ?? "")
  const userId = call?.user_id ?? (await getUserIdForPhone(phone))

  let interview: { candidate?: string; role?: string; rubric?: string } | undefined
  if (call?.invite_id) {
    const { data: invite } = await supabase
      .from("interview_invites")
      .select("candidate_name, role, rubric")
      .eq("id", call.invite_id)
      .maybeSingle()
    if (invite) interview = { candidate: invite.candidate_name ?? undefined, role: invite.role ?? undefined, rubric: invite.rubric ?? undefined }
  }

  // The webhook URL lives for 5 minutes; fall back to the media id after that.
  let audio: Buffer | null = null
  if (event.url) {
    const res = await fetch(event.url, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } })
    if (res.ok) audio = Buffer.from(await res.arrayBuffer())
  }
  if (!audio) audio = await new CloudWhatsAppAdapter().downloadMedia(event.mediaId)

  const meetingId = await createRecording({
    userId,
    source: "whatsapp_call",
    title: `WhatsApp call with ${call?.peer_name || interview?.candidate || `+${phone}`}`,
    platform: "WhatsApp",
    kind: interview ? "interview" : "meeting",
    interview,
    consentConfirmed: true, // WhatsApp played the recording announcement
    whatsappPhone: phone,
  })
  await storeSegment({
    meetingId,
    userId,
    seq: 0,
    audio,
    mimeType: (event.mimeType || "audio/ogg").split(";")[0],
    startSeconds: 0,
    durationSeconds: call?.duration_seconds ?? undefined,
  })
  if (call) await updateCall(call.id, { meeting_id: meetingId })
  await finalizeRecording(meetingId)
}

// ---------------------------------------------------------------------------
// Actions from the recruiter's browser
// ---------------------------------------------------------------------------

function requireConfigured() {
  if (!isCloudApiConfigured()) {
    throw new CallError("WhatsApp calling isn't configured on this server.", "not_configured")
  }
}

async function ownedCall(callId: string, userId: string): Promise<CallRow> {
  const { data } = await supabaseAdmin()
    .from("whatsapp_calls")
    .select("*")
    .eq("id", callId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!data) throw new CallError("Call not found", "not_found")
  return data as CallRow
}

/** Answer an incoming call with the browser's SDP answer. */
export async function acceptCall(callId: string, userId: string, answerSdp: string): Promise<void> {
  requireConfigured()
  const call = await ownedCall(callId, userId)
  if (call.status !== "ringing") throw new CallError(`Call is ${call.status}`, "bad_state")

  await updateCall(callId, { status: "accepting", answer_sdp: answerSdp })
  const session = { sdp_type: "answer", sdp: answerSdp }
  try {
    // pre_accept lets media negotiation start before the call is "picked up".
    await callsApi({ call_id: callId, action: "pre_accept", session })
    await callsApi({ call_id: callId, action: "accept", session, recording: recordingConfig() })
  } catch (err) {
    await updateCall(callId, { status: "failed", error: err instanceof Error ? err.message : String(err) })
    throw new CallError(err instanceof Error ? err.message : "Could not accept the call", "api")
  }
  await updateCall(callId, { status: "connected" })
  if (call.invite_id) {
    await supabaseAdmin().from("interview_invites").update({ status: "in_progress" }).eq("id", call.invite_id)
  }
}

export async function rejectCall(callId: string, userId: string): Promise<void> {
  requireConfigured()
  await ownedCall(callId, userId)
  await callsApi({ call_id: callId, action: "reject" }).catch(() => undefined)
  await updateCall(callId, { status: "rejected" })
}

export async function terminateCall(callId: string, userId: string): Promise<void> {
  requireConfigured()
  await ownedCall(callId, userId)
  // Always terminate, even after RTCP BYE, so billing is accurate.
  await callsApi({ call_id: callId, action: "terminate" }).catch(() => undefined)
  await updateCall(callId, { status: "ended" })
}

export async function attachMeeting(callId: string, userId: string, meetingId: string): Promise<void> {
  await ownedCall(callId, userId)
  await updateCall(callId, { meeting_id: meetingId })
}

export async function hasCallPermission(phone: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("whatsapp_call_permissions")
    .select("status, is_permanent, expires_at")
    .eq("phone", normalizePhone(phone))
    .maybeSingle()
  if (!data || data.status !== "accept") return false
  return data.is_permanent || !data.expires_at || new Date(data.expires_at).getTime() > Date.now()
}

/** Ask a user for permission to call them (free-form; needs an open 24h window). */
export async function requestCallPermission(phone: string, reason: string): Promise<void> {
  requireConfigured()
  const to = normalizePhone(phone)
  const { data: contact } = await supabaseAdmin()
    .from("whatsapp_contacts")
    .select("last_inbound_at")
    .eq("phone", to)
    .maybeSingle()
  if (!isInsideWindow(contact?.last_inbound_at ? new Date(contact.last_inbound_at) : null)) {
    throw new CallError(
      "This person hasn't messaged the WhatsApp number in the last 24 hours. Send them your interview link so they message first, or ask them to call you.",
      "outside_window",
    )
  }
  await new CloudWhatsAppAdapter().postRaw({
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "call_permission_request",
      action: { name: "call_permission_request" },
      body: { text: reason.slice(0, 1000) },
    },
  })
}

/** Call a WhatsApp user from the browser. Returns the new call id. */
export async function startCall(opts: {
  userId: string
  to: string
  offerSdp: string
  inviteId?: string | null
  peerName?: string | null
}): Promise<string> {
  requireConfigured()
  const to = normalizePhone(opts.to)
  if (!(await hasCallPermission(to))) {
    throw new CallError("This person hasn't given permission to be called yet.", "permission_required")
  }

  let data: Record<string, any>
  try {
    data = await callsApi({
      to,
      action: "connect",
      session: { sdp_type: "offer", sdp: opts.offerSdp },
      recording: recordingConfig(),
    })
  } catch (err) {
    const e = err as Error & { code?: number }
    if (e.code === 138006) throw new CallError("This person hasn't given permission to be called yet.", "permission_required")
    throw new CallError(e.message, "api")
  }

  const callId = data?.calls?.[0]?.id as string | undefined
  if (!callId) throw new CallError("WhatsApp didn't return a call id", "api")

  await supabaseAdmin().from("whatsapp_calls").insert({
    id: callId,
    user_id: opts.userId,
    invite_id: opts.inviteId ?? null,
    direction: "BUSINESS_INITIATED",
    peer_phone: to,
    peer_name: opts.peerName ?? null,
    status: "ringing",
    offer_sdp: opts.offerSdp,
  })
  return callId
}
