import { NextResponse } from 'next/server'
import { fakeTranscript } from '@/lib/fakeData'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      console.log('Received JSON transcription text from desktop companion:', body)
      return NextResponse.json(
        {
          ok: true,
          message: 'Transcription segment appended.',
          transcript: body.text || 'No text received',
        },
        { headers: corsHeaders },
      )
    }

    if (contentType.includes('audio/webm') || contentType.includes('multipart/form-data')) {
      const audioBlob = contentType.includes('audio/webm')
        ? await request.blob()
        : (await request.formData()).get('audio')

      console.log(
        'Received audio payload from extension:',
        audioBlob instanceof Blob ? 'blob present' : 'missing blob',
      )

      return NextResponse.json(
        {
          ok: true,
          message: 'Audio received and transcribed successfully.',
          transcript: fakeTranscript.map((line) => `${line.speaker}: ${line.text}`).join('\n'),
          segments: fakeTranscript,
        },
        { headers: corsHeaders },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Request received.',
        transcript: 'No specific format processed.',
      },
      { headers: corsHeaders },
    )
  } catch (error: any) {
    console.error('Error in transcribe route:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
}
