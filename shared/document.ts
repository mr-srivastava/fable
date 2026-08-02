import * as schema from 'valibot'

export const JSON_FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'null',
  'array',
  'object',
  'unknown',
] as const

export const jsonFieldTypeSchema = schema.picklist(JSON_FIELD_TYPES)

export const jsonContractFieldSchema = schema.object({
  path: schema.string(),
  schemaPointer: schema.optional(schema.string()),
  type: jsonFieldTypeSchema,
  required: schema.boolean(),
  nullable: schema.boolean(),
  enumValues: schema.optional(schema.array(schema.string())),
  description: schema.optional(schema.string()),
})

export const jsonContractSchema = schema.object({
  version: schema.number(),
  fields: schema.array(jsonContractFieldSchema),
})

export type JsonSchema = Record<string, unknown>

export const contractFieldOverrideSchema = schema.object({
  pointer: schema.string(),
  required: schema.optional(schema.boolean()),
  nullable: schema.optional(schema.boolean()),
  enumValues: schema.optional(schema.array(schema.string())),
  description: schema.optional(schema.string()),
})

export const contractOverridesSchema = schema.array(contractFieldOverrideSchema)

export const documentVariantSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  data: schema.string(),
  createdAt: schema.number(),
  updatedAt: schema.optional(schema.number()),
})

export const documentMetadataSchema = schema.object({
  version: schema.number(),
})

export const documentVariantsSchema = schema.pipe(
  schema.array(documentVariantSchema),
  schema.minLength(1, 'At least one variant is required'),
  schema.check(
    (variants) =>
      new Set(variants.map((variant) => variant.id)).size === variants.length,
    'Variant IDs must be unique',
  ),
)

const DOCUMENT_ID_PATTERN = /^[a-z0-9_]+$/i
const MIN_DOCUMENT_ID_LENGTH = 10
const MAX_DOCUMENT_ID_LENGTH = 64

export const documentIdSchema = schema.pipe(
  schema.string(),
  schema.minLength(MIN_DOCUMENT_ID_LENGTH),
  schema.maxLength(MAX_DOCUMENT_ID_LENGTH),
  schema.regex(DOCUMENT_ID_PATTERN),
)

export type JsonFieldType = schema.InferOutput<typeof jsonFieldTypeSchema>
export type JsonContractField = schema.InferOutput<
  typeof jsonContractFieldSchema
>
export type JsonContract = schema.InferOutput<typeof jsonContractSchema>
export type ContractFieldOverride = schema.InferOutput<
  typeof contractFieldOverrideSchema
>
export type ContractOverrides = schema.InferOutput<
  typeof contractOverridesSchema
>
export type JsonDocumentVariant = schema.InferOutput<
  typeof documentVariantSchema
>
export type JsonDocumentMetadata = schema.InferOutput<
  typeof documentMetadataSchema
>

export function parseDocumentId<T extends string = string>(
  raw: string,
): T | null {
  return schema.safeParse(documentIdSchema, raw).success ? (raw as T) : null
}

export function assertValidDocumentVariants(variants: unknown) {
  schema.parse(documentVariantsSchema, variants)
}

export function assertValidDocumentContract(contract: unknown) {
  schema.parse(jsonContractSchema, contract)
}

export function parseJsonContract(contract: unknown): JsonContract {
  return schema.parse(jsonContractSchema, contract)
}

export function parseContractOverrides(overrides: unknown): ContractOverrides {
  return schema.parse(contractOverridesSchema, overrides)
}

export function serializeJsonSchema(
  jsonSchema: JsonSchema | undefined,
): string | undefined {
  return jsonSchema ? JSON.stringify(jsonSchema) : undefined
}

export function parseSerializedJsonSchema(value: string): JsonSchema {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Stored JSON Schema must be an object')
  }
  return parsed as JsonSchema
}
