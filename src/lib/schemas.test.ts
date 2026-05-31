import { describe, expect, it } from 'vitest'
import * as schema from 'valibot'
import {
  assertValidDocumentExamples,
  documentExampleSchema,
  jsonContractSchema,
  parseDocumentId,
} from '@/lib/schemas'

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
    expect(schema.safeParse(documentExampleSchema, validExample).success).toBe(
      true,
    )
    expect(schema.safeParse(jsonContractSchema, validContract).success).toBe(
      true,
    )
  })

  it('rejects document examples with missing required fields', () => {
    const result = schema.safeParse(documentExampleSchema, {
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
    expect(() => assertValidDocumentExamples([])).toThrow(
      'At least one example is required',
    )
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
