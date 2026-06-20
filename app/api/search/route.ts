import { NextResponse } from 'next/server'
import { fakeMeetings, fakeTranscript, fakeSummaries } from '@/lib/fakeData'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const q = query.trim().toLowerCase()

  const transcriptResults = fakeTranscript
    .filter((item) => item.text.toLowerCase().includes(q))
    .map((item) => ({
      type: 'transcript',
      meetingId: fakeMeetings[0]?.id ?? 'meeting-1',
      text: item.text,
      speaker: item.speaker,
    }))

  const summaryResults = fakeSummaries
    .flatMap((summary) =>
      summary.items
        .filter((item) => item.toLowerCase().includes(q))
        .map((item) => ({
          type: 'summary',
          meetingId: fakeMeetings[0]?.id ?? 'meeting-1',
          text: item,
          category: summary.category,
        })),
    )

  const results = [...transcriptResults, ...summaryResults]

  return NextResponse.json({
    ok: true,
    query,
    results,
  })
}
