'use client'

import { useEffect, useState } from 'react'
import { Mail, AlertTriangle, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/api-client'

type Template = {
  id: string
  name: string
  subject: string
  body: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch('/api/templates')
        const data = await res.json()
        if (data.ok && Array.isArray(data.templates)) {
          setTemplates(data.templates)
        }
      } catch (err) {
        console.error('Failed to load templates', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Mail className="size-8 text-primary" />
          Follow-up Email Templates
        </h1>
        <p className="text-muted-foreground">
          Reusable email shells for post-meeting follow-ups. These are placeholders — automatic
          generation and sending are not yet wired up.
        </p>
      </div>

      <div className="glass rounded-2xl border border-amber-500/20 p-4 text-sm text-muted-foreground">
        Placeholder scaffolding. Variables like {'{{meeting_title}}'}, {'{{summary}}'}, and{' '}
        {'{{action_items}}'} are filled in when follow-up sending is implemented.
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((t) => (
            <article key={t.id} className="glass flex flex-col gap-3 rounded-2xl p-5">
              <header className="flex flex-col gap-1">
                <h2 className="font-heading text-lg font-semibold text-foreground">{t.name}</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground/80">Subject:</span> {t.subject}
                </p>
              </header>
              <pre className="whitespace-pre-wrap rounded-xl border border-glass-border bg-secondary p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {t.body}
              </pre>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
          <AlertTriangle className="size-8 opacity-50" />
          <p>No templates found.</p>
        </div>
      )}
    </div>
  )
}
