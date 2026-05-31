import * as schema from 'valibot'
import type { Id } from '../../convex/_generated/dataModel'

export const jsonFieldTypeSchema = schema.picklist([
  'string',
  'number',
  'boolean',
  'null',
  'array',
  'object',
  'unknown',
])

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

export function parseDocumentId(raw: string): Id<'documents'> | null {
  return schema.safeParse(documentIdSchema, raw).success
    ? (raw as Id<'documents'>)
    : null
}

export function assertValidDocumentExamples(examples: unknown) {
  schema.parse(documentExamplesSchema, examples)
}

export function assertValidDocumentContract(contract: unknown) {
  schema.parse(jsonContractSchema, contract)
}
