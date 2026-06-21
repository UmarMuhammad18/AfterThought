import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { Hero } from '@/components/marketing/hero'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { TechStack } from '@/components/marketing/tech-stack'
import { Screenshots } from '@/components/marketing/screenshots'
import { Team } from '@/components/marketing/team'
import { CtaBand } from '@/components/marketing/cta-band'

export const metadata: Metadata = {
  title: 'AfterThought — Your AI-powered meeting memory',
  description:
    'AfterThought records, transcribes, and organises every meeting automatically — searchable summaries, action items, and speaker insights powered by AI.',
}

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNav />
      <div className="flex-1">
        <Hero />
        <FeaturesGrid />
        <HowItWorks />
        <TechStack />
        <Screenshots />
        <Team />
        <CtaBand />
      </div>
      <MarketingFooter />
    </div>
  )
}
