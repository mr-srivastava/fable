import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  blobs: defineTable({
    data: v.string(),
    size: v.number(),
    updatedAt: v.optional(v.number()),
  }),
})
