import type { JsonContract, JsonContractField } from '@/lib/schemas'

function mergeFieldEdits(
  inferredField: JsonContractField,
  editedField?: JsonContractField,
): JsonContractField {
  if (!editedField) return inferredField

  return {
    ...inferredField,
    enumValues: editedField.enumValues,
    description: editedField.description,
  }
}

export function mergeContractEdits(
  inferred: JsonContract,
  edited?: JsonContract,
): JsonContract {
  if (!edited) return inferred

  const editedByPath = new Map(
    edited.fields.map((field) => [field.path, field]),
  )

  return {
    version: inferred.version,
    fields: inferred.fields.map((field) =>
      mergeFieldEdits(field, editedByPath.get(field.path)),
    ),
  }
}
