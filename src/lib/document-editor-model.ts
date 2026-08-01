import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
import type { JsonContract, JsonDocumentExample } from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import type { ContractOverrideChange } from '@/lib/document-draft'
import type {
  DocumentPersistenceResult,
  documentEditorMachine,
} from '@/lib/document-editor-machine'
import {
  getActiveExample,
  getDocumentDraftSnapshot,
} from '@/lib/document-draft'
import { parseJsonSafely } from '@/lib/json'

export type PayloadViewState =
  | { status: 'waiting'; value: string }
  | { status: 'valid'; value: string }
  | { status: 'invalid'; value: string; message: string }

export type ContractViewStatus =
  | { type: 'invalidJson' }
  | { type: 'inferring' }
  | { type: 'invalidContract'; message: string }
  | { type: 'violations'; count: number }
  | { type: 'ready' }

export type ContractEditorViewModel = {
  value?: JsonContract
  status: ContractViewStatus
  diagnostics?: ContractDiagnostics
  schemaDiagnostics: Array<SchemaValidationDiagnostic>
}

export type SubmissionViewState =
  | { status: 'available' }
  | {
      status: 'unavailable'
      reason:
        | 'invalidJson'
        | 'inferring'
        | 'invalidContract'
        | 'contractViolations'
    }
  | { status: 'saving' }
  | { status: 'failed'; message: string }

export type ExportViewState =
  | { status: 'unavailable' }
  | { status: 'available'; jsonSchema: string }
  | { status: 'generating'; jsonSchema: string }
  | { status: 'failed'; jsonSchema: string; message: string }

export type DocumentEditorViewModel = {
  payload: PayloadViewState
  examples: {
    items: Array<JsonDocumentExample>
    activeId: string
    validationCounts: Record<string, number>
    canAdd: boolean
  }
  contract: ContractEditorViewModel
  submission: SubmissionViewState
  exports: ExportViewState
  hasUnsavedChanges: boolean
}

export type DocumentEditorCommands = {
  updateExample: (exampleId: string, json: string) => void
  selectExample: (exampleId: string) => void
  renameExample: (exampleId: string, name: string) => void
  addExample: () => void
  removeExample: (exampleId: string) => void
  changeContractOverride: (change: ContractOverrideChange) => void
  reset: () => void
  submit: () => Promise<DocumentPersistenceResult>
  generateTypeScript: () => Promise<string>
}

type DocumentEditorSnapshot = ReturnType<
  typeof documentEditorMachine.getInitialSnapshot
>

export function documentEditorAnalysisIsUsable(
  snapshot: DocumentEditorSnapshot,
) {
  return (
    snapshot.matches({ analysis: 'ready' }) &&
    snapshot.context.draft.schemaDiagnostics.length === 0
  )
}

function getContractStatus(
  snapshot: DocumentEditorSnapshot,
): ContractEditorViewModel['status'] {
  if (snapshot.matches({ analysis: 'invalidJson' })) {
    return { type: 'invalidJson' }
  }
  if (
    snapshot.matches({ analysis: 'checking' }) ||
    snapshot.matches({ analysis: 'debouncing' }) ||
    snapshot.matches({ analysis: 'inferring' }) ||
    snapshot.matches({ analysis: 'contractChecking' })
  ) {
    return { type: 'inferring' }
  }
  if (snapshot.matches({ analysis: 'violations' })) {
    return {
      type: 'violations',
      count: snapshot.context.draft.schemaDiagnostics.length,
    }
  }
  if (snapshot.matches({ analysis: 'failed' })) {
    return {
      type: 'invalidContract',
      message:
        snapshot.context.analysisError ??
        'The contract could not be generated.',
    }
  }
  return { type: 'ready' }
}

function getSubmissionState(
  snapshot: DocumentEditorSnapshot,
): SubmissionViewState {
  if (snapshot.matches({ persistence: 'saving' })) return { status: 'saving' }
  if (snapshot.matches({ persistence: 'failed' })) {
    return {
      status: 'failed',
      message: snapshot.context.persistenceError ?? 'Failed to save document',
    }
  }
  if (snapshot.matches({ analysis: 'invalidJson' })) {
    return { status: 'unavailable', reason: 'invalidJson' }
  }
  if (snapshot.matches({ analysis: 'violations' })) {
    return { status: 'unavailable', reason: 'contractViolations' }
  }
  if (snapshot.matches({ analysis: 'failed' })) {
    return { status: 'unavailable', reason: 'invalidContract' }
  }
  if (!documentEditorAnalysisIsUsable(snapshot)) {
    return { status: 'unavailable', reason: 'inferring' }
  }
  return { status: 'available' }
}

function getExportState(snapshot: DocumentEditorSnapshot): ExportViewState {
  const schema = snapshot.context.draft.jsonSchema
  if (!schema || !documentEditorAnalysisIsUsable(snapshot)) {
    return { status: 'unavailable' }
  }
  const jsonSchema = `${JSON.stringify(schema, null, 2)}\n`
  if (snapshot.matches({ export: 'generating' })) {
    return { status: 'generating', jsonSchema }
  }
  if (snapshot.matches({ export: 'failed' })) {
    return {
      status: 'failed',
      jsonSchema,
      message: snapshot.context.exportError ?? 'Export failed',
    }
  }
  return { status: 'available', jsonSchema }
}

export function createDocumentEditorViewModel(
  snapshot: DocumentEditorSnapshot,
): DocumentEditorViewModel {
  const { draft } = snapshot.context
  const activeExample = getActiveExample(draft)
  const parsed = parseJsonSafely(activeExample.data)
  const payload: PayloadViewState = !activeExample.data.trim()
    ? { status: 'waiting', value: activeExample.data }
    : parsed.ok
      ? { status: 'valid', value: activeExample.data }
      : {
          status: 'invalid',
          value: activeExample.data,
          message: parsed.error,
        }

  return {
    payload,
    examples: {
      items: draft.examples,
      activeId: draft.activeExampleId,
      validationCounts: Object.fromEntries(
        draft.examples.map((example) => [
          example.id,
          draft.schemaDiagnostics.filter(
            (diagnostic) => diagnostic.exampleId === example.id,
          ).length,
        ]),
      ),
      canAdd: draft.examples.length < MAX_EXAMPLES_PER_DOCUMENT,
    },
    contract: {
      value: draft.contract,
      status: getContractStatus(snapshot),
      diagnostics: draft.diagnostics,
      schemaDiagnostics: draft.schemaDiagnostics,
    },
    submission: getSubmissionState(snapshot),
    exports: getExportState(snapshot),
    hasUnsavedChanges:
      getDocumentDraftSnapshot(draft) !== snapshot.context.initialSnapshot,
  }
}
