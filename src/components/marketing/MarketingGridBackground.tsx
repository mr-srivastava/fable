import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MarketingGridBackground({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('marketing-shell relative overflow-hidden', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 marketing-grid-mask"
      />
      <div aria-hidden className="marketing-grid-plus pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  )
}
