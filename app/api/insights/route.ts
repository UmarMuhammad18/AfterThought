import { NextResponse } from 'next/server'
import { fakeInsights } from '@/lib/fakeData'

export async function GET() {
  return NextResponse.json({
    ok: true,
    insights: fakeInsights,
  })
}
