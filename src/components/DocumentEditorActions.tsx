import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button } from '@/components/ui/button'
import { CopySnippet } from '@/components/CopySnippet'

export function DocumentEditorActions(props: DocumentEditorActionsProps) {
  const { onSubmit, onReset, disabled, mode } = props

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={onSubmit}
          disabled={disabled}
          className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
        >
          Save
        </Button>
        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
        {mode === 'view' && <CopySnippet url={props.documentUrl} />}
      </div>
    </div>
  )
}
