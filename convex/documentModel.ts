import { v } from 'convex/values'

export const documentVariantValidator = v.object({
  id: v.string(),
  name: v.string(),
  data: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

export const contractFieldValidator = v.object({
  path: v.string(),
  schemaPointer: v.optional(v.string()),
  type: v.union(
    v.literal('string'),
    v.literal('number'),
    v.literal('boolean'),
    v.literal('null'),
    v.literal('array'),
    v.literal('object'),
    v.literal('unknown'),
  ),
  required: v.boolean(),
  nullable: v.boolean(),
  enumValues: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
})

export const documentContractValidator = v.object({
  version: v.number(),
  fields: v.array(contractFieldValidator),
})

export const contractFieldOverrideValidator = v.object({
  pointer: v.string(),
  required: v.optional(v.boolean()),
  nullable: v.optional(v.boolean()),
  enumValues: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
})

export const preparedDocumentValidator = v.object({
  data: v.string(),
  variants: v.array(documentVariantValidator),
  size: v.number(),
  totalSize: v.number(),
  contract: v.optional(documentContractValidator),
  jsonSchemaJson: v.optional(v.string()),
  contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
})

export const documentReadValidator = v.object({
  _id: v.id('documents'),
  _creationTime: v.number(),
  data: v.string(),
  variants: v.optional(v.array(documentVariantValidator)),
  size: v.number(),
  totalSize: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  metadata: v.optional(
    v.object({
      version: v.number(),
    }),
  ),
  contract: v.optional(documentContractValidator),
  jsonSchemaJson: v.optional(v.string()),
  contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
})
