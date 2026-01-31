import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  blobs: defineTable({
    data: v.string(),
    size: v.number(),
    updatedAt: v.optional(v.number()),
  }),
  rateLimits: defineTable({
    ip: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index('by_ip', ['ip']),
})
