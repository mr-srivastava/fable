import { Info } from 'lucide-react'
import { ContractFieldRow } from './ContractFieldRow'
import type { JsonContract, JsonContractField } from '@/types/contract'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildContractDisplayRows } from '@/lib/contract/contractTree'

type ContractPanelProps = {
  contract?: JsonContract
  disabled?: boolean
  onChange: (contract: JsonContract) => void
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
    <section className="animate-fade-in-up-delay-2 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Contract
          </h2>
          <p className="text-sm text-muted-foreground">
            {disabled
              ? 'Valid JSON will infer fields here.'
              : `${fields.length} field${fields.length === 1 ? '' : 's'} inferred from the current JSON example`}
          </p>
        </div>
      </div>

      {!disabled && fields.length > 0 && (
        <Alert className="border-dashed bg-muted/30">
          <Info aria-hidden="true" />
          <AlertTitle>Inferred contract overlay</AlertTitle>
          <AlertDescription>
            Edit metadata for paths found in this JSON example. New fields,
            renamed paths, deleted paths, and alternate response shapes are out
            of scope for this version.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border bg-card">
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
          <ScrollArea className="w-full">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-[300px] px-4">Field</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[104px]">Required</TableHead>
                  <TableHead className="w-[104px]">Nullable</TableHead>
                  <TableHead className="w-[210px]">Enum Values</TableHead>
                  <TableHead className="w-[260px] pr-4">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ field, depth, label, isContainer }) => (
                  <ContractFieldRow
                    key={field.path}
                    field={field}
                    depth={depth}
                    label={label}
                    isContainer={isContainer}
                    onChange={updateField}
                  />
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </section>
  )
}
