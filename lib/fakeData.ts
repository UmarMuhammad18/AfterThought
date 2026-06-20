export type FakeMeeting = {
  id: string;
  title: string;
  date: string;
  participants: string[];
  topic: string;
};

export type FakeTranscriptLine = {
  id: string;
  speaker: string;
  text: string;
  keywords: string[];
};

export type FakeSummaryItem = {
  category: string;
  description: string;
  items: string[];
};

export type FakeInsight = {
  id: string;
  title: string;
  body: string;
  confidence: string;
};

export type FakeMindMapNode = {
  id: string;
  label: string;
  children?: string[];
};

export const fakeMeetings: FakeMeeting[] = [
  {
    id: 'meeting-1',
    title: 'Customer Discovery Sync',
    date: 'Jun 18, 2026',
    participants: ['Maya', 'Devon', 'Lina'],
    topic: 'Research',
  },
  {
    id: 'meeting-2',
    title: 'Product Roadmap Review',
    date: 'Jun 15, 2026',
    participants: ['Riley', 'Avery', 'Jordan'],
    topic: 'Planning',
  },
];

export const fakeTranscript: FakeTranscriptLine[] = [
  {
    id: 't1',
    speaker: 'Maya',
    text: 'We should prioritize search relevance before we expand the feature set.',
    keywords: ['search relevance', 'feature set'],
  },
  {
    id: 't2',
    speaker: 'Devon',
    text: 'The transcript indexing pipeline is improving, but we still need better latency tracking.',
    keywords: ['transcript indexing', 'latency'],
  },
  {
    id: 't3',
    speaker: 'Lina',
    text: 'The mind-map summary should highlight blockers and proposed next steps clearly.',
    keywords: ['mind-map', 'blockers'],
  },
];

export const fakeSummaries: FakeSummaryItem[] = [
  {
    category: 'Decisions',
    description: 'Key decisions made during the meeting.',
    items: [
      'Prioritize search relevance for the next release.',
      'Keep transcript indexing work in the current sprint.',
    ],
  },
  {
    category: 'Action Items',
    description: 'Next steps assigned to team members.',
    items: [
      'Maya to share the revised roadmap notes.',
      'Devon to review latency metrics.',
    ],
  },
  {
    category: 'Blockers',
    description: 'Risks or blockers discussed.',
    items: [
      'Long transcript processing remains a concern.',
      'Design feedback needs one more review cycle.',
    ],
  },
];

export const fakeInsights: FakeInsight[] = [
  {
    id: 'i1',
    title: 'Search relevance is the primary customer concern',
    body: 'Customers repeatedly ask for faster, clearer answers instead of longer transcripts.',
    confidence: 'High',
  },
  {
    id: 'i2',
    title: 'Latency is the main operational blocker',
    body: 'The team agreed that backend speed is the current bottleneck for scale.',
    confidence: 'Medium',
  },
];

export const fakeMindMapNodes: FakeMindMapNode[] = [
  { id: 'root', label: 'Meeting Summary', children: ['search', 'latency', 'design'] },
  { id: 'search', label: 'Search Relevance' },
  { id: 'latency', label: 'Latency Tracking' },
  { id: 'design', label: 'Design Feedback' },
];
