import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  contractFieldOverrideValidator,
  documentContractValidator,
  documentExampleValidator,
} from './documentModel'

export default defineSchema({
  documents: defineTable({
    data: v.string(),
    examples: v.optional(v.array(documentExampleValidator)),
    size: v.number(),
    totalSize: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(v.object({ version: v.number() })),
    contract: v.optional(documentContractValidator),
    // Legacy object-form field. New writes use jsonSchemaJson because Convex
    // reserves JSON Schema keywords beginning with `$`.
    jsonSchema: v.optional(v.any()),
    jsonSchemaJson: v.optional(v.string()),
    contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
  }),
})
