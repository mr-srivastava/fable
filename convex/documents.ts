import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import {
  documentReadValidator,
  preparedDocumentValidator,
} from './documentModel'

export const createPrepared = internalMutation({
  args: { prepared: preparedDocumentValidator },
  returns: v.id('documents'),
  handler: async (ctx, args) => {
    const { prepared } = args

    return ctx.db.insert('documents', {
      data: prepared.data,
      variants: prepared.variants,
      size: prepared.size,
      totalSize: prepared.totalSize,
      updatedAt: Date.now(),
      metadata: { version: prepared.jsonSchemaJson ? 3 : 1 },
      contract: prepared.contract,
      jsonSchemaJson: prepared.jsonSchemaJson,
      contractOverrides: prepared.contractOverrides,
    })
  },
})

export const get = query({
  args: { id: v.id('documents') },
  returns: v.union(documentReadValidator, v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id)
    if (!document) return null

    const { jsonSchema, jsonSchemaJson, variants, examples, ...rest } = document
    return {
      ...rest,
      variants: variants ?? examples,
      jsonSchemaJson:
        jsonSchemaJson ?? (jsonSchema ? JSON.stringify(jsonSchema) : undefined),
    }
  },
})

export const updatePrepared = internalMutation({
  args: {
    id: v.id('documents'),
    prepared: preparedDocumentValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { prepared } = args

    await ctx.db.patch(args.id, {
      data: prepared.data,
      variants: prepared.variants,
      size: prepared.size,
      totalSize: prepared.totalSize,
      updatedAt: Date.now(),
      metadata: { version: prepared.jsonSchemaJson ? 3 : 1 },
      contract: prepared.contract,
      jsonSchema: undefined,
      jsonSchemaJson: prepared.jsonSchemaJson,
      contractOverrides: prepared.contractOverrides,
    })
    return null
  },
})

export const remove = internalMutation({
  args: {
    id: v.id('documents'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})
