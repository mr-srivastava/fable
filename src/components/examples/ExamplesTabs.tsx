import { Plus, Trash2 } from 'lucide-react'
import type { JsonDocumentExample } from '@/types/document'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ExamplesTabsProps = {
  examples: Array<JsonDocumentExample>
  activeExampleId: string
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

export function ExamplesTabs({
  examples,
  activeExampleId,
  onSelect,
  onRename,
  onAdd,
  onDelete,
}: ExamplesTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist">
      {examples.map((example) => {
        const isActive = example.id === activeExampleId

        return (
          <div
            key={example.id}
            className={cn(
              'flex h-9 items-center gap-1 rounded-md border bg-background px-1 shadow-xs transition-colors',
              isActive
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <div
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              className="h-full rounded-sm px-2 text-sm font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => onSelect(example.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(example.id)
                }
              }}
            >
              <Input
                aria-label="Example name"
                className="h-7 w-28 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                value={example.name}
                onChange={(event) => onRename(example.id, event.target.value)}
                onFocus={() => onSelect(example.id)}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={examples.length === 1}
              aria-label={`Delete ${example.name}`}
              onClick={() => onDelete(example.id)}
            >
              <Trash2 />
            </Button>
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus />
        Example
      </Button>
    </div>
  )
}
