import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { JsonDocumentVariant } from '@shared/document'
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

type VariantsTabsProps = {
  variants: Array<JsonDocumentVariant>
  activeVariantId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  validationCounts: Record<string, number>
  canAdd: boolean
  fillHeight?: boolean
  children: ReactNode
}

export function VariantsTabs({
  variants,
  activeVariantId,
  onSelect,
  onRename,
  onAdd,
  onDelete,
  validationCounts,
  canAdd,
  fillHeight = false,
  children,
}: VariantsTabsProps) {
  const activeVariant =
    variants.find((variant) => variant.id === activeVariantId) ?? variants[0]
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(activeVariant.name)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const cancelRenameRef = useRef(false)
  const beginRenameRef = useRef(false)

  useEffect(() => {
    setRenaming(false)
    setDraftName(activeVariant.name)
  }, [activeVariant.id, activeVariant.name])

  function focusActiveTab() {
    requestAnimationFrame(() => tabRefs.current.get(activeVariantId)?.focus())
  }

  function commitRename() {
    if (cancelRenameRef.current) {
      cancelRenameRef.current = false
    } else if (draftName !== activeVariant.name) {
      onRename(activeVariant.id, draftName)
    }
    setRenaming(false)
    focusActiveTab()
  }

  return (
    <Tabs
      value={activeVariantId}
      onValueChange={onSelect}
      className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-3' : 'gap-3'}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Variants
          <span className="ml-2 font-normal normal-case tracking-normal">
            · {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAdd}
          onClick={onAdd}
        >
          <Plus />
          Add variant
        </Button>
      </div>

      <div className="min-w-0 overflow-x-auto py-1">
        <TabsList
          aria-label="Document variants"
          variant="line"
          className="flex h-auto w-full min-w-max justify-start gap-2 bg-transparent p-0 group-data-horizontal/tabs:h-auto"
        >
          {variants.map((variant) => {
            const count = validationCounts[variant.id] ?? 0
            const isActive = variant.id === activeVariantId

            return (
              <div
                key={variant.id}
                className={cn(
                  'relative flex h-9 min-w-28 flex-1 items-stretch overflow-hidden rounded-md border bg-background shadow-xs',
                  isActive
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : 'border-border',
                )}
              >
                <TabsTrigger
                  ref={(node) => {
                    if (node) tabRefs.current.set(variant.id, node)
                    else tabRefs.current.delete(variant.id)
                  }}
                  value={variant.id}
                  aria-label={`${variant.name}${count ? `, ${count} contract violation${count === 1 ? '' : 's'}` : ''}`}
                  className={cn(
                    'h-auto min-h-0 flex-1 w-full min-w-0 self-stretch rounded-none border-0 px-3 shadow-none after:hidden data-active:bg-transparent data-active:shadow-none',
                    isActive && 'pr-8',
                  )}
                >
                  <span className="min-w-0 truncate">{variant.name}</span>
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
                        aria-label={`Actions for ${variant.name}`}
                      >
                        <MoreVertical />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDraftName(variant.name)
                              beginRenameRef.current = true
                            }}
                          >
                            <Pencil />
                            Rename “{variant.name}”
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={variants.length === 1}
                            onSelect={() => onDelete(variant.id)}
                          >
                            <Trash2 />
                            Delete “{variant.name}”
                          </DropdownMenuItem>
                          {variants.length === 1 && (
                            <p className="max-w-48 px-2 py-1.5 text-xs text-muted-foreground">
                              A specimen needs at least one variant.
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
            htmlFor="active-variant-name"
            className="shrink-0 text-sm font-medium"
          >
            Variant name
          </label>
          <Input
            id="active-variant-name"
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
                setDraftName(activeVariant.name)
                setRenaming(false)
                focusActiveTab()
              }
            }}
          />
        </div>
      )}

      <TabsContent
        value={activeVariantId}
        className={fillHeight ? 'min-h-0 flex-1' : undefined}
      >
        {children}
      </TabsContent>
    </Tabs>
  )
}
