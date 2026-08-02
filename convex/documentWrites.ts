'use node'

import { v } from 'convex/values'
import {
  parseSerializedJsonSchema,
  serializeJsonSchema,
} from '../shared/document'
import { prepareDocumentRecord } from '../shared/document-write'
import { internal } from './_generated/api'
import { action } from './_generated/server'
import {
  contractFieldOverrideValidator,
  documentContractValidator,
  documentVariantValidator,
} from './documentModel'
import type { Id } from './_generated/dataModel'

const documentWriteArgs = {
  variants: v.array(documentVariantValidator),
  contract: v.optional(documentContractValidator),
  jsonSchemaJson: v.optional(v.string()),
  contractOverrides: v.optional(v.array(contractFieldOverrideValidator)),
}

function prepareDocument(args: {
  variants: Array<{
    id: string
    name: string
    data: string
    createdAt: number
    updatedAt?: number
  }>
  contract?: Parameters<typeof prepareDocumentRecord>[1]
  jsonSchemaJson?: string
  contractOverrides?: Parameters<typeof prepareDocumentRecord>[3]
}) {
  const prepared = prepareDocumentRecord(
    args.variants,
    args.contract,
    args.jsonSchemaJson
      ? parseSerializedJsonSchema(args.jsonSchemaJson)
      : undefined,
    args.contractOverrides,
  )

  return {
    data: prepared.data,
    variants: args.variants,
    size: prepared.size,
    totalSize: prepared.totalSize,
    contract: prepared.contract,
    jsonSchemaJson: serializeJsonSchema(prepared.jsonSchema),
    contractOverrides: prepared.contractOverrides,
  }
}

export const create = action({
  args: documentWriteArgs,
  returns: v.id('documents'),
  handler: async (ctx, args) => {
    const id: Id<'documents'> = await ctx.runMutation(
      internal.documents.createPrepared,
      { prepared: prepareDocument(args) },
    )
    return id
  },
})

export const update = action({
  args: {
    id: v.id('documents'),
    ...documentWriteArgs,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.documents.updatePrepared, {
      id: args.id,
      prepared: prepareDocument(args),
    })
    return null
  },
})
