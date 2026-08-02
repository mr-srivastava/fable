import { describe, expect, it } from 'vitest'
import * as schema from 'valibot'
import {
  assertValidDocumentVariants,
  documentVariantSchema,
  jsonContractSchema,
  parseDocumentId,
  parseSerializedJsonSchema,
  serializeJsonSchema,
} from '@shared/document'

const validExample = {
  id: 'example-1',
  name: 'Success',
  data: '{"ok":true}',
  createdAt: 1,
}

const validContract = {
  version: 1,
  fields: [
    {
      path: 'data.id',
      type: 'string',
      required: true,
      nullable: false,
    },
  ],
}

describe('shared schemas', () => {
  it('accepts valid document examples and contracts', () => {
    expect(schema.safeParse(documentVariantSchema, validExample).success).toBe(
      true,
    )
    expect(schema.safeParse(jsonContractSchema, validContract).success).toBe(
      true,
    )
  })

  it('rejects document examples with missing required fields', () => {
    const result = schema.safeParse(documentVariantSchema, {
      id: 'example-1',
      data: '{"ok":true}',
      createdAt: 1,
    })

    expect(result.success).toBe(false)
  })

  it('rejects contract fields with invalid types', () => {
    const result = schema.safeParse(jsonContractSchema, {
      ...validContract,
      fields: [{ ...validContract.fields[0], type: 'date' }],
    })

    expect(result.success).toBe(false)
  })

  it('keeps the existing empty examples array failure', () => {
    expect(() => assertValidDocumentVariants([])).toThrow(
      'At least one variant is required',
    )
  })

  it('rejects duplicate example IDs', () => {
    expect(() =>
      assertValidDocumentVariants([validExample, validExample]),
    ).toThrow('Variant IDs must be unique')
  })
})

describe('parseDocumentId', () => {
  it('accepts IDs that match the existing rules', () => {
    expect(parseDocumentId('abc_123456')).toBe('abc_123456')
  })

  it('rejects IDs that are too short, too long, or contain invalid characters', () => {
    expect(parseDocumentId('short')).toBeNull()
    expect(parseDocumentId('a'.repeat(65))).toBeNull()
    expect(parseDocumentId('abc-123456')).toBeNull()
  })
})

describe('serialized JSON Schema persistence', () => {
  it('preserves reserved JSON Schema keywords inside a string', () => {
    const jsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $ref: '#/definitions/Specimen',
      definitions: { Specimen: { type: 'object' } },
    }

    const serialized = serializeJsonSchema(jsonSchema)

    expect(serialized).toBeTypeOf('string')
    expect(parseSerializedJsonSchema(serialized!)).toEqual(jsonSchema)
  })

  it('rejects serialized values that are not schema objects', () => {
    expect(() => parseSerializedJsonSchema('[]')).toThrow(
      'Stored JSON Schema must be an object',
    )
  })
})
