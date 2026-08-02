import { MAX_VARIANTS_PER_DOCUMENT } from '@shared/document-limits'
import {
  applyContractOverrides,
  getSchemaFieldPointer,
  projectJsonSchemaToContract,
  validateVariantsAgainstSchema,
} from '@shared/json-schema'
import type { ContractDiagnostics } from '@/lib/contract/compatibilityDiagnostics'
import type {
  ContractFieldOverride,
  ContractOverrides,
  JsonContract,
  JsonDocumentVariant,
  JsonSchema,
} from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import { analyzeVariantsForContract } from '@/lib/contract/compatibilityDiagnostics'
import { parseJsonSafely } from '@/lib/json'

export type DocumentDraft = {
  variants: Array<JsonDocumentVariant>
  activeVariantId: string
  contract?: JsonContract
  inferredJsonSchema?: JsonSchema
  jsonSchema?: JsonSchema
  contractOverrides: ContractOverrides
  schemaDiagnostics: Array<SchemaValidationDiagnostic>
  diagnostics?: ContractDiagnostics
}

export type DocumentWriteInput = {
  variants: Array<JsonDocumentVariant>
  contract?: JsonContract
  jsonSchema?: JsonSchema
  contractOverrides?: ContractOverrides
}

export type ContractOverrideChange =
  | { pointer: string; type: 'requiredChanged'; required: boolean }
  | { pointer: string; type: 'nullableChanged'; nullable: boolean }
  | { pointer: string; type: 'enumChanged'; enumValues?: Array<string> }
  | { pointer: string; type: 'descriptionChanged'; description?: string }

export function documentVariantsAreValid(variants: Array<JsonDocumentVariant>) {
  return variants.every((variant) => parseJsonSafely(variant.data).ok)
}

function getCompatibilityDiagnostics(variants: Array<JsonDocumentVariant>) {
  return documentVariantsAreValid(variants)
    ? analyzeVariantsForContract(variants).diagnostics
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
  variants: Array<JsonDocumentVariant>,
  inferredJsonSchema: JsonSchema,
  overrides: ContractOverrides,
) {
  const applied = applyContractOverrides(inferredJsonSchema, overrides)
  const contract = projectJsonSchemaToContract(applied.jsonSchema)
  const schemaDiagnostics = validateVariantsAgainstSchema(
    variants,
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
  variants: Array<JsonDocumentVariant>,
  persistedContract?: JsonContract,
  persistedJsonSchema?: JsonSchema,
  persistedOverrides: ContractOverrides = [],
): DocumentDraft {
  if (variants.length === 0) throw new Error('At least one variant is required')

  const valid = documentVariantsAreValid(variants)
  if (valid && persistedJsonSchema) {
    const schemaState = buildSchemaState(
      variants,
      persistedJsonSchema,
      persistedOverrides,
    )
    return {
      variants,
      activeVariantId: variants[0].id,
      ...schemaState,
      diagnostics: getCompatibilityDiagnostics(variants),
    }
  }

  return {
    variants,
    activeVariantId: variants[0].id,
    contract: persistedContract,
    contractOverrides: persistedOverrides,
    schemaDiagnostics: [],
    diagnostics: getCompatibilityDiagnostics(variants),
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
    ...buildSchemaState(draft.variants, inferredJsonSchema, overrides),
    diagnostics: getCompatibilityDiagnostics(draft.variants),
  }
}

export function getActiveVariant(draft: DocumentDraft): JsonDocumentVariant {
  return (
    draft.variants.find((variant) => variant.id === draft.activeVariantId) ??
    draft.variants[0]
  )
}

export function selectDraftVariant(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  return draft.variants.some((variant) => variant.id === id)
    ? { ...draft, activeVariantId: id }
    : draft
}

function withChangedVariants(
  draft: DocumentDraft,
  variants: Array<JsonDocumentVariant>,
) {
  return {
    ...draft,
    variants,
    schemaDiagnostics: [],
    diagnostics: getCompatibilityDiagnostics(variants),
  }
}

export function updateDraftVariant(
  draft: DocumentDraft,
  id: string,
  data: string,
  now = Date.now(),
): DocumentDraft {
  return withChangedVariants(
    draft,
    draft.variants.map((variant) =>
      variant.id === id ? { ...variant, data, updatedAt: now } : variant,
    ),
  )
}

export function renameDraftVariant(
  draft: DocumentDraft,
  id: string,
  name: string,
  now = Date.now(),
): DocumentDraft {
  return {
    ...draft,
    variants: draft.variants.map((variant) =>
      variant.id === id ? { ...variant, name, updatedAt: now } : variant,
    ),
  }
}

export function addDraftVariant(
  draft: DocumentDraft,
  variant: JsonDocumentVariant,
): DocumentDraft {
  if (draft.variants.length >= MAX_VARIANTS_PER_DOCUMENT) return draft
  return {
    ...withChangedVariants(draft, [...draft.variants, variant]),
    activeVariantId: variant.id,
  }
}

export function removeDraftVariant(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  if (draft.variants.length === 1) return draft
  const variants = draft.variants.filter((variant) => variant.id !== id)
  if (variants.length === draft.variants.length) return draft
  return {
    ...withChangedVariants(draft, variants),
    activeVariantId:
      draft.activeVariantId === id ? variants[0].id : draft.activeVariantId,
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
      draft.variants,
      draft.inferredJsonSchema,
      nextOverrides,
    ),
  }
}

export function getDocumentDraftSnapshot(draft: DocumentDraft): string {
  return JSON.stringify({
    variants: draft.variants,
    contract: draft.contract ?? null,
    jsonSchema: draft.jsonSchema ?? null,
    contractOverrides: draft.contractOverrides,
  })
}

export function prepareDocumentWrite(draft: DocumentDraft): DocumentWriteInput {
  if (!documentVariantsAreValid(draft.variants)) {
    throw new Error('All variants must contain valid JSON')
  }
  if (!draft.jsonSchema || !draft.contract) {
    throw new Error('Contract inference is not complete')
  }
  if (draft.schemaDiagnostics.length > 0) {
    throw new Error('All variants must satisfy the contract')
  }
  return {
    variants: draft.variants,
    contract: draft.contract,
    jsonSchema: draft.jsonSchema,
    contractOverrides: draft.contractOverrides,
  }
}
