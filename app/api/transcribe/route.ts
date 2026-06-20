import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'Transcription request received.',
    transcript: 'Placeholder transcript from the API.',
  })
}
