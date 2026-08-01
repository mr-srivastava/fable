import { useState } from 'react'
import { Download, FileCode2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DocumentExportMenuProps = {
  jsonSchema?: string
  generateTypeScript: () => Promise<string>
  disabled: boolean
}

function downloadText(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function DocumentExportMenu({
  jsonSchema,
  generateTypeScript,
  disabled,
}: DocumentExportMenuProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>()

  async function withTypeScript(action: (source: string) => void) {
    setGenerating(true)
    setError(undefined)
    try {
      action(await generateTypeScript())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <details className="group relative">
      <summary
        aria-disabled={disabled || generating}
        className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent group-open:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        <FileCode2 className="size-4" />
        {generating ? 'Generating…' : 'Export'}
      </summary>
      <div className="absolute bottom-11 right-0 z-50 grid min-w-52 gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          disabled={disabled}
          onClick={() =>
            jsonSchema && navigator.clipboard.writeText(jsonSchema)
          }
        >
          Copy JSON Schema
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          disabled={disabled}
          onClick={() =>
            jsonSchema &&
            downloadText(
              'specimen.schema.json',
              jsonSchema,
              'application/schema+json',
            )
          }
        >
          <Download /> Download JSON Schema
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          disabled={disabled || generating}
          onClick={() =>
            withTypeScript((source) => navigator.clipboard.writeText(source))
          }
        >
          Copy TypeScript
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          disabled={disabled || generating}
          onClick={() =>
            withTypeScript((source) =>
              downloadText('specimen.types.ts', source, 'text/typescript'),
            )
          }
        >
          <Download /> Download TypeScript
        </Button>
        {error && <p className="px-2 py-1 text-xs text-destructive">{error}</p>}
      </div>
    </details>
  )
}
