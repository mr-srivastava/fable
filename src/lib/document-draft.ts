import { MAX_EXAMPLES_PER_DOCUMENT } from '@shared/document-limits'
import type { ContractDiagnostics } from '@/lib/contract/inferContract'
import type { JsonContract, JsonDocumentExample } from '@shared/document'
import { analyzeExamplesForContract } from '@/lib/contract/inferContract'
import { mergeContractEdits } from '@/lib/contract/mergeContractEdits'
import { parseJsonSafely } from '@/lib/json'

export type DocumentDraft = {
  examples: Array<JsonDocumentExample>
  activeExampleId: string
  contract?: JsonContract
  diagnostics?: ContractDiagnostics
  contractDisabled: boolean
}

export type DocumentWriteInput = {
  examples: Array<JsonDocumentExample>
  contract?: JsonContract
}

function analyzeExamples(
  examples: Array<JsonDocumentExample>,
  editedContract?: JsonContract,
): Pick<DocumentDraft, 'contract' | 'diagnostics' | 'contractDisabled'> {
  if (examples.some((example) => !parseJsonSafely(example.data).ok)) {
    return {
      contract: editedContract,
      diagnostics: undefined,
      contractDisabled: true,
    }
  }

  const analysis = analyzeExamplesForContract(examples)
  return {
    contract: mergeContractEdits(analysis.contract, editedContract),
    diagnostics: analysis.diagnostics,
    contractDisabled: false,
  }
}

export function createDocumentDraft(
  examples: Array<JsonDocumentExample>,
  persistedContract?: JsonContract,
): DocumentDraft {
  if (examples.length === 0) {
    throw new Error('At least one example is required')
  }

  return {
    examples,
    activeExampleId: examples[0].id,
    ...analyzeExamples(examples, persistedContract),
  }
}

export function getActiveExample(draft: DocumentDraft): JsonDocumentExample {
  return (
    draft.examples.find((example) => example.id === draft.activeExampleId) ??
    draft.examples[0]
  )
}

export function selectDraftExample(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  if (!draft.examples.some((example) => example.id === id)) return draft
  return { ...draft, activeExampleId: id }
}

export function updateDraftExample(
  draft: DocumentDraft,
  id: string,
  data: string,
  now = Date.now(),
): DocumentDraft {
  const examples = draft.examples.map((example) =>
    example.id === id ? { ...example, data, updatedAt: now } : example,
  )

  return {
    ...draft,
    examples,
    ...analyzeExamples(examples, draft.contract),
  }
}

export function renameDraftExample(
  draft: DocumentDraft,
  id: string,
  name: string,
  now = Date.now(),
): DocumentDraft {
  return {
    ...draft,
    examples: draft.examples.map((example) =>
      example.id === id ? { ...example, name, updatedAt: now } : example,
    ),
  }
}

export function addDraftExample(
  draft: DocumentDraft,
  example: JsonDocumentExample,
): DocumentDraft {
  if (draft.examples.length >= MAX_EXAMPLES_PER_DOCUMENT) return draft

  const examples = [...draft.examples, example]
  return {
    ...draft,
    examples,
    activeExampleId: example.id,
    ...analyzeExamples(examples, draft.contract),
  }
}

export function removeDraftExample(
  draft: DocumentDraft,
  id: string,
): DocumentDraft {
  if (draft.examples.length === 1) return draft

  const examples = draft.examples.filter((example) => example.id !== id)
  if (examples.length === draft.examples.length) return draft

  return {
    ...draft,
    examples,
    activeExampleId:
      draft.activeExampleId === id ? examples[0].id : draft.activeExampleId,
    ...analyzeExamples(examples, draft.contract),
  }
}

export function updateDraftContract(
  draft: DocumentDraft,
  contract: JsonContract,
): DocumentDraft {
  return { ...draft, contract }
}

export function getDocumentDraftSnapshot(draft: DocumentDraft): string {
  return JSON.stringify({
    examples: draft.examples,
    contract: draft.contract ?? null,
  })
}

export function prepareDocumentWrite(draft: DocumentDraft): DocumentWriteInput {
  if (draft.examples.some((example) => !parseJsonSafely(example.data).ok)) {
    throw new Error('All examples must contain valid JSON')
  }

  return {
    examples: draft.examples,
    contract: draft.contract,
  }
}
