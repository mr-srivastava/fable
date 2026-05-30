import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const MAX_DOCUMENT_SIZE = 102400 // 100KB

const contractField = v.object({
  path: v.string(),
  type: v.string(),
  required: v.boolean(),
  nullable: v.boolean(),
  enumValues: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
})

const documentContract = v.object({
  version: v.number(),
  fields: v.array(contractField),
})

const documentDoc = v.object({
  _id: v.id('documents'),
  _creationTime: v.number(),
  data: v.string(),
  size: v.number(),
  updatedAt: v.optional(v.number()),
  metadata: v.optional(
    v.object({
      version: v.number(),
    }),
  ),
  contract: v.optional(documentContract),
})

function assertValidDocumentData(data: string): number {
  try {
    JSON.parse(data)
  } catch {
    throw new Error('Invalid JSON')
  }

  const size = new Blob([data]).size
  if (size > MAX_DOCUMENT_SIZE) {
    throw new Error(`JSON too large: ${size} bytes (max ${MAX_DOCUMENT_SIZE})`)
  }

  return size
}

export const create = mutation({
  args: {
    data: v.string(),
    contract: v.optional(documentContract),
  },
  returns: v.id('documents'),
  handler: async (ctx, args) => {
    const size = assertValidDocumentData(args.data)

    return await ctx.db.insert('documents', {
      data: args.data,
      size,
      updatedAt: Date.now(),
      metadata: { version: 1 },
      contract: args.contract,
    })
  },
})

export const get = query({
  args: { id: v.id('documents') },
  returns: v.union(documentDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const update = mutation({
  args: {
    id: v.id('documents'),
    data: v.string(),
    contract: v.optional(documentContract),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const size = assertValidDocumentData(args.data)

    await ctx.db.patch(args.id, {
      data: args.data,
      size,
      updatedAt: Date.now(),
      metadata: { version: 1 },
      contract: args.contract,
    })
    return null
  },
})

export const remove = mutation({
  args: {
    id: v.id('documents'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
