import { describe, expect, it } from 'vitest'
import { normalizeDocumentExamples } from '@/lib/document-examples'

describe('normalizeDocumentExamples', () => {
  it('preserves examples on current documents', () => {
    const examples = [
      {
        id: 'one',
        name: 'Success',
        data: '{"ok":true}',
        createdAt: 1,
      },
    ]

    expect(normalizeDocumentExamples({ data: '{}', examples })).toBe(examples)
  })

  it('normalizes legacy data into one default example', () => {
    expect(
      normalizeDocumentExamples({ data: '{"legacy":true}', _creationTime: 7 }),
    ).toEqual([
      {
        id: 'default',
        name: 'Example',
        data: '{"legacy":true}',
        createdAt: 7,
      },
    ])
  })
})
