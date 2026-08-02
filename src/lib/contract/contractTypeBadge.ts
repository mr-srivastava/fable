import type { JsonFieldType } from '@shared/document'
import { cn } from '@/lib/utils'

const TYPE_BADGE_CLASSES: Record<JsonFieldType, string> = {
  string:
    'border-syntax-string/30 bg-syntax-string/12 text-syntax-string [&]:text-syntax-string',
  number:
    'border-syntax-number/30 bg-syntax-number/12 text-syntax-number [&]:text-syntax-number',
  boolean:
    'border-syntax-boolean/30 bg-syntax-boolean/12 text-syntax-boolean [&]:text-syntax-boolean',
  null: 'border-syntax-null/30 bg-syntax-null/15 text-syntax-null [&]:text-syntax-null',
  object:
    'border-syntax-property/30 bg-syntax-property/12 text-syntax-property [&]:text-syntax-property',
  array: 'border-primary/30 bg-primary/12 text-primary [&]:text-primary',
  unknown: 'border-border bg-muted text-muted-foreground',
}

export function contractTypeBadgeClass(type: JsonFieldType): string {
  return cn(
    'font-mono text-[0.65rem] font-medium tracking-tight',
    TYPE_BADGE_CLASSES[type],
  )
}
