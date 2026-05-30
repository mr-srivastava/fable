import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EnumValuesInputProps = {
  value?: Array<string>
  onChange: (value?: Array<string>) => void
}

function parseEnumValues(input: string): Array<string> {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueValues(values: Array<string>): Array<string> {
  return Array.from(new Set(values))
}

export function EnumValuesInput({ value, onChange }: EnumValuesInputProps) {
  const [draft, setDraft] = useState('')
  const values = value ?? []

  function commitDraft() {
    const nextValues = parseEnumValues(draft)
    if (nextValues.length === 0) {
      setDraft('')
      return
    }

    onChange(uniqueValues([...values, ...nextValues]))
    setDraft('')
  }

  function removeValue(valueToRemove: string) {
    const nextValues = values.filter((item) => item !== valueToRemove)
    onChange(nextValues.length > 0 ? nextValues : undefined)
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {values.map((enumValue) => (
        <Badge key={enumValue} variant="secondary" className="max-w-full gap-1">
          <span className="truncate">{enumValue}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="-mr-1 size-4 rounded-full"
            onClick={() => removeValue(enumValue)}
            aria-label={`Remove ${enumValue}`}
          >
            <XIcon data-icon="inline-start" />
          </Button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            commitDraft()
          }
        }}
        placeholder={values.length > 0 ? 'Add value' : 'personal,business'}
        className="h-8 min-w-28 flex-1"
      />
    </div>
  )
}
