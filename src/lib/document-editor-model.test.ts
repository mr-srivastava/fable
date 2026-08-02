import { describe, expect, it } from 'vitest'
import { createDocumentEditorViewModel } from './document-editor-model'
import {
  buildDocumentEditorSnapshot,
  buildInvalidJsonEditorSnapshot,
  buildReadyDocumentDraft,
} from '@/test/factories/document-editor'

describe('document editor view model', () => {
  it('exposes discriminated capabilities from workflow state', () => {
    const inferring = buildDocumentEditorSnapshot({ analysis: 'debouncing' })
    expect(createDocumentEditorViewModel(inferring)).toMatchObject({
      contract: { status: { type: 'inferring' } },
      submission: { status: 'unavailable', reason: 'inferring' },
      exports: { status: 'unavailable' },
    })

    const ready = buildDocumentEditorSnapshot({ analysis: 'ready' })
    expect(createDocumentEditorViewModel(ready)).toMatchObject({
      payload: { status: 'valid', value: '{"id":1}', size: 8 },
      contract: { status: { type: 'ready' }, valueFreshness: 'current' },
      submission: { status: 'available' },
      exports: { status: 'available' },
    })
  })

  it('exposes invalid JSON without discarding the previous contract', () => {
    const model = createDocumentEditorViewModel(
      buildInvalidJsonEditorSnapshot(),
    )

    expect(model.payload.status).toBe('invalid')
    expect(model.contract.status).toEqual({ type: 'invalidJson' })
    expect(model.contract.value).toBeDefined()
    expect(model.contract.valueFreshness).toBe('retained')
    expect(model.editor.assistance).toMatchObject({
      status: 'available',
      freshness: 'retained',
    })
    expect(model.editor.validation).toEqual({ status: 'syntaxError' })
    expect(model.submission).toEqual({
      status: 'unavailable',
      reason: 'invalidJson',
    })
  })

  it('enables current-contract editor assistance once analysis is ready', () => {
    const model = createDocumentEditorViewModel(
      buildDocumentEditorSnapshot({
        analysis: 'ready',
        draft: buildReadyDocumentDraft(),
      }),
    )

    expect(model.editor.assistance).toMatchObject({
      status: 'available',
      freshness: 'current',
      diagnostics: [],
    })
    expect(model.editor.validation).toEqual({ status: 'valid' })
  })
})
