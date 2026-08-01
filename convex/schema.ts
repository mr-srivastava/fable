import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
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
  }),
})
