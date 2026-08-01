import { v } from 'convex/values'

export const documentExampleValidator = v.object({
  id: v.string(),
  name: v.string(),
  data: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

export const contractFieldValidator = v.object({
  path: v.string(),
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

export const documentValidator = v.object({
  _id: v.id('documents'),
  _creationTime: v.number(),
  data: v.string(),
  examples: v.optional(v.array(documentExampleValidator)),
  size: v.number(),
  totalSize: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  metadata: v.optional(
    v.object({
      version: v.number(),
    }),
  ),
  contract: v.optional(documentContractValidator),
})
