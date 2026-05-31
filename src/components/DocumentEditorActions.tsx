import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/CopyButton'
import { CopySnippet } from '@/components/CopySnippet'
import { cn } from '@/lib/utils'

export function DocumentEditorActions(props: DocumentEditorActionsProps) {
  const { onSubmit, onReset, disabled, mode } = props
  const submitLabel = mode === 'create' ? 'Create specimen' : 'Update specimen'

  return (
    <div
      className="mt-8 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/85 md:sticky md:bottom-0 md:z-30"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {mode === 'view' && (
            <span
              className={cn(
                'size-2 rounded-full bg-success',
                props.hasUnsavedChanges &&
                  'animate-pulse bg-amber-400 shadow-[0_0_0_4px_rgb(251_191_36_/_0.18)]',
              )}
              aria-hidden="true"
            />
          )}
          {mode === 'create'
            ? 'Unsaved specimen'
            : props.hasUnsavedChanges
              ? 'Unsaved changes'
              : 'Saved specimen'}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            onClick={onSubmit}
            disabled={disabled}
            className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
          >
            {submitLabel}
          </Button>
          <Button variant="outline" onClick={onReset}>
            Reset
          </Button>
          {mode === 'view' && (
            <>
              <CopyButton
                text={props.json}
                label="JSON"
                ariaLabel="Copy saved JSON"
              />
              <CopySnippet pageUrl={props.documentUrl} apiUrl={props.apiUrl} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
