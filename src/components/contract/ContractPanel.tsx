import { useEffect, useRef } from 'react'
import { ContractFieldReferenceItem } from './ContractFieldRow'
import type { JsonContract, JsonContractField } from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractOverrideChange } from '@/lib/document-draft'
import { Accordion } from '@/components/ui/accordion'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { buildContractDisplayRows } from '@/lib/contract/contractTree'

type ContractPanelProps = {
  contract?: JsonContract
  disabled?: boolean
  onOverrideChange: (change: ContractOverrideChange) => void
  schemaDiagnostics?: Array<SchemaValidationDiagnostic>
  activePointer?: string
  activePointerPresent?: boolean
  onSelectPointer?: (pointer: string) => void
  fillHeight?: boolean
}

function getImmediateChildCount(
  field: JsonContractField,
  fields: Array<JsonContractField>,
) {
  const prefix = `${field.path}.`
  const depth = field.path.split('.').length

  return fields.filter((candidate) => {
    if (!candidate.path.startsWith(prefix)) return false
    return candidate.path.split('.').length === depth + 1
  }).length
}

export function ContractPanel({
  contract,
  disabled = false,
  onOverrideChange,
  schemaDiagnostics = [],
  activePointer,
  activePointerPresent = true,
  onSelectPointer,
  fillHeight = false,
}: ContractPanelProps) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const fields = contract?.fields ?? []
  const rows = buildContractDisplayRows(fields)

  useEffect(() => {
    if (!activePointer) return
    rowRefs.current.get(activePointer)?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [activePointer])

  const activeField = fields.find(
    (field) => field.schemaPointer === activePointer,
  )

  return (
    <section
      className={`animate-fade-in-up-delay-2 flex min-h-0 flex-col gap-3 ${fillHeight ? 'h-full' : ''}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Contract Inspector
          </h2>
          <p className="text-sm text-muted-foreground">
            Inspect and annotate fields inferred from the current examples.
          </p>
        </div>
      </div>

      {!disabled && fields.length > 0 && (
        <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Inferred from all examples. Edited constraints remain authoritative.
        </p>
      )}

      {activeField && !activePointerPresent && (
        <p role="status" className="text-xs text-muted-foreground">
          <code>{activeField.path}</code> is not present in this example.
        </p>
      )}

      <div
        className={`min-h-0 overflow-hidden rounded-md border bg-card ${fillHeight ? 'flex-1' : ''}`}
      >
        {disabled || fields.length === 0 ? (
          <Empty className="min-h-32 border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>
                {disabled ? 'Contract unavailable' : 'No contract fields'}
              </EmptyTitle>
              <EmptyDescription>
                {disabled
                  ? 'Fix the invalid JSON in the active example to update the contract.'
                  : 'Add fields to an example to infer editable metadata.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea
            className={
              fillHeight
                ? 'h-full min-h-0'
                : 'h-[min(34rem,calc(100vh-14rem))] min-h-0'
            }
          >
            <Accordion multiple className="w-full">
              {rows.map(({ field, depth, label, isContainer }) => (
                <ContractFieldReferenceItem
                  key={field.schemaPointer ?? field.path}
                  rowRef={(node) => {
                    const pointer = field.schemaPointer
                    if (!pointer) return
                    if (node) rowRefs.current.set(pointer, node)
                    else rowRefs.current.delete(pointer)
                  }}
                  field={field}
                  depth={depth}
                  label={label}
                  isContainer={isContainer}
                  selected={field.schemaPointer === activePointer}
                  onSelect={() =>
                    field.schemaPointer &&
                    onSelectPointer?.(field.schemaPointer)
                  }
                  childCount={
                    isContainer ? getImmediateChildCount(field, fields) : 0
                  }
                  onOverrideChange={onOverrideChange}
                  schemaDiagnostics={schemaDiagnostics.filter(
                    (diagnostic) =>
                      diagnostic.fieldPointer === field.schemaPointer,
                  )}
                />
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </div>
    </section>
  )
}
