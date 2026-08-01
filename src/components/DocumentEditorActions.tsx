import { MoreHorizontal } from 'lucide-react'
import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/CopyButton'
import { CopySnippet } from '@/components/CopySnippet'
import { cn } from '@/lib/utils'
import { DocumentExportMenu } from '@/components/DocumentExportMenu'

function SecondaryActions({
  commands,
  model,
  mode,
}: Pick<DocumentEditorActionsProps, 'commands' | 'model' | 'mode'>) {
  const isCreate = mode.type === 'create'

  return (
    <>
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
    </>
  )
}

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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
          {submitUnavailableReason && (
            <p
              id="submit-unavailable-reason"
              className="mt-1 line-clamp-2 text-xs leading-tight text-destructive"
            >
              {submitUnavailableReason}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            onClick={() => void commands.submit().catch(() => undefined)}
            disabled={submitDisabled}
            aria-describedby={
              submitUnavailableReason ? 'submit-unavailable-reason' : undefined
            }
            className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
          >
            {model.submission.status === 'saving' ? 'Saving…' : submitLabel}
          </Button>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <SecondaryActions commands={commands} model={model} mode={mode} />
          </div>
          <details className="group relative md:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More specimen actions</span>
            </summary>
            <div className="absolute right-0 bottom-11 z-50 flex min-w-56 flex-col items-stretch gap-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md [&>*]:w-full [&>*]:justify-start">
              <SecondaryActions commands={commands} model={model} mode={mode} />
            </div>
          </details>
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
