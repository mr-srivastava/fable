import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 10

export const checkAndIncrement = internalMutation({
  args: {
    ip: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('rateLimits')
      .withIndex('by_ip', (q) => q.eq('ip', args.ip))
      .first()

    const windowStart = existing?.windowStart ?? args.now
    const isNewWindow = args.now - windowStart >= WINDOW_MS
    const count = isNewWindow ? 1 : (existing?.count ?? 0) + 1

    if (count > MAX_REQUESTS) {
      throw new Error('Rate limit exceeded')
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        count: isNewWindow ? 1 : count,
        windowStart: isNewWindow ? args.now : windowStart,
      })
    } else {
      await ctx.db.insert('rateLimits', {
        ip: args.ip,
        count: 1,
        windowStart: args.now,
      })
    }
  },
})
