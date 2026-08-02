import { describe, expect, it } from 'vitest'
import type { JsonDocumentVariant } from '@shared/document'
import {
  analyzeVariantsForContract,
  inferContractFromVariants,
} from '@/lib/contract/compatibilityDiagnostics'

function example(id: string, data: unknown, name = id): JsonDocumentVariant {
  return {
    id,
    name,
    data: JSON.stringify(data),
    createdAt: 1,
  }
}

describe('inferContractFromVariants', () => {
  it('marks fields required only when they appear in every example', () => {
    const contract = inferContractFromVariants([
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
    const contract = inferContractFromVariants([
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
    const contract = inferContractFromVariants([
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

describe('analyzeVariantsForContract', () => {
  it('warns for divergent examples without shared envelope or discriminator fields', () => {
    const analysis = analyzeVariantsForContract([
      example('user', { id: '1', email: 'a@example.com' }),
      example('invoice', { total: 42, currency: 'USD' }),
      example('event', { name: 'signed_up', timestamp: '2026-05-31' }),
    ])

    expect(analysis.diagnostics.severity).toBe('warning')
  })

  it('does not warn when examples share an envelope', () => {
    const analysis = analyzeVariantsForContract([
      example('success', { status: 'ok', data: { id: '1' }, error: null }),
      example('error', {
        status: 'error',
        data: null,
        error: { code: 'NOPE' },
      }),
    ])

    expect(analysis.diagnostics.severity).toBe('none')
    expect(analysis.diagnostics.sharedEnvelopeFields).toEqual(
      expect.arrayContaining(['status', 'data', 'error']),
    )
  })

  it('does not warn when examples share a discriminator field', () => {
    const analysis = analyzeVariantsForContract([
      example('user', { type: 'user', email: 'a@example.com' }),
      example('invoice', { type: 'invoice', total: 42 }),
    ])

    expect(analysis.diagnostics.severity).toBe('none')
  })

  it('does not warn for a single example', () => {
    const analysis = analyzeVariantsForContract([
      example('user', { id: '1', email: 'a@example.com' }),
    ])

    expect(analysis.diagnostics).toMatchObject({
      severity: 'none',
      similarityScore: 1,
    })
  })

  it('groups similar examples together', () => {
    const analysis = analyzeVariantsForContract([
      example('one', { id: '1', name: 'Avery' }),
      example('two', { id: '2', name: 'Sam' }),
      example('three', { total: 42, currency: 'USD' }),
    ])

    expect(analysis.diagnostics.divergentGroups[0].variantIds).toEqual([
      'one',
      'two',
    ])
  })
})
