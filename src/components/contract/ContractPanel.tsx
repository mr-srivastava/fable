import { ContractFieldReferenceItem } from './ContractFieldRow'
import type { JsonContract, JsonContractField } from '@shared/document'
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
  onChange: (contract: JsonContract) => void
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
  onChange,
}: ContractPanelProps) {
  const fields = contract?.fields ?? []
  const rows = buildContractDisplayRows(fields)

  function updateField(nextField: JsonContractField) {
    if (!contract) return

    onChange({
      ...contract,
      fields: contract.fields.map((field) =>
        field.path === nextField.path ? nextField : field,
      ),
    })
  }

  return (
    <section className="animate-fade-in-up-delay-2 flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Contract Inspector
          </h2>
          <p className="text-sm text-muted-foreground">
            {disabled
              ? 'Valid JSON will infer inspectable fields here.'
              : `${fields.length} field${fields.length === 1 ? '' : 's'} inferred from the current examples`}
          </p>
        </div>
      </div>

      {!disabled && fields.length > 0 && (
        <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Inferred from saved examples. Edit field metadata only.
        </p>
      )}

      <div className="min-h-0 overflow-hidden rounded-md border bg-card">
        {disabled || fields.length === 0 ? (
          <Empty className="min-h-32 border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>No contract fields</EmptyTitle>
              <EmptyDescription>
                Valid JSON will infer editable metadata for paths present in the
                example.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-[min(34rem,calc(100vh-14rem))] min-h-0">
            <Accordion type="multiple" className="w-full">
              {rows.map(({ field, depth, label, isContainer }) => (
                <ContractFieldReferenceItem
                  key={field.path}
                  field={field}
                  depth={depth}
                  label={label}
                  isContainer={isContainer}
                  childCount={
                    isContainer ? getImmediateChildCount(field, fields) : 0
                  }
                  onChange={updateField}
                />
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </div>
    </section>
  )
}
