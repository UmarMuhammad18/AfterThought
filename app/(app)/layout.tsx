import { TopNav } from '@/components/top-nav'
import { FloatingAssistant } from '@/components/floating-assistant'
import { AuthGate } from '@/components/auth-gate'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TopNav />
      <main className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <AuthGate>{children}</AuthGate>
      </main>
      <FloatingAssistant />
    </>
  )
}
