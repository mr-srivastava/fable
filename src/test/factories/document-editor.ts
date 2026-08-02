import { createActor, waitFor } from 'xstate'
import { vi } from 'vitest'
import type { Actor } from 'xstate'
import type { JsonDocumentExample, JsonSchema } from '@shared/document'
import type { DocumentEditorSnapshot } from '@/lib/document-editor-capabilities'
import type {
  DocumentEditorCommands,
  DocumentEditorViewModel,
} from '@/lib/document-editor-model'
import type { DocumentDraft } from '@/lib/document-draft'
import type {
  DocumentEditorDependencies,
  DocumentEditorMachineInput,
} from '@/lib/document-editor-machine'
import {
  applyDraftInference,
  createDocumentDraft,
  getDocumentDraftSnapshot,
  updateDraftContractOverride,
  updateDraftExample,
} from '@/lib/document-draft'
import { documentEditorMachine } from '@/lib/document-editor-machine'
import { buildDocumentExample } from '@/test/factories/document'
import { testIdNumberSchema, testStatusSchema } from '@/test/factories/schema'

export { testIdNumberSchema, testStatusSchema }

type EditorModelOverrides = Partial<
  Omit<DocumentEditorViewModel, 'contract' | 'examples' | 'editor'>
> & {
  contract?: Partial<DocumentEditorViewModel['contract']>
  examples?: Partial<DocumentEditorViewModel['examples']>
  editor?: Partial<DocumentEditorViewModel['editor']>
}

type AnalysisState =
  | 'checking'
  | 'invalidJson'
  | 'debouncing'
  | 'inferring'
  | 'contractChecking'
  | 'ready'
  | 'violations'
  | 'failed'

export function buildDocumentEditorModel(
  overrides: EditorModelOverrides = {},
): DocumentEditorViewModel {
  const { contract, examples, editor, payload, ...modelOverrides } = overrides
  const resolvedPayload = payload ?? {
    status: 'valid' as const,
    value: '{}',
    size: 2,
  }
  const defaultValidation =
    resolvedPayload.status !== 'invalid'
      ? ({ status: 'valid' } as const)
      : resolvedPayload.reason === 'syntax'
        ? ({ status: 'syntaxError' } as const)
        : ({
            status: 'externalError',
            message: resolvedPayload.message,
          } as const)

  return {
    payload: resolvedPayload,
    examples: {
      items: [buildDocumentExample()],
      activeId: 'one',
      validationCounts: {},
      canAdd: true,
      ...examples,
    },
    contract: {
      status: { type: 'ready' },
      schemaDiagnostics: [],
      ...contract,
    },
    editor: {
      assistance: { status: 'unavailable' },
      validation: defaultValidation,
      ...editor,
    },
    submission: { status: 'available' },
    exports: { status: 'unavailable' },
    hasUnsavedChanges: false,
    ...modelOverrides,
  }
}

export function buildDocumentEditorCommands(
  overrides: Partial<DocumentEditorCommands> = {},
): DocumentEditorCommands {
  return {
    updateExample: vi.fn(),
    selectExample: vi.fn(),
    renameExample: vi.fn(),
    addExample: vi.fn(),
    removeExample: vi.fn(),
    changeContractOverride: vi.fn(),
    reset: vi.fn(),
    submit: vi.fn().mockResolvedValue({ type: 'updated' }),
    generateTypeScript: vi.fn().mockResolvedValue(''),
    ...overrides,
  }
}

export function buildMachineExample(
  data = '{"status":"ok"}',
  overrides: Partial<JsonDocumentExample> = {},
): JsonDocumentExample {
  return {
    id: 'example-1',
    name: 'Example 1',
    data,
    createdAt: 1,
    ...overrides,
  }
}

export function buildDocumentEditorDependencies(
  overrides: Partial<DocumentEditorDependencies> = {},
  schema: JsonSchema = testStatusSchema,
): DocumentEditorDependencies {
  return {
    inferContract: vi.fn().mockResolvedValue(schema),
    generateTypeScript: vi
      .fn()
      .mockResolvedValue('export interface Specimen {}'),
    persistDocument: vi.fn().mockResolvedValue({ type: 'updated' }),
    ...overrides,
  }
}

export function createDocumentEditorActor(
  overrides: Partial<DocumentEditorMachineInput> = {},
  schema: JsonSchema = testStatusSchema,
) {
  const input: DocumentEditorMachineInput = {
    initialDraft: createDocumentDraft([buildMachineExample()]),
    ...buildDocumentEditorDependencies({}, schema),
    ...overrides,
  }
  const actor = createActor(documentEditorMachine, { input })
  actor.start()
  return { actor, input }
}

export async function advanceDocumentEditorToReady(
  actor: Actor<typeof documentEditorMachine>,
) {
  await vi.advanceTimersByTimeAsync(250)
  return waitFor(actor, (snapshot) => snapshot.matches({ analysis: 'ready' }))
}

export function buildReadyDocumentDraft(
  data = '{"id":1}',
  schema: JsonSchema = testIdNumberSchema,
): DocumentDraft {
  return applyDraftInference(
    createDocumentDraft([
      buildDocumentExample({ id: 'one', name: 'One', data }),
    ]),
    schema,
  )
}

export function buildDocumentEditorSnapshot(options: {
  analysis: AnalysisState
  draft?: DocumentDraft
  analysisError?: string
  persistence?: 'idle' | 'saving' | 'saved' | 'failed'
  exportState?: 'idle' | 'generating' | 'ready' | 'failed'
}): DocumentEditorSnapshot {
  const draft = options.draft ?? buildReadyDocumentDraft()
  const dependencies = buildDocumentEditorDependencies({}, testIdNumberSchema)

  return documentEditorMachine.resolveState({
    value: {
      analysis: options.analysis,
      persistence: options.persistence ?? 'idle',
      export: options.exportState ?? 'idle',
    },
    context: {
      draft,
      initialDraft: draft,
      initialSnapshot: getDocumentDraftSnapshot(draft),
      dependencies,
      analysisError: options.analysisError,
    },
  })
}

export function buildInvalidJsonEditorSnapshot(): DocumentEditorSnapshot {
  const readyDraft = buildReadyDocumentDraft()
  const invalidDraft = updateDraftExample(readyDraft, 'one', '{')
  return buildDocumentEditorSnapshot({
    analysis: 'invalidJson',
    draft: invalidDraft,
  })
}

export function buildViolationsEditorSnapshot(): DocumentEditorSnapshot {
  const readyDraft = buildReadyDocumentDraft()
  const pointer = readyDraft.contract?.fields.find(
    (field) => field.path === 'id',
  )?.schemaPointer
  if (!pointer) {
    throw new Error('Expected id field in ready draft fixture')
  }
  const violatingDraft = updateDraftContractOverride(readyDraft, {
    type: 'enumChanged',
    pointer,
    enumValues: ['missing'],
  })
  return buildDocumentEditorSnapshot({
    analysis: 'violations',
    draft: violatingDraft,
  })
}
