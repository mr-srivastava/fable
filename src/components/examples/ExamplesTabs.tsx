import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { JsonDocumentExample } from '@shared/document'
import { Button, buttonVariants } from '@/components/ui/button'
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
  children,
}: ExamplesTabsProps) {
  const activeExample =
    examples.find((example) => example.id === activeExampleId) ?? examples[0]
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(activeExample.name)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const actionsRef = useRef<HTMLDetailsElement>(null)
  const cancelRenameRef = useRef(false)

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
    <Tabs value={activeExampleId} onValueChange={onSelect} className="gap-3">
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
          className="w-max min-w-full justify-start"
        >
          {examples.map((example) => {
            const count = validationCounts[example.id] ?? 0
            const isActive = example.id === activeExampleId

            return (
              <div
                key={example.id}
                className="relative flex min-w-24 flex-1 items-center"
              >
                <TabsTrigger
                  ref={(node) => {
                    if (node) tabRefs.current.set(example.id, node)
                    else tabRefs.current.delete(example.id)
                  }}
                  value={example.id}
                  aria-label={`${example.name}${count ? `, ${count} contract violation${count === 1 ? '' : 's'}` : ''}`}
                  className={`w-full min-w-0 gap-2 px-3 ${isActive ? 'pr-10' : ''}`}
                >
                  <span className="max-w-32 truncate">{example.name}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 text-[0.65rem] font-semibold text-destructive-foreground">
                      {count}
                    </span>
                  )}
                </TabsTrigger>

                {isActive && (
                  <details
                    ref={actionsRef}
                    className="group absolute right-1 z-20"
                  >
                    <summary
                      role="button"
                      aria-label={`Actions for ${example.name}`}
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
                        'cursor-pointer list-none',
                      )}
                    >
                      <MoreHorizontal />
                    </summary>
                    <div
                      role="menu"
                      className="absolute top-8 right-0 z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        onClick={() => {
                          if (actionsRef.current)
                            actionsRef.current.open = false
                          setDraftName(example.name)
                          setRenaming(true)
                        }}
                      >
                        <Pencil className="size-4" />
                        Rename “{example.name}”
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={examples.length === 1}
                        className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive outline-none select-none hover:bg-destructive/10 focus:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => {
                          if (actionsRef.current)
                            actionsRef.current.open = false
                          onDelete(example.id)
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete “{example.name}”
                      </button>
                      {examples.length === 1 && (
                        <p className="max-w-48 px-2 py-1.5 text-xs text-muted-foreground">
                          A specimen needs at least one example.
                        </p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </TabsList>
      </div>

      {renaming && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
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

      <TabsContent value={activeExampleId}>{children}</TabsContent>
    </Tabs>
  )
}
