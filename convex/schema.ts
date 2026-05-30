import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  documents: defineTable({
    data: v.string(),
    size: v.number(),
    updatedAt: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        version: v.number(),
      }),
    ),
    contract: v.optional(
      v.object({
        version: v.number(),
        fields: v.array(
          v.object({
            path: v.string(),
            type: v.string(),
            required: v.boolean(),
            nullable: v.boolean(),
            enumValues: v.optional(v.array(v.string())),
            description: v.optional(v.string()),
          }),
        ),
      }),
    ),
  }),
})
