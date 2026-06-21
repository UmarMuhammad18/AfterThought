'use client'

import { useState } from 'react'
import { User, Bell, Mic, Shield, Palette } from 'lucide-react'
import { InsightCard } from '@/components/insight-card'

function Toggle({ defaultOn = false, label }: { defaultOn?: boolean; label: string }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn((v) => !v)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full border border-glass-border transition-colors ${
        on ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-foreground transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function Row({
  label,
  desc,
  children,
}: {
  label: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-glass-border py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your AfterThought account and capture preferences.
        </p>
      </div>

      <InsightCard icon={User} title="Profile">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full border border-glass-border bg-secondary text-base font-semibold text-secondary-foreground">
            MC
          </span>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Maya Chen</span>
            <span className="text-sm text-muted-foreground">maya@afterthought.ai</span>
          </div>
        </div>
      </InsightCard>

      <InsightCard icon={Mic} title="Capture">
        <Row label="Auto-record meetings" desc="Start recording when a call begins">
          <Toggle defaultOn label="Auto-record meetings" />
        </Row>
        <Row label="Live transcription" desc="Stream transcript in real time">
          <Toggle defaultOn label="Live transcription" />
        </Row>
        <Row label="Speaker detection" desc="Identify and label each speaker">
          <Toggle defaultOn label="Speaker detection" />
        </Row>
      </InsightCard>

      <InsightCard icon={Bell} title="Notifications">
        <Row label="Summary ready" desc="Notify me when a summary is generated">
          <Toggle defaultOn label="Summary ready" />
        </Row>
        <Row label="Action item reminders" desc="Nudge me about open action items">
          <Toggle label="Action item reminders" />
        </Row>
      </InsightCard>

      <InsightCard icon={Shield} title="Privacy">
        <Row label="Retain transcripts" desc="Keep raw transcripts for 90 days">
          <Toggle defaultOn label="Retain transcripts" />
        </Row>
        <Row label="Share insights with team" desc="Allow teammates to view summaries">
          <Toggle label="Share insights with team" />
        </Row>
      </InsightCard>

      <InsightCard icon={Palette} title="Appearance">
        <Row label="Liquid Glass theme" desc="Frosted, translucent surfaces">
          <Toggle defaultOn label="Liquid Glass theme" />
        </Row>
      </InsightCard>
    </div>
  )
}
