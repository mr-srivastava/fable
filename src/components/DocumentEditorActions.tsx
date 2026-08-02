import { MoreHorizontal, Share2 } from 'lucide-react'
import type { DocumentEditorActionsProps } from './JsonEditorPanel.types'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DocumentCopyMenu,
  DocumentCopyMenuItems,
} from '@/components/DocumentCopyMenu'
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
        <DocumentCopyMenu
          json={model.payload.value}
          pageUrl={mode.documentUrl}
          apiUrl={mode.apiUrl}
        />
      )}
    </>
  )
}

function createStatusLabel(
  submission: DocumentEditorActionsProps['model']['submission'],
) {
  if (submission.status === 'unavailable') {
    switch (submission.reason) {
      case 'invalidJson':
        return 'Fix JSON to save'
      case 'inferring':
        return 'Updating contract…'
      case 'invalidContract':
        return 'Fix contract to save'
      case 'contractViolations':
        return 'Resolve contract issues to save'
    }
  }
  if (submission.status === 'saving') return 'Saving draft…'
  return 'Draft — not shared yet'
}

export function DocumentEditorActions(props: DocumentEditorActionsProps) {
  const { commands, model, mode } = props
  const isCreate = mode.type === 'create'
  const submitLabel = isCreate ? 'Save & share' : 'Update specimen'
  const submitDisabled =
    model.submission.status === 'unavailable' ||
    model.submission.status === 'saving'
  const statusLabel = isCreate
    ? createStatusLabel(model.submission)
    : model.hasUnsavedChanges
      ? 'Unsaved changes'
      : 'Saved specimen'

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md"
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
            {statusLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <div className="hidden items-center gap-2 md:flex">
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
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Copy</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-44">
                      <DocumentCopyMenuItems
                        json={model.payload.value}
                        pageUrl={mode.documentUrl}
                        apiUrl={mode.apiUrl}
                      />
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => void commands.submit().catch(() => undefined)}
            disabled={submitDisabled}
          >
            {model.submission.status === 'saving' ? (
              'Saving…'
            ) : (
              <>
                {isCreate && <Share2 aria-hidden className="size-4" />}
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </div>
      {model.submission.status === 'failed' && (
        <p
          role="alert"
          className="animate-reveal-in mx-auto mt-2 max-w-7xl text-xs text-destructive"
        >
          {model.submission.message}
        </p>
      )}
    </div>
  )
}
