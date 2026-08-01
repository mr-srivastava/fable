import { afterEach, describe, expect, it, vi } from 'vitest'
import { createActor, waitFor } from 'xstate'
import { createDocumentEditorViewModel } from './document-editor-model'
import { documentEditorMachine } from './document-editor-machine'
import type { JsonSchema } from '@shared/document'
import { createDocumentDraft } from '@/lib/document-draft'

const schema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: { id: { type: 'number' } },
  required: ['id'],
}

function createEditor() {
  const actor = createActor(documentEditorMachine, {
    input: {
      initialDraft: createDocumentDraft([
        {
          id: 'one',
          name: 'One',
          data: '{"id":1}',
          createdAt: 1,
        },
      ]),
      inferContract: vi.fn().mockResolvedValue(schema),
      generateTypeScript: vi.fn().mockResolvedValue('type Specimen = unknown'),
      persistDocument: vi.fn().mockResolvedValue({ type: 'updated' }),
    },
  })
  actor.start()
  return actor
}

afterEach(() => vi.useRealTimers())

describe('document editor view model', () => {
  it('exposes discriminated capabilities from workflow state', async () => {
    vi.useFakeTimers()
    const actor = createEditor()

    expect(createDocumentEditorViewModel(actor.getSnapshot())).toMatchObject({
      contract: { status: { type: 'inferring' } },
      submission: { status: 'unavailable', reason: 'inferring' },
      exports: { status: 'unavailable' },
    })

    await vi.advanceTimersByTimeAsync(250)
    const ready = await waitFor(actor, (snapshot) =>
      snapshot.matches({ analysis: 'ready' }),
    )
    expect(createDocumentEditorViewModel(ready)).toMatchObject({
      payload: { status: 'valid', value: '{"id":1}', size: 8 },
      contract: { status: { type: 'ready' }, valueFreshness: 'current' },
      submission: { status: 'available' },
      exports: { status: 'available' },
    })
    actor.stop()
  })

  it('exposes invalid JSON without discarding the previous contract', async () => {
    vi.useFakeTimers()
    const actor = createEditor()
    await vi.advanceTimersByTimeAsync(250)
    await waitFor(actor, (snapshot) => snapshot.matches({ analysis: 'ready' }))

    actor.send({
      type: 'example.jsonChanged',
      exampleId: 'one',
      json: '{',
    })
    const model = createDocumentEditorViewModel(actor.getSnapshot())

    expect(model.payload.status).toBe('invalid')
    expect(model.contract.status).toEqual({ type: 'invalidJson' })
    expect(model.contract.value).toBeDefined()
    expect(model.contract.valueFreshness).toBe('retained')
    expect(model.submission).toEqual({
      status: 'unavailable',
      reason: 'invalidJson',
    })
    actor.stop()
  })
})
