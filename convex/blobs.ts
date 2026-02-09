import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const MAX_BLOB_SIZE = 102400 // 100KB

const blobDoc = v.object({
  _id: v.id('blobs'),
  _creationTime: v.number(),
  data: v.string(),
  size: v.number(),
  updatedAt: v.optional(v.number()),
})

export const create = mutation({
  args: {
    data: v.string(),
  },
  returns: v.id('blobs'),
  handler: async (ctx, args) => {
    try {
      JSON.parse(args.data)
    } catch {
      throw new Error('Invalid JSON')
    }

    const size = new Blob([args.data]).size
    if (size > MAX_BLOB_SIZE) {
      throw new Error(
        `JSON too large: ${size} bytes (max ${MAX_BLOB_SIZE})`
      )
    }

    return await ctx.db.insert('blobs', {
      data: args.data,
      size,
      updatedAt: Date.now(),
    })
  },
})

export const get = query({
  args: { id: v.id('blobs') },
  returns: v.union(blobDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const update = mutation({
  args: {
    id: v.id('blobs'),
    data: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      JSON.parse(args.data)
    } catch {
      throw new Error('Invalid JSON')
    }

    const size = new Blob([args.data]).size
    if (size > MAX_BLOB_SIZE) {
      throw new Error(
        `JSON too large: ${size} bytes (max ${MAX_BLOB_SIZE})`
      )
    }

    await ctx.db.patch(args.id, {
      data: args.data,
      size,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('blobs') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
