import { redirect } from 'next/navigation'

// Older extension builds open /recording/:id after upload; the meeting page
// now shows processing progress too.
export default async function RecordingRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/meeting/${id}`)
}
