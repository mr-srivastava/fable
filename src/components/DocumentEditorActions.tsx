import { MoreHorizontal } from 'lucide-react'
import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button, buttonVariants } from '@/components/ui/button'
import { CopyButton } from '@/components/CopyButton'
import { CopySnippet, CopySnippetMenuItems } from '@/components/CopySnippet'
import { cn } from '@/lib/utils'
import {
  DocumentExportMenu,
  DocumentExportMenuItems,
} from '@/components/DocumentExportMenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
                    'animate-pulse bg-warning shadow-[0_0_0_4px_color-mix(in_oklch,var(--warning)_20%,transparent)]',
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
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            onClick={() => void commands.submit().catch(() => undefined)}
            disabled={submitDisabled}
            className="transition-transform enabled:scale-[1.02] motion-reduce:enabled:scale-100"
          >
            {model.submission.status === 'saving' ? 'Saving…' : submitLabel}
          </Button>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <SecondaryActions commands={commands} model={model} mode={mode} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
                'md:hidden',
              )}
              aria-label="More specimen actions"
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start"
                      disabled={model.submission.status === 'saving'}
                      onClick={commands.reset}
                    />
                  }
                >
                  Reset
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    disabled={model.exports.status === 'unavailable'}
                  >
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-52">
                    <DocumentExportMenuItems
                      state={model.exports}
                      generateTypeScript={commands.generateTypeScript}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {!isCreate && (
                  <>
                    <DropdownMenuItem
                      render={
                        <CopyButton
                          text={model.payload.value}
                          label="JSON"
                          ariaLabel="Copy saved JSON"
                          variant="ghost"
                          className="w-full justify-start"
                        />
                      }
                    />
                    <CopySnippetMenuItems
                      pageUrl={mode.documentUrl}
                      apiUrl={mode.apiUrl}
                    />
                  </>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
