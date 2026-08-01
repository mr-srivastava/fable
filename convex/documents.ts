import { v } from 'convex/values'
import { prepareDocumentRecord } from '../shared/document-write'
import { mutation, query } from './_generated/server'
import {
  contractFieldOverrideValidator,
  documentContractValidator,
  documentExampleValidator,
  documentValidator,
} from './documentModel'

export const create = mutation({
  args: {
    examples: v.array(documentExampleValidator),
    contract: v.optional(documentContractValidator),
    jsonSchema: v.optional(v.any()),
    contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
  },
  returns: v.id('documents'),
  handler: async (ctx, args) => {
    const prepared = prepareDocumentRecord(
      args.examples,
      args.contract,
      args.jsonSchema,
      args.contractOverrides,
    )

    return ctx.db.insert('documents', {
      data: prepared.data,
      examples: args.examples,
      size: prepared.size,
      totalSize: prepared.totalSize,
      updatedAt: Date.now(),
      metadata: { version: prepared.jsonSchema ? 2 : 1 },
      contract: prepared.contract,
      jsonSchema: prepared.jsonSchema,
      contractOverrides: prepared.contractOverrides,
    })
  },
})

export const get = query({
  args: { id: v.id('documents') },
  returns: v.union(documentValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

export const update = mutation({
  args: {
    id: v.id('documents'),
    examples: v.array(documentExampleValidator),
    contract: v.optional(documentContractValidator),
    jsonSchema: v.optional(v.any()),
    contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prepared = prepareDocumentRecord(
      args.examples,
      args.contract,
      args.jsonSchema,
      args.contractOverrides,
    )

    await ctx.db.patch(args.id, {
      data: prepared.data,
      examples: args.examples,
      size: prepared.size,
      totalSize: prepared.totalSize,
      updatedAt: Date.now(),
      metadata: { version: prepared.jsonSchema ? 2 : 1 },
      contract: prepared.contract,
      jsonSchema: prepared.jsonSchema,
      contractOverrides: prepared.contractOverrides,
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
