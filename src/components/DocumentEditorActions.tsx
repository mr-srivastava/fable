import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/CopyButton'
import { CopySnippet } from '@/components/CopySnippet'
import { cn } from '@/lib/utils'
import { DocumentExportMenu } from '@/components/DocumentExportMenu'

export function DocumentEditorActions(props: DocumentEditorActionsProps) {
  const { commands, model, mode } = props
  const isCreate = mode.type === 'create'
  const submitLabel = isCreate ? 'Create specimen' : 'Update specimen'
  const submitDisabled =
    model.submission.status === 'unavailable' ||
    model.submission.status === 'saving'
  const submitUnavailableReason =
    model.submission.status === 'unavailable'
      ? {
          invalidJson: 'Fix invalid JSON before saving.',
          inferring: 'Wait for contract inference to finish.',
          invalidContract: 'Fix the invalid contract before saving.',
          contractViolations: 'Resolve contract violations before saving.',
        }[model.submission.reason]
      : undefined

  return (
    <div
      className="mt-8 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/85 md:sticky md:bottom-0 md:z-30"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {!isCreate && (
            <span
              className={cn(
                'size-2 rounded-full bg-success',
                model.hasUnsavedChanges &&
                  'animate-pulse bg-amber-400 shadow-[0_0_0_4px_rgb(251_191_36_/_0.18)]',
              )}
              aria-hidden="true"
            />
          )}
          {isCreate
            ? 'Unsaved specimen'
            : model.hasUnsavedChanges
              ? 'Unsaved changes'
              : 'Saved specimen'}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            onClick={() => void commands.submit().catch(() => undefined)}
            disabled={submitDisabled}
            title={submitUnavailableReason}
            className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
          >
            {model.submission.status === 'saving' ? 'Saving…' : submitLabel}
          </Button>
          <Button
            variant="outline"
            disabled={model.submission.status === 'saving'}
            onClick={commands.reset}
          >
            Reset
          </Button>
          <DocumentExportMenu
            state={model.exports}
            generateTypeScript={commands.generateTypeScript}
          />
          {!isCreate && (
            <>
              <CopyButton
                text={model.payload.value}
                label="JSON"
                ariaLabel="Copy saved JSON"
              />
              <CopySnippet pageUrl={mode.documentUrl} apiUrl={mode.apiUrl} />
            </>
          )}
        </div>
      </div>
      {model.submission.status === 'failed' && (
        <p
          role="alert"
          className="mx-auto mt-2 max-w-7xl text-xs text-destructive"
        >
          {model.submission.message}
        </p>
      )}
    </div>
  )
}
