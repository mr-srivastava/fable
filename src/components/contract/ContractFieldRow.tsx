import { ChevronRight } from 'lucide-react'
import { EnumValuesInput } from './EnumValuesInput'
import type { Ref } from 'react'
import type { JsonContractField } from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractOverrideChange } from '@/lib/document-draft'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { contractTypeBadgeClass } from '@/lib/contract/contractTypeBadge'
import { formatFieldPathDisplay } from '@/lib/contract/contractTree'
import { cn } from '@/lib/utils'

type ContractFieldRowProps = {
  field: JsonContractField
  depth: number
  label: string
  isContainer: boolean
  childCount?: number
  treeExpanded?: boolean
  onTreeToggle?: () => void
  onOverrideChange: (change: ContractOverrideChange) => void
  schemaDiagnostics?: Array<SchemaValidationDiagnostic>
  selected?: boolean
  onSelect?: () => void
  rowRef?: Ref<HTMLDivElement>
}

export function ContractFieldReferenceItem({
  field,
  depth,
  label,
  isContainer,
  childCount = 0,
  treeExpanded = true,
  onTreeToggle,
  onOverrideChange,
  schemaDiagnostics = [],
  selected = false,
  onSelect,
  rowRef,
}: ContractFieldRowProps) {
  const isEditable = !isContainer
  const pointer = field.schemaPointer
  const pathDisplay = formatFieldPathDisplay(field.path, label)
  const showTreeToggle = isContainer && childCount > 0

  return (
    <AccordionItem
      ref={rowRef}
      value={field.path}
      className={cn(
        'border-b px-3 last:border-b-0',
        isContainer && 'bg-muted/20',
        selected && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
      )}
    >
      <AccordionTrigger
        className="py-3 hover:no-underline"
        aria-label={`${selected ? 'Selected field: ' : ''}${field.path}`}
        onClick={onSelect}
      >
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left">
          <div
            className="flex min-w-0 items-center gap-1"
            style={{ paddingLeft: `${depth * 1}rem` }}
          >
            {showTreeToggle ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground"
                aria-label={`${treeExpanded ? 'Collapse' : 'Expand'} ${field.path}`}
                aria-expanded={treeExpanded}
                onClick={(event) => {
                  event.stopPropagation()
                  onTreeToggle?.()
                }}
              >
                <ChevronRight
                  className={cn(
                    'transition-transform duration-200 ease-out motion-reduce:transition-none',
                    treeExpanded && 'rotate-90',
                  )}
                />
              </Button>
            ) : depth > 0 ? (
              <span className="size-6 shrink-0" aria-hidden="true" />
            ) : null}
            <div className="min-w-0">
              <code
                className={cn(
                  'block truncate font-mono text-xs text-foreground',
                  isContainer && 'font-semibold',
                )}
                title={field.path}
              >
                {label}
              </code>
              {pathDisplay && (
                <p
                  className="truncate font-mono text-[0.68rem] font-normal text-muted-foreground"
                  title={pathDisplay}
                >
                  {pathDisplay}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge
              variant="outline"
              className={contractTypeBadgeClass(field.type)}
            >
              {field.type}
            </Badge>
            {schemaDiagnostics.length > 0 && (
              <Badge variant="destructive">
                {schemaDiagnostics.length} issue
                {schemaDiagnostics.length === 1 ? '' : 's'}
              </Badge>
            )}
            {isContainer && childCount > 0 && (
              <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                {childCount} child{childCount === 1 ? '' : 'ren'}
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pb-4">
        <div
          className="flex flex-col gap-4"
          style={{ paddingLeft: `${Math.min(depth * 1, 3)}rem` }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              Required
              <Switch
                size="sm"
                checked={field.required}
                disabled={!pointer}
                onCheckedChange={(checked) =>
                  pointer &&
                  onOverrideChange({
                    type: 'requiredChanged',
                    pointer,
                    required: checked,
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-md border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              Nullable
              <Switch
                size="sm"
                checked={field.nullable}
                disabled={!pointer}
                onCheckedChange={(checked) =>
                  pointer &&
                  onOverrideChange({
                    type: 'nullableChanged',
                    pointer,
                    nullable: checked,
                  })
                }
              />
            </label>
          </div>

          <Separator />

          {isEditable ? (
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Enum values</FieldLabel>
                <EnumValuesInput
                  value={field.enumValues}
                  onChange={(enumValues) =>
                    pointer &&
                    onOverrideChange({
                      type: 'enumChanged',
                      pointer,
                      enumValues,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={field.description ?? ''}
                  disabled={!pointer}
                  onChange={(event) =>
                    pointer &&
                    onOverrideChange({
                      type: 'descriptionChanged',
                      pointer,
                      description: event.currentTarget.value || undefined,
                    })
                  }
                  placeholder="Optional note"
                  rows={2}
                />
              </Field>
            </FieldGroup>
          ) : (
            <Field>
              <FieldLabel>Description</FieldLabel>
              <FieldContent>
                <Input
                  value={field.description ?? ''}
                  disabled={!pointer}
                  onChange={(event) =>
                    pointer &&
                    onOverrideChange({
                      type: 'descriptionChanged',
                      pointer,
                      description: event.currentTarget.value || undefined,
                    })
                  }
                  placeholder="Optional note"
                />
              </FieldContent>
            </Field>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
