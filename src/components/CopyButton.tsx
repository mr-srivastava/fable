import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COPY_RESET_MS = 2000

interface CopyButtonProps {
  text: string
  label: string
  ariaLabel?: string
  variant?: 'outline' | 'ghost' | 'default'
  size?: 'default' | 'sm' | 'icon' | 'icon-sm'
  className?: string
}

export function CopyButton({
  text,
  label,
  ariaLabel,
  variant = 'outline',
  size = 'sm',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleCopy = async () => {
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_RESET_MS)
    } catch {
      setCopyError(true)
      setTimeout(() => setCopyError(false), COPY_RESET_MS)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
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
      {label}
    </Button>
  )
}
