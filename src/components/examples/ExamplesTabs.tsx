import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { JsonDocumentExample } from '@shared/document'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type ExamplesTabsProps = {
  examples: Array<JsonDocumentExample>
  activeExampleId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  validationCounts: Record<string, number>
  canAdd: boolean
  fillHeight?: boolean
  children: ReactNode
}

export function ExamplesTabs({
  examples,
  activeExampleId,
  onSelect,
  onRename,
  onAdd,
  onDelete,
  validationCounts,
  canAdd,
  fillHeight = false,
  children,
}: ExamplesTabsProps) {
  const activeExample =
    examples.find((example) => example.id === activeExampleId) ?? examples[0]
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(activeExample.name)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const cancelRenameRef = useRef(false)
  const beginRenameRef = useRef(false)

  useEffect(() => {
    setRenaming(false)
    setDraftName(activeExample.name)
  }, [activeExample.id, activeExample.name])

  function focusActiveTab() {
    requestAnimationFrame(() => tabRefs.current.get(activeExampleId)?.focus())
  }

  function commitRename() {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false
    } else if (draftName !== activeExample.name) {
      onRename(activeExample.id, draftName)
    }
    setRenaming(false)
    focusActiveTab()
  }

  return (
    <Tabs
      value={activeExampleId}
      onValueChange={onSelect}
      className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'gap-3'}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Examples</h3>
          <p className="text-xs text-muted-foreground">
            {examples.length} {examples.length === 1 ? 'payload' : 'payloads'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAdd}
          onClick={onAdd}
        >
          <Plus />
          Add example
        </Button>
      </div>

      <div className="min-w-0 overflow-x-auto pb-1">
        <TabsList
          aria-label="Document examples"
          variant="line"
          className="flex h-auto w-full min-w-max justify-start gap-2 bg-transparent p-0"
        >
          {examples.map((example) => {
            const count = validationCounts[example.id] ?? 0
            const isActive = example.id === activeExampleId

            return (
              <div
                key={example.id}
                className={cn(
                  'relative flex min-w-28 flex-1 items-stretch overflow-hidden rounded-md border bg-background shadow-xs',
                  isActive
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : 'border-border',
                )}
              >
                <TabsTrigger
                  ref={(node) => {
                    if (node) tabRefs.current.set(example.id, node)
                    else tabRefs.current.delete(example.id)
                  }}
                  value={example.id}
                  aria-label={`${example.name}${count ? `, ${count} contract violation${count === 1 ? '' : 's'}` : ''}`}
                  className={cn(
                    'h-9 w-full min-w-0 rounded-none border-0 px-3 shadow-none after:hidden data-active:bg-transparent data-active:shadow-none',
                    isActive && 'pr-8',
                  )}
                >
                  <span className="min-w-0 truncate">{example.name}</span>
                  {count > 0 && (
                    <span className="shrink-0 rounded-full bg-destructive px-1.5 text-[0.65rem] font-semibold text-destructive-foreground">
                      {count}
                    </span>
                  )}
                </TabsTrigger>

                {isActive && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex w-6 items-stretch">
                    <DropdownMenu
                      onOpenChangeComplete={(open) => {
                        if (!open && beginRenameRef.current) {
                          beginRenameRef.current = false
                          requestAnimationFrame(() => setRenaming(true))
                        }
                      }}
                    >
                      <DropdownMenuTrigger
                        type="button"
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                          'pointer-events-auto size-full rounded-none border-l border-border/80 text-muted-foreground',
                        )}
                        aria-label={`Actions for ${example.name}`}
                      >
                        <MoreVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDraftName(example.name)
                              beginRenameRef.current = true
                            }}
                          >
                            <Pencil />
                            Rename “{example.name}”
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={examples.length === 1}
                            onSelect={() => onDelete(example.id)}
                          >
                            <Trash2 />
                            Delete “{example.name}”
                          </DropdownMenuItem>
                          {examples.length === 1 && (
                            <p className="max-w-48 px-2 py-1.5 text-xs text-muted-foreground">
                              A specimen needs at least one example.
                            </p>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}
        </TabsList>
      </div>

      {renaming && (
        <div className="animate-reveal-in flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <label
            htmlFor="active-example-name"
            className="shrink-0 text-sm font-medium"
          >
            Example name
          </label>
          <Input
            id="active-example-name"
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitRename()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                cancelRenameRef.current = true
                setDraftName(activeExample.name)
                setRenaming(false)
                focusActiveTab()
              }
            }}
          />
        </div>
      )}

      <TabsContent
        value={activeExampleId}
        className={fillHeight ? 'min-h-0 flex-1' : undefined}
      >
        {children}
      </TabsContent>
    </Tabs>
  )
}
