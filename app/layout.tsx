import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AfterThought — record and remember any call',
  description:
    'AfterThought records any call on any device — WhatsApp, Zoom, Meet, Teams, phone or in person — and turns it into searchable notes, action items and interview scorecards.',
  generator: 'v0.app',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0c0d12',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark bg-background ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased min-h-svh">
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
