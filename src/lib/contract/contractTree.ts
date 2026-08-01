import type { JsonContractField } from '@shared/document'

export type ContractDisplayRow = {
  field: JsonContractField
  depth: number
  label: string
  isContainer: boolean
}

function getPathSegments(path: string): Array<string> {
  return path.split('.').filter(Boolean)
}

function getFieldLabel(path: string): string {
  const segments = getPathSegments(path)
  const label = segments.at(-1) ?? path
  return label.replace(/\[\]$/, '[]')
}

function sortFieldsForDisplay(
  left: JsonContractField,
  right: JsonContractField,
): number {
  const leftPath = left.path
  const rightPath = right.path

  if (rightPath.startsWith(`${leftPath}.`)) return -1
  if (leftPath.startsWith(`${rightPath}.`)) return 1

  return leftPath.localeCompare(rightPath)
}

export function buildContractDisplayRows(
  fields: Array<JsonContractField>,
): Array<ContractDisplayRow> {
  return [...fields].sort(sortFieldsForDisplay).map((field) => {
    const segments = getPathSegments(field.path)

    return {
      field,
      depth: Math.max(segments.length - 1, 0),
      label: getFieldLabel(field.path),
      isContainer: field.type === 'object' || field.type === 'array',
    }
  })
}
