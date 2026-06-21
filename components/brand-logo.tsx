import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {/* Bold geometric AT mark with a single pink dot — matches brand */}
      <span className="flex items-baseline font-heading text-xl font-extrabold tracking-tight text-foreground">
        <span>AT</span>
        {/* pink micro-accent ONLY */}
        <span className="ml-0.5 size-1.5 translate-y-0 rounded-full bg-pink" aria-hidden />
      </span>
      {showWordmark && (
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          AfterThought
        </span>
      )}
    </span>
  )
}
