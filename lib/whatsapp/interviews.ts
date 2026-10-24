/**
 * Interviews over WhatsApp.
 *
 * Async: the recruiter creates an invite and shares a link; the candidate
 * sends "interview CODE", agrees to recording, then answers each question
 * with a voice note (or text). Answers are transcribed as they arrive; at the
 * end the conversation is analysed and scored against the rubric.
 *
 * Call: the candidate sends the code, AfterThought asks for call permission,
 * and the call is routed to the recruiter's browser (see calls.ts).
 */

import { randomInt } from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  generateInterviewQuestions,
  type InterviewDetails,
} from "@/lib/ai/analysis"
import { isAiConfigured } from "@/app/api/summarize/ai/gemini-service"
import { completeMeeting, createRecording, storeSegment, transcribeSegment } from "@/lib/pipeline"
import { formatTimestamp, type TranscriptSegment } from "@/lib/transcription"
import { deliver } from "./window"
import { normalizePhone } from "./users"
import { requestCallPermission } from "./calls"
import type { IncomingMessage, WhatsAppAdapter } from "./types"

export type InviteMode = "async" | "call"

export type Answer = { segments: TranscriptSegment[]; duration: number; skipped?: boolean }

export type Invite = {
  id: string
  user_id: string
  code: string
  mode: InviteMode
  candidate_name: string | null
  candidate_phone: string | null
  role: string | null
  rubric: string | null
  questions: string[]
  answers: Answer[]
  status: "invited" | "awaiting_consent" | "in_progress" | "completed" | "cancelled"
  current_index: number
  meeting_id: string | null
  created_at: string
}

// No 0/O/1/I so codes survive being read aloud or retyped.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateInviteCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]
  return code
}

export function inviteLink(code: string): string | null {
  const number = process.env.WHATSAPP_DISPLAY_NUMBER?.replace(/\D/g, "")
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(`interview ${code}`)}` : null
}

export async function createInvite(
  userId: string,
  input: { mode: InviteMode; candidateName?: string; role?: string; rubric?: string; questions?: string[] },
): Promise<Invite> {
  let questions = (input.questions ?? []).map((q) => q.trim()).filter(Boolean).slice(0, 15)
  if (input.mode === "async" && questions.length === 0) {
    questions = isAiConfigured()
      ? await generateInterviewQuestions({ role: input.role, rubric: input.rubric }).catch(
          () => DEFAULT_INTERVIEW_QUESTIONS,
        )
      : DEFAULT_INTERVIEW_QUESTIONS
  }

  const supabase = supabaseAdmin()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("interview_invites")
      .insert({
        user_id: userId,
        code: generateInviteCode(),
        mode: input.mode,
        candidate_name: input.candidateName?.trim().slice(0, 120) || null,
        role: input.role?.trim().slice(0, 200) || null,
        rubric: input.rubric?.trim().slice(0, 8000) || null,
        questions,
      })
      .select("*")
      .single()
    if (!error && data) return data as Invite
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message)
  }
  throw new Error("Could not create an invite code, please try again.")
}

async function updateInvite(id: string, fields: Partial<Invite>) {
  await supabaseAdmin()
    .from("interview_invites")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
}

/** The async interview this phone is currently taking, if any. */
export async function activeInviteFor(phone: string): Promise<Invite | null> {
  const { data } = await supabaseAdmin()
    .from("interview_invites")
    .select("*")
    .eq("candidate_phone", normalizePhone(phone))
    .eq("mode", "async")
    .in("status", ["awaiting_consent", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Invite) ?? null
}

function details(invite: Invite): InterviewDetails {
  return {
    candidate: invite.candidate_name ?? undefined,
    role: invite.role ?? undefined,
    rubric: invite.rubric ?? undefined,
  }
}

function questionText(invite: Invite, index: number): string {
  return `*Question ${index + 1} of ${invite.questions.length}*\n${invite.questions[index]}\n\n🎙️ Reply with a voice note (or type your answer). Send *skip* to skip, *repeat* to hear it again.`
}

/** "interview CODE" — the candidate opens an invite. */
export async function startInviteFromMessage(
  adapter: WhatsAppAdapter,
  phone: string,
  code: string,
  profileName?: string,
): Promise<void> {
  const supabase = supabaseAdmin()
  const { data } = await supabase.from("interview_invites").select("*").eq("code", code.toUpperCase()).maybeSingle()
  const invite = data as Invite | null

  if (!invite || invite.status === "cancelled" || invite.status === "completed") {
    await deliver(adapter, phone, "⚠️ That interview code isn't valid any more. Please check with the person who sent it.")
    return
  }
  if (invite.candidate_phone && invite.candidate_phone !== phone) {
    await deliver(adapter, phone, "⚠️ This interview has already been started from another number.")
    return
  }

  const name = invite.candidate_name || profileName || null
  const role = invite.role ? ` for *${invite.role}*` : ""

  if (invite.mode === "call") {
    await updateInvite(invite.id, { candidate_phone: phone, candidate_name: name })
    await deliver(
      adapter,
      phone,
      `👋 Hi${name ? ` ${name}` : ""}! You're set up for a WhatsApp call interview${role}.\n\nWhen you're ready, call this number on WhatsApp (tap the 📞 icon at the top of this chat). If we call you instead, please accept the call request.\n\nThe call will be recorded so the team can take notes — you'll hear an announcement when it starts.`,
    )
    // They just messaged, so the 24h window is open: ask to be allowed to call them back.
    await requestCallPermission(phone, `We'd like to call you for your interview${role.replace(/\*/g, "")}.`).catch(
      (err) => console.warn("[interviews] call permission request failed:", err),
    )
    return
  }

  await updateInvite(invite.id, { candidate_phone: phone, candidate_name: name, status: "awaiting_consent" })
  await deliver(
    adapter,
    phone,
    `👋 Hi${name ? ` ${name}` : ""}! You've been invited to a short interview${role}.\n\n` +
      `You'll get *${invite.questions.length} questions*. Answer each with a voice note, whenever suits you — about 1–2 minutes each.\n\n` +
      `Your answers will be recorded, transcribed and summarised for the hiring team.\n\n` +
      `Reply *YES* to start, or *NO* to decline.`,
  )
}

/** Handle a message from a candidate who is mid-interview. Returns false if not handled. */
export async function handleInterviewMessage(
  adapter: WhatsAppAdapter,
  invite: Invite,
  msg: IncomingMessage,
): Promise<boolean> {
  const phone = invite.candidate_phone!
  const text = msg.type === "text" ? (msg.text ?? "").trim() : ""

  if (invite.status === "awaiting_consent") {
    if (/^(yes|y|ok|okay|start|sure|نعم|oui|sí|si|haan|ha)$/i.test(text)) {
      const meetingId = await createRecording({
        userId: invite.user_id,
        source: "whatsapp_voice",
        title: `Interview — ${invite.candidate_name || `+${phone}`}`,
        platform: "WhatsApp",
        kind: "interview",
        interview: details(invite),
        consentConfirmed: true,
        whatsappPhone: phone,
      })
      await updateInvite(invite.id, { status: "in_progress", meeting_id: meetingId, current_index: 0, answers: [] })
      await deliver(adapter, phone, `Great, let's begin. Take your time.\n\n${questionText(invite, 0)}`)
      return true
    }
    if (/^(no|n|stop|cancel|decline)$/i.test(text)) {
      await updateInvite(invite.id, { status: "cancelled" })
      await deliver(adapter, phone, "No problem — the interview has been cancelled. Nothing was recorded.")
      return true
    }
    await deliver(adapter, phone, "Please reply *YES* to start the interview, or *NO* to decline.")
    return true
  }

  // in_progress
  const index = invite.current_index
  if (/^repeat$/i.test(text)) {
    await deliver(adapter, phone, questionText(invite, index))
    return true
  }
  if (/^(stop|cancel|quit)$/i.test(text)) {
    await updateInvite(invite.id, { status: "cancelled" })
    await deliver(adapter, phone, "The interview has been stopped. Thanks for your time.")
    return true
  }

  const answers = [...(invite.answers ?? [])]
  const startAt = answers.reduce((sum, a) => sum + (a.duration || 0), 0)
  const speaker = invite.candidate_name || "Candidate"

  if (/^skip$/i.test(text)) {
    answers[index] = { segments: [], duration: 0, skipped: true }
  } else if (msg.type === "audio" || msg.type === "voice" || msg.type === "call_recording") {
    const mediaRef = msg.mediaId || msg.mediaUrl
    if (!mediaRef || !invite.meeting_id) return false
    await deliver(adapter, phone, "✅ Got it — transcribing…")
    const audio = await adapter.downloadMedia(mediaRef)
    await storeSegment({
      meetingId: invite.meeting_id,
      userId: invite.user_id,
      seq: index,
      audio,
      mimeType: (msg.mediaMimeType || "audio/ogg").split(";")[0],
      startSeconds: startAt,
    })
    await transcribeSegment(invite.meeting_id, index)
    const { data: seg } = await supabaseAdmin()
      .from("recording_segments")
      .select("transcript, duration_seconds")
      .eq("meeting_id", invite.meeting_id)
      .eq("seq", index)
      .maybeSingle()
    const segments = ((seg?.transcript ?? []) as TranscriptSegment[]).map((s) => ({ ...s, speaker }))
    const lastEnd = segments.reduce((m, s) => Math.max(m, s.end ?? 0), startAt)
    answers[index] = { segments, duration: Number(seg?.duration_seconds) || Math.max(lastEnd - startAt, 1) }
  } else if (text) {
    answers[index] = {
      segments: [{ speaker, text, start: startAt, timestamp: formatTimestamp(startAt) }],
      duration: 0,
    }
  } else {
    return false
  }

  const next = index + 1
  if (next < invite.questions.length) {
    await updateInvite(invite.id, { answers, current_index: next })
    await deliver(adapter, phone, questionText(invite, next))
    return true
  }

  await updateInvite(invite.id, { answers, current_index: next, status: "completed" })
  await deliver(adapter, phone, "🎉 That's everything — thank you! The team will be in touch.")
  await finishAsyncInterview({ ...invite, answers })
  return true
}

/** Interleave questions and answers into one transcript, then analyse and score it. */
export function buildInterviewTranscript(invite: Pick<Invite, "questions" | "answers">): TranscriptSegment[] {
  const out: TranscriptSegment[] = []
  let offset = 0
  invite.questions.forEach((q, i) => {
    const a = invite.answers[i]
    out.push({ speaker: "Interviewer", text: q, start: offset, timestamp: formatTimestamp(offset) })
    if (!a || a.skipped) {
      out.push({ speaker: "Note", text: "(Question skipped)", start: offset, timestamp: formatTimestamp(offset) })
    } else {
      out.push(...a.segments)
    }
    offset += a?.duration || 0
  })
  return out
}

async function finishAsyncInterview(invite: Invite): Promise<void> {
  if (!invite.meeting_id) return
  const segments = buildInterviewTranscript(invite)
  const duration = invite.answers.reduce((s, a) => s + (a?.duration || 0), 0)
  try {
    await completeMeeting(invite.meeting_id, segments, { durationSeconds: duration })
  } catch (err) {
    console.error("[interviews] could not complete interview:", err)
    await supabaseAdmin()
      .from("meetings")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", invite.meeting_id)
  }
}
