import { NextResponse } from 'next/server'
import { fakeSummaries } from '@/lib/fakeData'

export async function GET() {
  return NextResponse.json({
    ok: true,
    summaries: fakeSummaries,
  })
}
