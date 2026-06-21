import type { ReactNode } from 'react'

type BrowserMockProps = {
  label: string
  children: ReactNode
  className?: string
}

/** A frosted-glass faux browser window used as a screenshot placeholder. */
export function BrowserMock({ label, children, className }: BrowserMockProps) {
  return (
    <div className={`glass overflow-hidden rounded-2xl ${className ?? ''}`}>
      <div className="flex items-center gap-2 border-b border-glass-border px-4 py-3">
        <span className="size-3 rounded-full bg-destructive/70" aria-hidden />
        <span className="size-3 rounded-full bg-pink/70" aria-hidden />
        <span className="size-3 rounded-full bg-primary/70" aria-hidden />
        <span className="ml-3 truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
