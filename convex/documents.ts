import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const MAX_DOCUMENT_SIZE = 102400 // 100KB

const documentExample = v.object({
  id: v.string(),
  name: v.string(),
  data: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

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
  examples: v.optional(v.array(documentExample)),
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

function assertValidDocumentExamples(
  examples: Array<{
    id: string
    name: string
    data: string
    createdAt: number
    updatedAt?: number
  }>,
) {
  if (examples.length === 0) {
    throw new Error('At least one example is required')
  }

  for (const example of examples) {
    assertValidDocumentData(example.data)
  }
}

export const create = mutation({
  args: {
    data: v.string(),
    examples: v.optional(v.array(documentExample)),
    contract: v.optional(documentContract),
  },
  returns: v.id('documents'),
  handler: async (ctx, args) => {
    const data = args.examples?.[0]?.data ?? args.data
    const size = assertValidDocumentData(data)

    if (args.examples) {
      assertValidDocumentExamples(args.examples)
    }

    return await ctx.db.insert('documents', {
      data,
      examples: args.examples,
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
    examples: v.optional(v.array(documentExample)),
    contract: v.optional(documentContract),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = args.examples?.[0]?.data ?? args.data
    const size = assertValidDocumentData(data)

    if (args.examples) {
      assertValidDocumentExamples(args.examples)
    }

    await ctx.db.patch(args.id, {
      data,
      examples: args.examples,
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
