import { Download, FileCode2 } from 'lucide-react'
import type { ExportViewState } from '@/lib/document-editor-model'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/CopyButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

export function DocumentExportMenuItems({
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
    <DropdownMenuGroup>
      {jsonSchema && (
        <DropdownMenuItem asChild>
          <CopyButton
            text={jsonSchema}
            label="Copy JSON Schema"
            ariaLabel="Copy JSON Schema"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={disabled}
          />
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        disabled={disabled}
        onSelect={() =>
          jsonSchema &&
          downloadText(
            'specimen.schema.json',
            jsonSchema,
            'application/schema+json',
          )
        }
      >
        <Download /> Download JSON Schema
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <CopyButton
          getText={generateTypeScript}
          label="Copy TypeScript"
          ariaLabel="Copy TypeScript"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={disabled || generating}
        />
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={disabled || generating}
        onSelect={() =>
          void withTypeScript((source) =>
            downloadText('specimen.types.ts', source, 'text/typescript'),
          )
        }
      >
        <Download /> Download TypeScript
      </DropdownMenuItem>
      {state.status === 'failed' && (
        <p role="alert" className="px-2 py-1 text-xs text-destructive">
          {state.message}
        </p>
      )}
    </DropdownMenuGroup>
  )
}

export function DocumentExportMenu(props: DocumentExportMenuProps) {
  const disabled = props.state.status === 'unavailable'
  const generating = props.state.status === 'generating'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <FileCode2 />
          {generating ? 'Generating…' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="min-w-52">
        <DocumentExportMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
