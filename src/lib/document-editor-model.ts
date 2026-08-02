import { MAX_VARIANTS_PER_DOCUMENT } from '@shared/document-limits'
import type {
  JsonContract,
  JsonContractField,
  JsonDocumentVariant,
} from '@shared/document'
import type { SchemaValidationDiagnostic } from '@shared/json-schema'
import type { ContractDiagnostics } from '@/lib/contract/compatibilityDiagnostics'
import type { ContractOverrideChange } from '@/lib/document-draft'
import type { DocumentPersistenceResult } from '@/lib/document-editor-machine'
import type { DocumentEditorSnapshot } from '@/lib/document-editor-capabilities'
import { deriveDocumentEditorCapabilities } from '@/lib/document-editor-capabilities'
import {
  getActiveVariant,
  getDocumentDraftSnapshot,
} from '@/lib/document-draft'
import { parseJsonSafely } from '@/lib/json'

export type PayloadViewState =
  | { status: 'waiting'; value: string; size: 0 }
  | { status: 'valid'; value: string; size: number }
  | {
      status: 'invalid'
      reason: 'syntax' | 'size'
      value: string
      message: string
      size?: number
    }

export type ContractViewStatus =
  | { type: 'invalidJson' }
  | { type: 'inferring' }
  | { type: 'invalidContract'; message: string }
  | { type: 'violations'; count: number }
  | { type: 'ready' }

export type ContractEditorViewModel = {
  value?: JsonContract
  valueFreshness?: 'current' | 'retained'
  status: ContractViewStatus
  diagnostics?: ContractDiagnostics
  schemaDiagnostics: Array<SchemaValidationDiagnostic>
}

export type SubmissionViewState =
  | { status: 'available' }
  | {
      status: 'unavailable'
      reason:
        'invalidJson' | 'inferring' | 'invalidContract' | 'contractViolations'
    }
  | { status: 'saving' }
  | { status: 'failed'; message: string }

export type ExportViewState =
  | { status: 'unavailable' }
  | { status: 'available'; jsonSchema: string }
  | { status: 'generating'; jsonSchema: string }
  | { status: 'failed'; jsonSchema: string; message: string }

export type DocumentEditorAssistance =
  | { status: 'unavailable' }
  | ({
      status: 'available'
      fields: ReadonlyArray<JsonContractField>
    } & (
      | {
          freshness: 'current'
          diagnostics: ReadonlyArray<SchemaValidationDiagnostic>
        }
      | { freshness: 'retained' }
    ))

export type DocumentEditorValidation =
  | { status: 'valid' }
  | { status: 'syntaxError' }
  | { status: 'externalError'; message: string }

export type DocumentEditorViewModel = {
  payload: PayloadViewState
  variants: {
    items: Array<JsonDocumentVariant>
    activeId: string
    validationCounts: Record<string, number>
    canAdd: boolean
  }
  contract: ContractEditorViewModel
  editor: {
    assistance: DocumentEditorAssistance
    validation: DocumentEditorValidation
  }
  submission: SubmissionViewState
  exports: ExportViewState
  hasUnsavedChanges: boolean
}

export type DocumentEditorCommands = {
  updateVariant: (variantId: string, json: string) => void
  selectVariant: (variantId: string) => void
  renameVariant: (variantId: string, name: string) => void
  addVariant: () => void
  removeVariant: (variantId: string) => void
  changeContractOverride: (change: ContractOverrideChange) => void
  reset: () => void
  submit: () => Promise<DocumentPersistenceResult>
  generateTypeScript: () => Promise<string>
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
  const capabilities = deriveDocumentEditorCapabilities(snapshot)
  if (!capabilities.canSubmit) {
    return {
      status: 'unavailable',
      reason: capabilities.blockReason ?? 'inferring',
    }
  }
  return { status: 'available' }
}

function getExportState(snapshot: DocumentEditorSnapshot): ExportViewState {
  const capabilities = deriveDocumentEditorCapabilities(snapshot)
  const schema = snapshot.context.draft.jsonSchema
  if (!capabilities.canExport || !schema) {
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

function getEditorAssistance(
  contract: ContractEditorViewModel,
  activeVariantId: string,
): DocumentEditorAssistance {
  if (!contract.value) return { status: 'unavailable' }
  if (contract.valueFreshness === 'current') {
    return {
      status: 'available',
      freshness: 'current',
      fields: contract.value.fields,
      diagnostics: contract.schemaDiagnostics.filter(
        (diagnostic) => diagnostic.variantId === activeVariantId,
      ),
    }
  }
  return {
    status: 'available',
    freshness: 'retained',
    fields: contract.value.fields,
  }
}

function getEditorValidation(
  payload: PayloadViewState,
): DocumentEditorValidation {
  if (payload.status !== 'invalid') return { status: 'valid' }
  if (payload.reason === 'syntax') return { status: 'syntaxError' }
  return { status: 'externalError', message: payload.message }
}

export function createDocumentEditorViewModel(
  snapshot: DocumentEditorSnapshot,
): DocumentEditorViewModel {
  const { draft } = snapshot.context
  const activeVariant = getActiveVariant(draft)
  const parsed = parseJsonSafely(activeVariant.data)
  const capabilities = deriveDocumentEditorCapabilities(snapshot)
  const payload: PayloadViewState = !activeVariant.data.trim()
    ? { status: 'waiting', value: activeVariant.data, size: 0 }
    : parsed.ok
      ? { status: 'valid', value: activeVariant.data, size: parsed.size }
      : {
          status: 'invalid',
          reason: parsed.reason,
          value: activeVariant.data,
          message: parsed.error,
          size: parsed.size,
        }
  const contract: ContractEditorViewModel = {
    value: draft.contract,
    valueFreshness: capabilities.contractFreshness,
    status: getContractStatus(snapshot),
    diagnostics: draft.diagnostics,
    schemaDiagnostics: draft.schemaDiagnostics,
  }

  return {
    payload,
    variants: {
      items: draft.variants,
      activeId: draft.activeVariantId,
      validationCounts: Object.fromEntries(
        draft.variants.map((variant) => [
          variant.id,
          draft.schemaDiagnostics.filter(
            (diagnostic) => diagnostic.variantId === variant.id,
          ).length,
        ]),
      ),
      canAdd: draft.variants.length < MAX_VARIANTS_PER_DOCUMENT,
    },
    contract,
    editor: {
      assistance: getEditorAssistance(contract, draft.activeVariantId),
      validation: getEditorValidation(payload),
    },
    submission: getSubmissionState(snapshot),
    exports: getExportState(snapshot),
    hasUnsavedChanges:
      getDocumentDraftSnapshot(draft) !== snapshot.context.initialSnapshot,
  }
}
