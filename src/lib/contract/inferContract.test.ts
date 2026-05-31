import { describe, expect, it } from 'vitest'
import type { JsonDocumentExample } from '@/lib/schemas'
import {
  analyzeExamplesForContract,
  inferContractFromExamples,
} from '@/lib/contract/inferContract'

function example(id: string, data: unknown, name = id): JsonDocumentExample {
  return {
    id,
    name,
    data: JSON.stringify(data),
    createdAt: 1,
  }
}

describe('inferContractFromExamples', () => {
  it('marks fields required only when they appear in every example', () => {
    const contract = inferContractFromExamples([
      example('one', { id: '1', email: 'a@example.com' }),
      example('two', { id: '2' }),
    ])

    expect(contract.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'id', required: true }),
        expect.objectContaining({ path: 'email', required: false }),
      ]),
    )
  })

  it('tracks nullable fields', () => {
    const contract = inferContractFromExamples([
      example('one', { name: 'Avery' }),
      example('two', { name: null }),
    ])

    expect(contract.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name', nullable: true }),
      ]),
    )
  })

  it('marks missing keys in arrays of objects as optional', () => {
    const contract = inferContractFromExamples([
      example('one', { users: [{ id: '1', email: 'a@example.com' }] }),
      example('two', { users: [{ id: '2' }] }),
    ])

    expect(contract.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'users[].id', required: true }),
        expect.objectContaining({
          path: 'users[].email',
          required: false,
        }),
      ]),
    )
  })
})

describe('analyzeExamplesForContract', () => {
  it('warns for divergent examples without shared envelope or discriminator fields', () => {
    const analysis = analyzeExamplesForContract([
      example('user', { id: '1', email: 'a@example.com' }),
      example('invoice', { total: 42, currency: 'USD' }),
      example('event', { name: 'signed_up', timestamp: '2026-05-31' }),
    ])

    expect(analysis.diagnostics.severity).toBe('warning')
  })
})
