import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import { createConvexTest } from './test.setup'

const firstExample = {
  id: 'one',
  name: 'Success',
  data: '{"id":"one"}',
  createdAt: 1,
}

describe('documents', () => {
  it('creates and reads a prepared document through the public API', async () => {
    const t = createConvexTest()

    const id = await t.action(api.documentWrites.create, {
      examples: [firstExample],
    })
    const document = await t.query(api.documents.get, { id })

    expect(document).toMatchObject({
      _id: id,
      data: firstExample.data,
      examples: [firstExample],
      size: 12,
      metadata: { version: 1 },
    })
    expect(document?.totalSize).toBeGreaterThan(document?.size ?? 0)
    expect(document?.updatedAt).toEqual(expect.any(Number))
  })

  it('updates derived projections, schema, and overrides', async () => {
    const t = createConvexTest()
    const id = await t.action(api.documentWrites.create, {
      examples: [firstExample],
    })
    const updatedExample = {
      ...firstExample,
      data: '{"id":"two"}',
      updatedAt: 2,
    }
    const jsonSchemaJson = JSON.stringify({
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    })

    await t.action(api.documentWrites.update, {
      id,
      examples: [updatedExample],
      jsonSchemaJson,
      contractOverrides: [{ pointer: '/id', description: 'Stable identifier' }],
    })
    const document = await t.query(api.documents.get, { id })

    expect(document).toMatchObject({
      data: updatedExample.data,
      examples: [updatedExample],
      metadata: { version: 3 },
      contractOverrides: [{ pointer: '/id', description: 'Stable identifier' }],
    })
    expect(JSON.parse(document?.jsonSchemaJson ?? '{}')).toMatchObject({
      properties: {
        id: { description: 'Stable identifier', type: 'string' },
      },
    })
    expect(document?.contract?.fields).toEqual([
      expect.objectContaining({
        path: 'id',
        schemaPointer: '/id',
        description: 'Stable identifier',
      }),
    ])
  })

  it('normalizes the legacy object schema when reading old records', async () => {
    const t = createConvexTest()
    const legacySchema = {
      type: 'object',
      properties: { legacy: { type: 'boolean' } },
    }
    const id = await t.run((ctx) =>
      ctx.db.insert('documents', {
        data: '{"legacy":true}',
        size: 15,
        jsonSchema: legacySchema,
      }),
    )

    const document = await t.query(api.documents.get, { id })

    expect(JSON.parse(document?.jsonSchemaJson ?? '{}')).toEqual(legacySchema)
    expect(document).not.toHaveProperty('jsonSchema')
  })

  it('deletes a document through the public mutation', async () => {
    const t = createConvexTest()
    const id = await t.action(api.documentWrites.create, {
      examples: [firstExample],
    })

    await t.mutation(api.documents.remove, { id })

    await expect(t.query(api.documents.get, { id })).resolves.toBeNull()
  })

  it('rejects invalid write input before persistence', async () => {
    const t = createConvexTest()

    await expect(
      t.action(api.documentWrites.create, {
        examples: [{ ...firstExample, data: '{' }],
      }),
    ).rejects.toThrow('Invalid JSON')

    await expect(
      t.run((ctx) => ctx.db.query('documents').collect()),
    ).resolves.toEqual([])
  })
})
