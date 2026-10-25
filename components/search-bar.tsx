'use client'

import { Search, Sparkles, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchBar({
  className,
  placeholder = 'Ask anything about your meetings…',
  size = 'md',
  value,
  onChange,
  onSubmit,
  autoFocus,
}: {
  className?: string
  placeholder?: string
  size?: 'md' | 'lg'
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        onSubmit?.(String(data.get('q') ?? value ?? ''))
      }}
      className={cn(
        'glass-neon group flex items-center gap-3 rounded-2xl transition-shadow duration-200 focus-within:neon-glow',
        size === 'lg' ? 'h-16 px-5' : 'h-12 px-4',
        className,
      )}
    >
      <Search
        className={cn(
          'shrink-0 text-primary',
          size === 'lg' ? 'size-5' : 'size-4',
        )}
      />
      <input
        name="q"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label="Search your meetings"
        className={cn(
          'w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none',
          size === 'lg' ? 'text-base' : 'text-sm',
        )}
      />
      <div className="hidden items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground sm:flex">
        <Sparkles className="size-3 text-primary" />
        AI
      </div>
      <kbd className="hidden items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[10px] text-muted-foreground md:inline-flex">
        <CornerDownLeft className="size-3" />
      </kbd>
    </form>
  )
}
