import { useEffect, useMemo, useRef, useState } from 'react'
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
import { buildContractInspectorState } from '@/lib/contract/contractInspectorModel'
import { getContainerPaths } from '@/lib/contract/contractTree'

const EMPTY_FIELDS: Array<JsonContractField> = []

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
  const fields = contract?.fields ?? EMPTY_FIELDS
  const containerPathList = useMemo(() => getContainerPaths(fields), [fields])
  const [expandedPaths, setExpandedPaths] = useState(
    () => new Set(containerPathList),
  )
  const inspector = useMemo(
    () =>
      buildContractInspectorState(fields, {
        expandedPaths,
        schemaDiagnostics,
      }),
    [expandedPaths, fields, schemaDiagnostics],
  )

  useEffect(() => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      for (const path of containerPathList) next.add(path)
      return next
    })
  }, [containerPathList])

  function toggleTreePath(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const activeField = fields.find(
    (field) => field.schemaPointer === activePointer,
  )

  useEffect(() => {
    if (!activePointer) return
    rowRefs.current.get(activePointer)?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [activePointer])
  const visibleRows = inspector.rows.filter((row) => row.visible)

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
          <ScrollArea className="h-full min-h-0">
            <Accordion multiple className="w-full">
              {visibleRows.map(
                ({
                  field,
                  depth,
                  label,
                  isContainer,
                  childCount,
                  diagnostics,
                }) => (
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
                    childCount={childCount}
                    treeExpanded={expandedPaths.has(field.path)}
                    onTreeToggle={() => toggleTreePath(field.path)}
                    onOverrideChange={onOverrideChange}
                    schemaDiagnostics={diagnostics}
                  />
                ),
              )}
            </Accordion>
          </ScrollArea>
        )}
      </div>
    </section>
  )
}
