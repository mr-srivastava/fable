import { and, assign, fromPromise, setup, stateIn } from 'xstate'
import type { JsonSchema } from '@shared/document'
import type {
  ContractOverrideChange,
  DocumentDraft,
  DocumentWriteInput,
} from '@/lib/document-draft'
import {
  addDraftExample,
  applyDraftInference,
  documentExamplesAreValid,
  getDocumentDraftSnapshot,
  prepareDocumentWrite,
  removeDraftExample,
  renameDraftExample,
  selectDraftExample,
  updateDraftContractOverride,
  updateDraftExample,
} from '@/lib/document-draft'
import { createDocumentExample } from '@/lib/document-examples'

export type DocumentPersistenceResult =
  { type: 'created'; documentId: string } | { type: 'updated' }

export type DocumentEditorDependencies = {
  inferContract: (
    samples: Array<string>,
    options: { signal: AbortSignal },
  ) => Promise<JsonSchema>
  generateTypeScript: (
    jsonSchema: JsonSchema,
    options: { signal: AbortSignal },
  ) => Promise<string>
  persistDocument: (
    input: DocumentWriteInput,
  ) => Promise<DocumentPersistenceResult>
}

export type DocumentEditorMachineInput = DocumentEditorDependencies & {
  initialDraft: DocumentDraft
}

export type DocumentEditorEvent =
  | { type: 'example.jsonChanged'; exampleId: string; json: string }
  | { type: 'example.selected'; exampleId: string }
  | { type: 'example.renamed'; exampleId: string; name: string }
  | { type: 'example.added' }
  | { type: 'example.removed'; exampleId: string }
  | { type: 'contract.overrideChanged'; change: ContractOverrideChange }
  | { type: 'document.reset' }
  | { type: 'document.submitRequested' }
  | { type: 'export.typescriptRequested' }

export type DocumentEditorContext = {
  draft: DocumentDraft
  initialDraft: DocumentDraft
  initialSnapshot: string
  dependencies: DocumentEditorDependencies
  analysisError?: string
  persistenceResult?: DocumentPersistenceResult
  persistenceError?: string
  exportSource?: string
  exportError?: string
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function canUseEffectiveSchema(draft: DocumentDraft) {
  return (
    documentExamplesAreValid(draft.examples) &&
    Boolean(draft.jsonSchema) &&
    Boolean(draft.contract) &&
    draft.schemaDiagnostics.length === 0
  )
}

const inferenceEvents = {
  'example.jsonChanged': {
    actions: 'updateExample',
    target: '.checking',
  },
  'example.added': {
    actions: 'addExample',
    target: '.checking',
  },
  'example.removed': {
    actions: 'removeExample',
    target: '.checking',
  },
} as const

const persistenceInvalidationEvents = {
  'example.jsonChanged': { target: 'idle', actions: 'clearPersistence' },
  'example.renamed': { target: 'idle', actions: 'clearPersistence' },
  'example.added': { target: 'idle', actions: 'clearPersistence' },
  'example.removed': { target: 'idle', actions: 'clearPersistence' },
  'contract.overrideChanged': { target: 'idle', actions: 'clearPersistence' },
  'document.reset': { target: 'idle', actions: 'clearPersistence' },
} as const

const exportInvalidationEvents = {
  'example.jsonChanged': { target: 'idle', actions: 'clearExport' },
  'example.added': { target: 'idle', actions: 'clearExport' },
  'example.removed': { target: 'idle', actions: 'clearExport' },
  'contract.overrideChanged': { target: 'idle', actions: 'clearExport' },
  'document.reset': { target: 'idle', actions: 'clearExport' },
} as const

export const documentEditorMachine = setup({
  types: {
    context: {} as DocumentEditorContext,
    events: {} as DocumentEditorEvent,
    input: {} as DocumentEditorMachineInput,
  },
  actors: {
    inferContract: fromPromise(
      ({
        input,
        signal,
      }: {
        input: {
          samples: Array<string>
          infer: DocumentEditorDependencies['inferContract']
        }
        signal: AbortSignal
      }) => input.infer(input.samples, { signal }),
    ),
    generateTypeScript: fromPromise(
      ({
        input,
        signal,
      }: {
        input: {
          jsonSchema: JsonSchema
          generate: DocumentEditorDependencies['generateTypeScript']
        }
        signal: AbortSignal
      }) => input.generate(input.jsonSchema, { signal }),
    ),
    persistDocument: fromPromise(
      ({
        input,
      }: {
        input: {
          draft: DocumentDraft
          persist: DocumentEditorDependencies['persistDocument']
        }
      }) => {
        const snapshot = getDocumentDraftSnapshot(input.draft)
        return input
          .persist(prepareDocumentWrite(input.draft))
          .then((result) => ({
            draft: input.draft,
            result,
            snapshot,
          }))
      },
    ),
  },
  guards: {
    examplesAreInvalid: ({ context }) =>
      !documentExamplesAreValid(context.draft.examples),
    inferenceFailed: ({ context }) => Boolean(context.analysisError),
    hasSchemaViolations: ({ context }) =>
      context.draft.schemaDiagnostics.length > 0,
    canSubmit: and([
      stateIn({ analysis: 'ready' }),
      ({ context }) => canUseEffectiveSchema(context.draft),
    ]),
    canExport: and([
      stateIn({ analysis: 'ready' }),
      ({ context }) => canUseEffectiveSchema(context.draft),
    ]),
  },
  actions: {
    updateExample: assign(({ context, event }) => {
      if (event.type !== 'example.jsonChanged') return {}
      return {
        draft: updateDraftExample(context.draft, event.exampleId, event.json),
        analysisError: undefined,
      }
    }),
    selectExample: assign(({ context, event }) => {
      if (event.type !== 'example.selected') return {}
      return {
        draft: selectDraftExample(context.draft, event.exampleId),
      }
    }),
    renameExample: assign(({ context, event }) => {
      if (event.type !== 'example.renamed') return {}
      return {
        draft: renameDraftExample(context.draft, event.exampleId, event.name),
      }
    }),
    addExample: assign(({ context }) => ({
      draft: addDraftExample(
        context.draft,
        createDocumentExample(context.draft.examples.length + 1),
      ),
      analysisError: undefined,
    })),
    removeExample: assign(({ context, event }) => {
      if (event.type !== 'example.removed') return {}
      return {
        draft: removeDraftExample(context.draft, event.exampleId),
        analysisError: undefined,
      }
    }),
    updateOverride: assign(({ context, event }) => {
      if (event.type !== 'contract.overrideChanged') return {}
      try {
        return {
          draft: updateDraftContractOverride(context.draft, event.change),
          analysisError: undefined,
        }
      } catch (error) {
        return { analysisError: errorMessage(error, 'Invalid contract') }
      }
    }),
    resetDraft: assign(({ context }) => ({
      draft: context.initialDraft,
      persistenceResult: undefined,
      persistenceError: undefined,
      exportSource: undefined,
      exportError: undefined,
      analysisError: undefined,
    })),
    clearPersistence: assign({
      persistenceResult: undefined,
      persistenceError: undefined,
    }),
    clearExport: assign({
      exportSource: undefined,
      exportError: undefined,
    }),
    cancelExport: assign({
      exportSource: undefined,
      exportError: 'TypeScript export was cancelled because the draft changed',
    }),
  },
}).createMachine({
  id: 'documentEditor',
  type: 'parallel',
  context: ({ input }) => ({
    draft: input.initialDraft,
    initialDraft: input.initialDraft,
    initialSnapshot: getDocumentDraftSnapshot(input.initialDraft),
    dependencies: {
      inferContract: input.inferContract,
      generateTypeScript: input.generateTypeScript,
      persistDocument: input.persistDocument,
    },
  }),
  on: {
    'example.selected': { actions: 'selectExample' },
  },
  states: {
    analysis: {
      initial: 'checking',
      on: {
        ...inferenceEvents,
        'example.renamed': { actions: 'renameExample' },
        'contract.overrideChanged': {
          actions: 'updateOverride',
          target: '.contractChecking',
        },
        'document.reset': {
          actions: 'resetDraft',
          target: '.checking',
        },
      },
      states: {
        checking: {
          always: [
            { guard: 'examplesAreInvalid', target: 'invalidJson' },
            { target: 'debouncing' },
          ],
        },
        invalidJson: {},
        debouncing: {
          after: { 250: 'inferring' },
        },
        inferring: {
          invoke: {
            src: 'inferContract',
            input: ({ context }) => ({
              samples: context.draft.examples.map((example) => example.data),
              infer: context.dependencies.inferContract,
            }),
            onDone: {
              actions: assign(({ context, event }) => {
                try {
                  return {
                    draft: applyDraftInference(context.draft, event.output),
                    analysisError: undefined,
                  }
                } catch (error) {
                  return {
                    analysisError: errorMessage(error, 'Invalid contract'),
                  }
                }
              }),
              target: 'contractChecking',
            },
            onError: {
              actions: assign(({ event }) => ({
                analysisError: errorMessage(
                  event.error,
                  'Contract inference failed',
                ),
              })),
              target: 'failed',
            },
          },
        },
        contractChecking: {
          always: [
            { guard: 'inferenceFailed', target: 'failed' },
            { guard: 'hasSchemaViolations', target: 'violations' },
            { target: 'ready' },
          ],
        },
        ready: {},
        violations: {},
        failed: {},
      },
    },
    persistence: {
      initial: 'idle',
      on: {
        'example.jsonChanged': { actions: 'clearPersistence' },
        'example.renamed': { actions: 'clearPersistence' },
        'example.added': { actions: 'clearPersistence' },
        'example.removed': { actions: 'clearPersistence' },
        'contract.overrideChanged': { actions: 'clearPersistence' },
        'document.reset': { actions: 'clearPersistence' },
      },
      states: {
        idle: {
          on: {
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
        saving: {
          invoke: {
            src: 'persistDocument',
            input: ({ context }) => ({
              draft: context.draft,
              persist: context.dependencies.persistDocument,
            }),
            onDone: {
              actions: assign(({ event }) => ({
                persistenceResult: event.output.result,
                persistenceError: undefined,
                initialDraft: event.output.draft,
                initialSnapshot: event.output.snapshot,
              })),
              target: 'saved',
            },
            onError: {
              actions: assign(({ event }) => ({
                persistenceResult: undefined,
                persistenceError: errorMessage(
                  event.error,
                  'Failed to save document',
                ),
              })),
              target: 'failed',
            },
          },
        },
        saved: {
          on: {
            ...persistenceInvalidationEvents,
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
        failed: {
          on: {
            ...persistenceInvalidationEvents,
            'document.submitRequested': {
              guard: 'canSubmit',
              target: 'saving',
            },
          },
        },
      },
    },
    export: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'export.typescriptRequested': {
              guard: 'canExport',
              target: 'generating',
            },
          },
        },
        generating: {
          on: {
            'example.jsonChanged': {
              target: 'failed',
              actions: 'cancelExport',
            },
            'example.added': {
              target: 'failed',
              actions: 'cancelExport',
            },
            'example.removed': {
              target: 'failed',
              actions: 'cancelExport',
            },
            'contract.overrideChanged': {
              target: 'failed',
              actions: 'cancelExport',
            },
            'document.reset': {
              target: 'failed',
              actions: 'cancelExport',
            },
          },
          invoke: {
            src: 'generateTypeScript',
            input: ({ context }) => ({
              jsonSchema: context.draft.jsonSchema!,
              generate: context.dependencies.generateTypeScript,
            }),
            onDone: {
              actions: assign(({ event }) => ({
                exportSource: event.output,
                exportError: undefined,
              })),
              target: 'ready',
            },
            onError: {
              actions: assign(({ event }) => ({
                exportSource: undefined,
                exportError: errorMessage(event.error, 'Export failed'),
              })),
              target: 'failed',
            },
          },
        },
        ready: {
          on: {
            ...exportInvalidationEvents,
            'export.typescriptRequested': 'generating',
          },
        },
        failed: {
          on: {
            ...exportInvalidationEvents,
            'export.typescriptRequested': {
              guard: 'canExport',
              target: 'generating',
            },
          },
        },
      },
    },
  },
})
