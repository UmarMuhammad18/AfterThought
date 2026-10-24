// Shared client-side types. (Sample/fake data was removed — every page reads real data.)

export type MeetingStatus = 'recording' | 'processing' | 'ready' | 'failed'

export type Meeting = {
  id: string
  title: string
  summary: string
  action_items: string[]
  segments: { speaker: string; text: string; timestamp?: string; start?: number; end?: number }[]
  created_at: string
  status?: MeetingStatus
  source?: string
  platform?: string | null
  kind?: 'meeting' | 'interview'
  duration_seconds?: number | null
  error?: string | null
}

export const examplePrompts = [
  'What did we decide last week?',
  'List every action item assigned to me',
  'Which candidates mentioned React experience?',
  'Summarize open risks across my calls',
]

export type CalendarEvent = {
  id: string
  meeting_id: string
  title: string
  due_date: string
  assignee: string
  created_at: string
}

export type Speaker = {
  id: string
  name: string
  meetings: string[]
  mentions: any
  action_items: string[]
}

