import { Download, FileCode2 } from 'lucide-react'
import type { ExportViewState } from '@/lib/document-editor-model'
import { Button } from '@/components/ui/button'

type DocumentExportMenuProps = {
  state: ExportViewState
  generateTypeScript: () => Promise<string>
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
  state,
  generateTypeScript,
}: DocumentExportMenuProps) {
  const disabled = state.status === 'unavailable'
  const generating = state.status === 'generating'
  const jsonSchema =
    state.status === 'unavailable' ? undefined : state.jsonSchema

  async function withTypeScript(
    action: (source: string) => void | Promise<void>,
  ) {
    try {
      await action(await generateTypeScript())
    } catch {
      // The editor machine exposes the structured export failure.
    }
  }

  return (
    <details className="group relative">
      <summary
        aria-disabled={disabled || generating}
        onClick={(event) => {
          if (disabled || generating) event.preventDefault()
        }}
        onKeyDown={(event) => {
          if (
            (disabled || generating) &&
            (event.key === 'Enter' || event.key === ' ')
          ) {
            event.preventDefault()
          }
        }}
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
            jsonSchema &&
            void navigator.clipboard
              .writeText(jsonSchema)
              .catch(() => undefined)
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
        {state.status === 'failed' && (
          <p role="alert" className="px-2 py-1 text-xs text-destructive">
            {state.message}
          </p>
        )}
      </div>
    </details>
  )
}
