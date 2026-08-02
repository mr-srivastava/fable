import type { JsonContractField } from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractDisplayRow } from '@/lib/contract/contractTree'
import {
  buildContractDisplayRows,
  getContainerPaths,
  isContractRowVisible,
} from '@/lib/contract/contractTree'

export type ContractInspectorRow = ContractDisplayRow & {
  visible: boolean
  childCount: number
  diagnostics: Array<SchemaValidationDiagnostic>
}

export type ContractInspectorState = {
  rows: Array<ContractInspectorRow>
  containerPaths: ReadonlySet<string>
}

export function getImmediateChildCount(
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

export function buildContractInspectorState(
  fields: Array<JsonContractField>,
  options: {
    expandedPaths: ReadonlySet<string>
    schemaDiagnostics?: Array<SchemaValidationDiagnostic>
  },
): ContractInspectorState {
  const schemaDiagnostics = options.schemaDiagnostics ?? []
  const containerPaths = new Set(getContainerPaths(fields))
  const rows = buildContractDisplayRows(fields).map((row) => ({
    ...row,
    visible: isContractRowVisible(
      row.field.path,
      options.expandedPaths,
      containerPaths,
    ),
    childCount: row.isContainer ? getImmediateChildCount(row.field, fields) : 0,
    diagnostics: schemaDiagnostics.filter(
      (diagnostic) => diagnostic.fieldPointer === row.field.schemaPointer,
    ),
  }))

  return { rows, containerPaths }
}
