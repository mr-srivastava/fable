import { describe, expect, it } from 'vitest'
import {
  deriveDocumentEditorCapabilities,
  draftHasUsableEffectiveSchema,
} from './document-editor-capabilities'
import { createDocumentDraft } from '@/lib/document-draft'
import { buildDocumentVariant } from '@/test/factories/document'
import {
  buildDocumentEditorSnapshot,
  buildInvalidJsonEditorSnapshot,
  buildViolationsEditorSnapshot,
} from '@/test/factories/document-editor'

describe('document editor capabilities', () => {
  it('blocks submit and export while analysis is pending', () => {
    const capabilities = deriveDocumentEditorCapabilities(
      buildDocumentEditorSnapshot({
        analysis: 'debouncing',
        draft: createDocumentDraft([
          buildDocumentVariant({ data: '{"id":1}' }),
        ]),
      }),
    )

    expect(capabilities).toEqual({
      canSubmit: false,
      canExport: false,
      contractFreshness: undefined,
      blockReason: 'inferring',
    })
  })

  it('allows submit and export once analysis is ready', () => {
    const snapshot = buildDocumentEditorSnapshot({ analysis: 'ready' })
    const capabilities = deriveDocumentEditorCapabilities(snapshot)

    expect(draftHasUsableEffectiveSchema(snapshot.context.draft)).toBe(true)
    expect(capabilities).toEqual({
      canSubmit: true,
      canExport: true,
      contractFreshness: 'current',
    })
  })

  it('reports invalidJson and retains the previous contract', () => {
    const capabilities = deriveDocumentEditorCapabilities(
      buildInvalidJsonEditorSnapshot(),
    )

    expect(capabilities).toEqual({
      canSubmit: false,
      canExport: false,
      contractFreshness: 'retained',
      blockReason: 'invalidJson',
    })
  })

  it('reports contractViolations when overrides break examples', () => {
    const capabilities = deriveDocumentEditorCapabilities(
      buildViolationsEditorSnapshot(),
    )

    expect(capabilities).toEqual({
      canSubmit: false,
      canExport: false,
      contractFreshness: 'current',
      blockReason: 'contractViolations',
    })
  })

  it('reports invalidContract when inference fails', () => {
    const capabilities = deriveDocumentEditorCapabilities(
      buildDocumentEditorSnapshot({
        analysis: 'failed',
        draft: createDocumentDraft([
          buildDocumentVariant({ data: '{"id":1}' }),
        ]),
        analysisError: 'Quicktype failed',
      }),
    )

    expect(capabilities).toEqual({
      canSubmit: false,
      canExport: false,
      contractFreshness: undefined,
      blockReason: 'invalidContract',
    })
  })
})
