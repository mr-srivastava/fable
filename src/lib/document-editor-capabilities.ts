import type { DocumentDraft } from '@/lib/document-draft'
import type { documentEditorMachine } from '@/lib/document-editor-machine'
import { documentExamplesAreValid } from '@/lib/document-draft'

export type DocumentEditorSnapshot = ReturnType<
  typeof documentEditorMachine.getInitialSnapshot
>

export type DocumentEditorBlockReason =
  'invalidJson' | 'inferring' | 'contractViolations' | 'invalidContract'

export type DocumentEditorCapabilities = {
  canSubmit: boolean
  canExport: boolean
  contractFreshness?: 'current' | 'retained'
  blockReason?: DocumentEditorBlockReason
}

export function draftHasUsableEffectiveSchema(draft: DocumentDraft) {
  return (
    documentExamplesAreValid(draft.examples) &&
    Boolean(draft.jsonSchema) &&
    Boolean(draft.contract) &&
    draft.schemaDiagnostics.length === 0
  )
}

export function deriveDocumentEditorCapabilities(
  snapshot: DocumentEditorSnapshot,
): DocumentEditorCapabilities {
  const { draft } = snapshot.context
  const analysisReady = snapshot.matches({ analysis: 'ready' })
  const contractFreshness = draft.contract
    ? analysisReady || snapshot.matches({ analysis: 'violations' })
      ? 'current'
      : 'retained'
    : undefined

  if (analysisReady && draftHasUsableEffectiveSchema(draft)) {
    return {
      canSubmit: true,
      canExport: true,
      contractFreshness,
    }
  }

  let blockReason: DocumentEditorBlockReason = 'inferring'
  if (snapshot.matches({ analysis: 'invalidJson' })) {
    blockReason = 'invalidJson'
  } else if (snapshot.matches({ analysis: 'violations' })) {
    blockReason = 'contractViolations'
  } else if (snapshot.matches({ analysis: 'failed' })) {
    blockReason = 'invalidContract'
  }

  return {
    canSubmit: false,
    canExport: false,
    contractFreshness,
    blockReason,
  }
}
