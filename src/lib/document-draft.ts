import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
import {
  applyContractOverrides,
  getSchemaFieldPointer,
  projectJsonSchemaToContract,
  validateExamplesAgainstSchema,
} from '@shared/json-schema'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import type {
  ContractFieldOverride,
  ContractOverrides,
  JsonContract,
  JsonDocumentExample,
  JsonSchema,
} from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import { analyzeExamplesForContract } from '@/lib/contract/inferContract'
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

function applyDraftContractProjection(
  draft: DocumentDraft,
  contract: JsonContract,
): DocumentDraft {
  if (!draft.inferredJsonSchema || !draft.jsonSchema || !draft.contract)
    return draft
  const previousByPointer = new Map(
    draft.contract.fields.flatMap((field) =>
      field.schemaPointer ? [[field.schemaPointer, field] as const] : [],
    ),
  )
  const overridesByPointer = new Map(
    draft.contractOverrides.map((override) => [override.pointer, override]),
  )
  const inferredByPointer = new Map(
    projectJsonSchemaToContract(draft.inferredJsonSchema).fields.flatMap(
      (field) =>
        field.schemaPointer ? [[field.schemaPointer, field] as const] : [],
    ),
  )

  for (const field of contract.fields) {
    const pointer = field.schemaPointer
    const previous = pointer ? previousByPointer.get(pointer) : undefined
    if (!pointer || !previous) continue
    if (
      previous.required === field.required &&
      previous.nullable === field.nullable &&
      previous.description === field.description &&
      JSON.stringify(previous.enumValues) === JSON.stringify(field.enumValues)
    )
      continue

    const inferred = inferredByPointer.get(pointer)
    const nextOverride: ContractFieldOverride = {
      ...overridesByPointer.get(pointer),
      pointer,
    }
    if (previous.required !== field.required) {
      if (field.required === inferred?.required) delete nextOverride.required
      else nextOverride.required = field.required
    }
    if (previous.nullable !== field.nullable) {
      if (field.nullable === inferred?.nullable) delete nextOverride.nullable
      else nextOverride.nullable = field.nullable
    }
    if (previous.description !== field.description) {
      if (field.description === inferred?.description)
        delete nextOverride.description
      else nextOverride.description = field.description
    }
    if (
      JSON.stringify(previous.enumValues) !== JSON.stringify(field.enumValues)
    ) {
      if (
        JSON.stringify(field.enumValues) ===
        JSON.stringify(inferred?.enumValues)
      ) {
        delete nextOverride.enumValues
      } else {
        nextOverride.enumValues = field.enumValues
      }
    }

    const hasValues = Object.keys(nextOverride).some((key) => key !== 'pointer')
    if (hasValues) overridesByPointer.set(pointer, nextOverride)
    else overridesByPointer.delete(pointer)
  }

  return {
    ...draft,
    ...buildSchemaState(draft.examples, draft.inferredJsonSchema, [
      ...overridesByPointer.values(),
    ]),
  }
}

export function updateDraftContractOverride(
  draft: DocumentDraft,
  change: ContractOverrideChange,
): DocumentDraft {
  if (!draft.contract) return draft
  const field = draft.contract.fields.find(
    (candidate) => candidate.schemaPointer === change.pointer,
  )
  if (!field) return draft

  const nextField = (() => {
    switch (change.type) {
      case 'requiredChanged':
        return { ...field, required: change.required }
      case 'nullableChanged':
        return { ...field, nullable: change.nullable }
      case 'enumChanged':
        return { ...field, enumValues: change.enumValues }
      case 'descriptionChanged':
        return { ...field, description: change.description }
    }
  })()

  return applyDraftContractProjection(draft, {
    ...draft.contract,
    fields: draft.contract.fields.map((candidate) =>
      candidate.schemaPointer === change.pointer ? nextField : candidate,
    ),
  })
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
