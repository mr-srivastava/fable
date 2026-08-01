import { describe, expect, it } from 'vitest'
import {
  MAX_EXAMPLES_PER_DOCUMENT,
  MAX_EXAMPLE_BYTES,
} from '@shared/document-limits'
import { prepareDocumentRecord } from '@shared/document-write'
import type { JsonDocumentExample } from '@shared/document'

function example(id: string, data = '{}'): JsonDocumentExample {
  return { id, name: id, data, createdAt: 1 }
}

describe('prepareDocumentRecord', () => {
  it('derives legacy data and reports primary and total sizes', () => {
    const examples = [example('one', '{"ok":true}'), example('two')]
    const result = prepareDocumentRecord(examples)

    expect(result.data).toBe(examples[0].data)
    expect(result.size).toBe(11)
    expect(result.totalSize).toBeGreaterThan(result.size)
  })

  it('rejects invalid JSON', () => {
    expect(() => prepareDocumentRecord([example('one', '{')])).toThrow(
      'Invalid JSON',
    )
  })

  it('rejects oversized examples', () => {
    const data = JSON.stringify({ value: 'x'.repeat(MAX_EXAMPLE_BYTES) })
    expect(() => prepareDocumentRecord([example('one', data)])).toThrow(
      /^JSON too large:/,
    )
  })

  it('rejects too many examples', () => {
    const examples = Array.from(
      { length: MAX_EXAMPLES_PER_DOCUMENT + 1 },
      (_, index) => example(String(index)),
    )
    expect(() => prepareDocumentRecord(examples)).toThrow(/^Too many examples:/)
  })

  it('rejects documents whose combined payload exceeds the total limit', () => {
    const data = JSON.stringify({ value: 'x'.repeat(90 * 1024) })
    const examples = Array.from({ length: 6 }, (_, index) =>
      example(String(index), data),
    )

    expect(() => prepareDocumentRecord(examples)).toThrow(
      /^Document too large:/,
    )
  })
})
