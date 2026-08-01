import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COPY_RESET_MS = 2000

type CopyButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'onClick'
> & {
  label: string
  ariaLabel?: string
  onClick?: ComponentProps<typeof Button>['onClick']
} & (
    | { text: string; getText?: never }
    | { text?: never; getText: () => string | Promise<string> }
  )

export function CopyButton({
  text,
  label,
  ariaLabel,
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
  getText,
  onClick,
  ...buttonProps
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [copying, setCopying] = useState(false)

  const handleCopy = async (
    event: Parameters<NonNullable<CopyButtonProps['onClick']>>[0],
  ) => {
    onClick?.(event)
    if (event.defaultPrevented) return

    setCopyError(false)
    setCopying(true)
    try {
      await navigator.clipboard.writeText(getText ? await getText() : text)
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_RESET_MS)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), COPY_RESET_MS)
    } finally {
      setCopying(false)
    }
  }

  return (
    <Button
      {...buttonProps}
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled || copying}
      aria-label={ariaLabel ?? `Copy ${label}`}
      className={cn(
        'gap-2',
        copyError && 'border-destructive text-destructive',
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copying ? 'Copying…' : label}
    </Button>
  )
}
