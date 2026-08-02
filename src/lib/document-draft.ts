import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
import {
  applyContractOverrides,
  getSchemaFieldPointer,
  projectJsonSchemaToContract,
  validateExamplesAgainstSchema,
} from '@shared/json-schema'
import type { ContractDiagnostics } from '@/lib/contract/compatibilityDiagnostics'
import type {
  ContractFieldOverride,
  ContractOverrides,
  JsonContract,
  JsonDocumentExample,
  JsonSchema,
} from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import { analyzeExamplesForContract } from '@/lib/contract/compatibilityDiagnostics'
import { parseJsonSafely } from '@/lib/json'

export type DocumentDraft = {
  examples: Array<JsonDocumentExample>
  activeExampleId: string
  contract?: JsonContract
  inferredJsonSchema?: JsonSchema
  jsonSchema?: JsonSchema
  contractOverrides: ContractOverrides
  schemaDiagnostics: Array<SchemaValidationDiagnostic>
  diagnostics?: ContractDiagnostics
}

export type DocumentWriteInput = {
  examples: Array<JsonDocumentExample>
  contract?: JsonContract
  jsonSchema?: JsonSchema
  contractOverrides?: ContractOverrides
}

export type ContractOverrideChange =
  | { pointer: string; type: 'requiredChanged'; required: boolean }
  | { pointer: string; type: 'nullableChanged'; nullable: boolean }
  | { pointer: string; type: 'enumChanged'; enumValues?: Array<string> }
  | { pointer: string; type: 'descriptionChanged'; description?: string }

export function documentExamplesAreValid(examples: Array<JsonDocumentExample>) {
  return examples.every((example) => parseJsonSafely(example.data).ok)
}

function getCompatibilityDiagnostics(examples: Array<JsonDocumentExample>) {
  return documentExamplesAreValid(examples)
    ? analyzeExamplesForContract(examples).diagnostics
    : undefined
}

function migrateLegacyAnnotations(
  jsonSchema: JsonSchema,
  contract: JsonContract | undefined,
): ContractOverrides {
  if (!contract) return []
  return contract.fields.flatMap((field): Array<ContractFieldOverride> => {
    const pointer = getSchemaFieldPointer(jsonSchema, field.path)
    if (!pointer || (!field.description && field.enumValues === undefined))
      return []
    return [
      {
        pointer,
        description: field.description,
        enumValues: field.enumValues,
      },
    ]
  })
}

function buildSchemaState(
  examples: Array<JsonDocumentExample>,
  inferredJsonSchema: JsonSchema,
  overrides: ContractOverrides,
) {
  const applied = applyContractOverrides(inferredJsonSchema, overrides)
  const contract = projectJsonSchemaToContract(applied.jsonSchema)
  const schemaDiagnostics = validateExamplesAgainstSchema(
    examples,
    applied.jsonSchema,
  )
  return {
    inferredJsonSchema,
    jsonSchema: applied.jsonSchema,
    contract,
    contractOverrides: applied.overrides,
    schemaDiagnostics,
  }
}

export function createDocumentDraft(
  examples: Array<JsonDocumentExample>,
  persistedContract?: JsonContract,
  persistedJsonSchema?: JsonSchema,
  persistedOverrides: ContractOverrides = [],
): DocumentDraft {
  if (examples.length === 0) throw new Error('At least one example is required')

  const valid = documentExamplesAreValid(examples)
  if (valid && persistedJsonSchema) {
    const schemaState = buildSchemaState(
      examples,
      persistedJsonSchema,
      persistedOverrides,
    )
    return {
      examples,
      activeExampleId: examples[0].id,
      ...schemaState,
      diagnostics: getCompatibilityDiagnostics(examples),
    }
  }

  return {
    examples,
    activeExampleId: examples[0].id,
    contract: persistedContract,
    contractOverrides: persistedOverrides,
    schemaDiagnostics: [],
    diagnostics: getCompatibilityDiagnostics(examples),
  }
}

export function applyDraftInference(
  draft: DocumentDraft,
  inferredJsonSchema: JsonSchema,
): DocumentDraft {
  const overrides = draft.inferredJsonSchema
    ? draft.contractOverrides
    : [
        ...draft.contractOverrides,
        ...migrateLegacyAnnotations(inferredJsonSchema, draft.contract),
      ]
  return {
    ...draft,
    ...buildSchemaState(draft.examples, inferredJsonSchema, overrides),
    diagnostics: getCompatibilityDiagnostics(draft.examples),
  }
}

export function getActiveExample(draft: DocumentDraft): JsonDocumentExample {
  return (
    draft.examples.find((example) => example.id === draft.activeExampleId) ??
    draft.examples[0]
  )
}

export function selectDraftExample(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  return draft.examples.some((example) => example.id === id)
    ? { ...draft, activeExampleId: id }
    : draft
}

function withChangedExamples(
  draft: DocumentDraft,
  examples: Array<JsonDocumentExample>,
) {
  return {
    ...draft,
    examples,
    schemaDiagnostics: [],
    diagnostics: getCompatibilityDiagnostics(examples),
  }
}

export function updateDraftExample(
  draft: DocumentDraft,
  id: string,
  data: string,
  now = Date.now(),
): DocumentDraft {
  return withChangedExamples(
    draft,
    draft.examples.map((example) =>
      example.id === id ? { ...example, data, updatedAt: now } : example,
    ),
  )
}

export function renameDraftExample(
  draft: DocumentDraft,
  id: string,
  name: string,
  now = Date.now(),
): DocumentDraft {
  return {
    ...draft,
    examples: draft.examples.map((example) =>
      example.id === id ? { ...example, name, updatedAt: now } : example,
    ),
  }
}

export function addDraftExample(
  draft: DocumentDraft,
  example: JsonDocumentExample,
): DocumentDraft {
  if (draft.examples.length >= MAX_EXAMPLES_PER_DOCUMENT) return draft
  return {
    ...withChangedExamples(draft, [...draft.examples, example]),
    activeExampleId: example.id,
  }
}

export function removeDraftExample(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  if (draft.examples.length === 1) return draft
  const examples = draft.examples.filter((example) => example.id !== id)
  if (examples.length === draft.examples.length) return draft
  return {
    ...withChangedExamples(draft, examples),
    activeExampleId:
      draft.activeExampleId === id ? examples[0].id : draft.activeExampleId,
  }
}

function applyOverrideChange(
  overrides: ContractOverrides,
  change: ContractOverrideChange,
  inferredJsonSchema: JsonSchema,
): ContractOverrides | undefined {
  const inferredField = projectJsonSchemaToContract(
    inferredJsonSchema,
  ).fields.find((field) => field.schemaPointer === change.pointer)
  if (!inferredField) return undefined

  const overridesByPointer = new Map(
    overrides.map((override) => [override.pointer, override]),
  )
  const nextOverride: ContractFieldOverride = {
    ...overridesByPointer.get(change.pointer),
    pointer: change.pointer,
  }

  switch (change.type) {
    case 'requiredChanged':
      if (change.required === inferredField.required)
        delete nextOverride.required
      else nextOverride.required = change.required
      break
    case 'nullableChanged':
      if (change.nullable === inferredField.nullable)
        delete nextOverride.nullable
      else nextOverride.nullable = change.nullable
      break
    case 'enumChanged':
      if (
        JSON.stringify(change.enumValues) ===
        JSON.stringify(inferredField.enumValues)
      ) {
        delete nextOverride.enumValues
      } else {
        nextOverride.enumValues = change.enumValues
      }
      break
    case 'descriptionChanged':
      if (change.description === inferredField.description) {
        delete nextOverride.description
      } else {
        nextOverride.description = change.description
      }
      break
  }

  const hasValues = Object.keys(nextOverride).some((key) => key !== 'pointer')
  if (hasValues) overridesByPointer.set(change.pointer, nextOverride)
  else overridesByPointer.delete(change.pointer)

  return [...overridesByPointer.values()]
}

export function updateDraftContractOverride(
  draft: DocumentDraft,
  change: ContractOverrideChange,
): DocumentDraft {
  if (!draft.inferredJsonSchema) return draft

  const nextOverrides = applyOverrideChange(
    draft.contractOverrides,
    change,
    draft.inferredJsonSchema,
  )
  if (!nextOverrides) return draft

  return {
    ...draft,
    ...buildSchemaState(
      draft.examples,
      draft.inferredJsonSchema,
      nextOverrides,
    ),
  }
}

export function getDocumentDraftSnapshot(draft: DocumentDraft): string {
  return JSON.stringify({
    examples: draft.examples,
    contract: draft.contract ?? null,
    jsonSchema: draft.jsonSchema ?? null,
    contractOverrides: draft.contractOverrides,
  })
}

export function prepareDocumentWrite(draft: DocumentDraft): DocumentWriteInput {
  if (!documentExamplesAreValid(draft.examples)) {
    throw new Error('All examples must contain valid JSON')
  }
  if (!draft.jsonSchema || !draft.contract) {
    throw new Error('Contract inference is not complete')
  }
  if (draft.schemaDiagnostics.length > 0) {
    throw new Error('All examples must satisfy the contract')
  }
  return {
    examples: draft.examples,
    contract: draft.contract,
    jsonSchema: draft.jsonSchema,
    contractOverrides: draft.contractOverrides,
  }
}
