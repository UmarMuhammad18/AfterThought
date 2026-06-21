export type Meeting = {
  id: string
  title: string
  summary: string
  action_items: string[]
  segments: { speaker: string; text: string }[]
  created_at: string
}

export type SummaryItem = {
  category: 'Decisions' | 'Deadlines' | 'Action Items' | 'Blockers' | 'Topics'
  description: string
  items: string[]
}

export const meetingSummary: SummaryItem[] = [
  {
    category: 'Decisions',
    description: 'Resolved and agreed by the room',
    items: [
      'Adopt the Liquid Glass design language across all surfaces',
      'Ship the meeting memory engine in the Q3 beta cohort',
      'Keep pink strictly as a notification micro-accent',
    ],
  },
  {
    category: 'Deadlines',
    description: 'Dates committed during the call',
    items: [
      'Design system handoff — Jun 24',
      'Beta invite emails — Jul 01',
      'Public launch readiness review — Jul 15',
    ],
  },
  {
    category: 'Action Items',
    description: 'Owned tasks to follow up on',
    items: [
      'Maya to finalize the roadmap one-pager',
      'Devon to spike on real-time transcript indexing',
      'Lina to deliver mind-map component specs',
    ],
  },
  {
    category: 'Blockers',
    description: 'Risks that need attention',
    items: [
      'Transcription latency above target on long calls',
      'Awaiting legal sign-off on data retention policy',
    ],
  },
  {
    category: 'Topics',
    description: 'Themes discussed across the session',
    items: [
      'Roadmap prioritization',
      'Search relevance',
      'Onboarding flow',
      'Pricing tiers',
    ],
  },
]

export type TranscriptLine = {
  id: string
  speaker: string
  initials: string
  timestamp: string
  text: string
  keywords?: string[]
}

export const transcript: TranscriptLine[] = [
  {
    id: 't1',
    speaker: 'Maya Chen',
    initials: 'MC',
    timestamp: '00:42',
    text: 'Let us start with the roadmap. I think the meeting memory engine should anchor the Q3 beta.',
    keywords: ['roadmap', 'beta'],
  },
  {
    id: 't2',
    speaker: 'Devon Park',
    initials: 'DP',
    timestamp: '01:18',
    text: 'Agreed. The main blocker is transcription latency on longer calls — we need real-time indexing.',
    keywords: ['blocker', 'transcription latency', 'indexing'],
  },
  {
    id: 't3',
    speaker: 'Lina Ortiz',
    initials: 'LO',
    timestamp: '02:05',
    text: 'On design, I will deliver the mind-map component specs by Friday so engineering can build in parallel.',
    keywords: ['design', 'mind-map'],
  },
  {
    id: 't4',
    speaker: 'Sam Reed',
    initials: 'SR',
    timestamp: '03:27',
    text: 'Customer discovery suggests search relevance matters more than raw transcript length. People want answers.',
    keywords: ['search relevance', 'discovery'],
  },
  {
    id: 't5',
    speaker: 'Priya Nair',
    initials: 'PN',
    timestamp: '04:51',
    text: 'For pricing, a usage-based tier on top of a flat team plan tested best with the Northwind account.',
    keywords: ['pricing', 'tiers'],
  },
  {
    id: 't6',
    speaker: 'Maya Chen',
    initials: 'MC',
    timestamp: '06:10',
    text: 'Great. Decision: we ship the beta in Q3 and keep the Liquid Glass aesthetic consistent everywhere.',
    keywords: ['decision', 'beta', 'Liquid Glass'],
  },
]

export type Insight = {
  title: string
  value: string
  detail: string
}

export const topTopics = [
  { label: 'Roadmap', weight: 92 },
  { label: 'Search relevance', weight: 78 },
  { label: 'Pricing', weight: 64 },
  { label: 'Onboarding', weight: 51 },
  { label: 'Latency', weight: 44 },
]

export const topKeywords = [
  { label: 'beta', size: 'xl' },
  { label: 'roadmap', size: 'lg' },
  { label: 'mind-map', size: 'md' },
  { label: 'pricing', size: 'lg' },
  { label: 'transcription', size: 'sm' },
  { label: 'search', size: 'xl' },
  { label: 'onboarding', size: 'md' },
  { label: 'retention', size: 'sm' },
  { label: 'Liquid Glass', size: 'lg' },
  { label: 'indexing', size: 'md' },
  { label: 'launch', size: 'sm' },
  { label: 'discovery', size: 'md' },
] as const

export const sentiment = { positive: 68, neutral: 24, negative: 8 }

export const decisionTimeline = [
  { date: 'Jun 18', title: 'Ship beta in Q3', meeting: 'Q3 Product Strategy Sync' },
  { date: 'Jun 17', title: 'Adopt Liquid Glass system', meeting: 'Design Review' },
  { date: 'Jun 16', title: 'Prioritize search relevance', meeting: 'Customer Discovery' },
  { date: 'Jun 15', title: 'Usage-based pricing tier', meeting: 'Go-To-Market Planning' },
]

export const peopleMentions = [
  { name: 'Maya Chen', initials: 'MC', mentions: 48 },
  { name: 'Devon Park', initials: 'DP', mentions: 39 },
  { name: 'Lina Ortiz', initials: 'LO', mentions: 31 },
  { name: 'Sam Reed', initials: 'SR', mentions: 27 },
  { name: 'Priya Nair', initials: 'PN', mentions: 22 },
]

export const examplePrompts = [
  'What did we decide about pricing?',
  'List every action item assigned to Devon',
  'Summarize blockers across last week',
  'When is the beta launching?',
]

export const topicFrequency = [
  { week: 'W1', Roadmap: 12, Pricing: 6, Search: 9 },
  { week: 'W2', Roadmap: 18, Pricing: 11, Search: 14 },
  { week: 'W3', Roadmap: 15, Pricing: 9, Search: 21 },
  { week: 'W4', Roadmap: 22, Pricing: 16, Search: 19 },
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

