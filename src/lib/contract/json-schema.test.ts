import { describe, expect, it } from 'vitest'
import {
  applyContractOverrides,
  escapeJsonPointerSegment,
  normalizeJsonSchema,
  projectJsonSchemaToContract,
  validateExamplesAgainstSchema,
} from '@shared/json-schema'
import type { JsonDocumentExample, JsonSchema } from '@shared/document'

const schema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        'a/b~c': { type: ['string', 'null'] },
      },
      required: ['id'],
    },
  },
}

function example(id: string, value: unknown): JsonDocumentExample {
  return { id, name: id, data: JSON.stringify(value), createdAt: 1 }
}

describe('JSON Schema adapter', () => {
  it('projects local references and escaped field pointers', () => {
    const contract = projectJsonSchemaToContract(schema)
    expect(contract.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'id',
          schemaPointer: '/id',
          required: true,
        }),
        expect.objectContaining({
          path: 'a/b~c',
          schemaPointer: '/a~1b~0c',
          nullable: true,
        }),
      ]),
    )
    expect(escapeJsonPointerSegment('a/b~c')).toBe('a~1b~0c')
  })

  it('applies authored constraints and drops missing targets', () => {
    const result = applyContractOverrides(schema, [
      {
        pointer: '/id',
        required: false,
        enumValues: ['known'],
        description: 'ID',
      },
      { pointer: '/missing', nullable: true },
    ])
    expect(result.overrides).toHaveLength(1)
    expect(
      projectJsonSchemaToContract(result.jsonSchema).fields[1],
    ).toMatchObject({
      path: 'id',
      required: false,
      enumValues: ['known'],
      description: 'ID',
    })
  })

  it('reports stable per-example Ajv diagnostics', () => {
    const diagnostics = validateExamplesAgainstSchema(
      [example('bad', { id: 1 })],
      schema,
    )
    expect(diagnostics[0]).toMatchObject({
      exampleId: 'bad',
      instancePath: '/id',
      keyword: 'type',
    })
  })

  it('rejects remote references and malformed schemas', () => {
    expect(() =>
      normalizeJsonSchema({ $ref: 'https://example.com/schema' }),
    ).toThrow('Unsupported remote JSON Schema reference')
    expect(() => normalizeJsonSchema({ type: 'not-a-type' })).toThrow()
  })
})
