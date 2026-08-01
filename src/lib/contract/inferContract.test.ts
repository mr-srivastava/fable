import { describe, expect, it } from 'vitest'
import type { JsonDocumentExample } from '@shared/document'
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

  it('does not warn when examples share an envelope', () => {
    const analysis = analyzeExamplesForContract([
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
    const analysis = analyzeExamplesForContract([
      example('user', { type: 'user', email: 'a@example.com' }),
      example('invoice', { type: 'invoice', total: 42 }),
    ])

    expect(analysis.diagnostics.severity).toBe('none')
  })

  it('does not warn for a single example', () => {
    const analysis = analyzeExamplesForContract([
      example('user', { id: '1', email: 'a@example.com' }),
    ])

    expect(analysis.diagnostics).toMatchObject({
      severity: 'none',
      similarityScore: 1,
    })
  })

  it('groups similar examples together', () => {
    const analysis = analyzeExamplesForContract([
      example('one', { id: '1', name: 'Avery' }),
      example('two', { id: '2', name: 'Sam' }),
      example('three', { total: 42, currency: 'USD' }),
    ])

    expect(analysis.diagnostics.divergentGroups[0].exampleIds).toEqual([
      'one',
      'two',
    ])
  })
})
