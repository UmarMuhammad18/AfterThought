import { NextResponse } from "next/server"
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabase"
import {
  askMeetingAI,
  askAcrossMeetings,
  relatedResults,
  type MemoryMeeting,
} from "@/lib/ai/meeting-memory"

type SearchBody = {
  q?: string
  question?: string
  meetingId?: string
}

async function loadUserMeetings(userId: string): Promise<MemoryMeeting[]> {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, summary, action_items, segments, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[search] load meetings:", error.message)
    return []
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    title: m.title || "Untitled",
    summary: m.summary || "",
    action_items: m.action_items || [],
    segments: Array.isArray(m.segments) ? m.segments : [],
    created_at: m.created_at,
  }))
}

async function handleSearch(
  question: string,
  userId: string,
  meetingId?: string | null,
) {
  const meetings = await loadUserMeetings(userId)

  if (meetings.length === 0) {
    return NextResponse.json({
      ok: true,
      query: question,
      answer: "No meetings found for your account yet.",
      results: [],
      meetings: [],
    })
  }

  if (meetingId) {
    const selected = meetings.find((m) => m.id === meetingId) ?? meetings[0]
    const answer = await askMeetingAI(question, selected)
    const results = relatedResults(question, [selected], 6)

    return NextResponse.json({
      ok: true,
      query: question,
      selectedMeetingId: selected.id,
      answer,
      results,
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        created_at: m.created_at,
      })),
    })
  }

  // Cross-meeting
  const { answer, evidence } = await askAcrossMeetings(question, meetings)

  return NextResponse.json({
    ok: true,
    query: question,
    answer,
    results: evidence,
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      created_at: m.created_at,
    })),
  })
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const question = searchParams.get("q") ?? ""
  const meetingId = searchParams.get("meetingId")

  if (!question.trim()) {
    return NextResponse.json({
      ok: true,
      query: "",
      answer: "",
      results: [],
      meetings: [],
    })
  }

  try {
    return await handleSearch(question, user.id, meetingId)
  } catch (error) {
    console.error("Search AI failed:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as SearchBody
  const question = body.question ?? body.q ?? ""

  if (!question.trim()) {
    return NextResponse.json(
      { ok: false, error: "Question is required" },
      { status: 400 },
    )
  }

  try {
    return await handleSearch(question, user.id, body.meetingId)
  } catch (error) {
    console.error("Search AI failed:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    )
  }
}
