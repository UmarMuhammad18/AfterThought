import { NextResponse } from 'next/server'
import { fakeMindMapNodes } from '@/lib/fakeData'

export async function GET() {
  return NextResponse.json({
    ok: true,
    nodes: fakeMindMapNodes,
  })
}
