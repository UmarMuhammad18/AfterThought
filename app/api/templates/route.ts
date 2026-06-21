import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase"

// Scaffolding route for Follow-up Email Templates (placeholder only).
// These are static template shells — no AI generation is performed here.
// The actual send logic lives as scaffolding in lib/email.ts.
const PLACEHOLDER_TEMPLATES = [
  {
    id: "recap",
    name: "Meeting recap",
    subject: "Recap: {{meeting_title}}",
    body:
      "Hi all,\n\nThanks for joining {{meeting_title}}. Here is a quick recap:\n\n{{summary}}\n\nAction items:\n{{action_items}}\n\nBest,\n{{sender_name}}",
  },
  {
    id: "action-items",
    name: "Action items only",
    subject: "Your action items from {{meeting_title}}",
    body:
      "Hi {{recipient_name}},\n\nFollowing up on {{meeting_title}}, here are the action items assigned to you:\n\n{{action_items}}\n\nThanks,\n{{sender_name}}",
  },
  {
    id: "decisions",
    name: "Decisions summary",
    subject: "Decisions from {{meeting_title}}",
    body:
      "Hi team,\n\nFor the record, here are the decisions we made in {{meeting_title}}:\n\n{{decisions}}\n\nReach out with any questions.\n\n{{sender_name}}",
  },
]

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ ok: true, templates: PLACEHOLDER_TEMPLATES })
}
