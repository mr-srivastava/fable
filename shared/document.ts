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

export const documentExampleSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  data: schema.string(),
  createdAt: schema.number(),
  updatedAt: schema.optional(schema.number()),
})

export const documentMetadataSchema = schema.object({
  version: schema.number(),
})

export const documentExamplesSchema = schema.pipe(
  schema.array(documentExampleSchema),
  schema.minLength(1, 'At least one example is required'),
  schema.check(
    (examples) =>
      new Set(examples.map((example) => example.id)).size === examples.length,
    'Example IDs must be unique',
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
export type JsonDocumentExample = schema.InferOutput<
  typeof documentExampleSchema
>
export type JsonDocumentMetadata = schema.InferOutput<
  typeof documentMetadataSchema
>

export function parseDocumentId<T extends string = string>(
  raw: string,
): T | null {
  return schema.safeParse(documentIdSchema, raw).success ? (raw as T) : null
}

export function assertValidDocumentExamples(examples: unknown) {
  schema.parse(documentExamplesSchema, examples)
}

export function assertValidDocumentContract(contract: unknown) {
  schema.parse(jsonContractSchema, contract)
}

export function parseJsonContract(contract: unknown): JsonContract {
  return schema.parse(jsonContractSchema, contract)
}
