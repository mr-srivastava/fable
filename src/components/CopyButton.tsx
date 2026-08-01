import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COPY_RESET_MS = 2000

type CopyButtonProps = {
  label: string
  ariaLabel?: string
  variant?: 'outline' | 'ghost' | 'default'
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
  className?: string
  disabled?: boolean
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
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [copying, setCopying] = useState(false)

  const handleCopy = async () => {
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
