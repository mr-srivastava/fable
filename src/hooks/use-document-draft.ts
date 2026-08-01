import { useCallback, useMemo, useState } from 'react'
import type { DocumentDraft } from '@/lib/document-draft'
import type { JsonContract } from '@shared/document'
import {
  addDraftExample,
  getActiveExample,
  getDocumentDraftSnapshot,
  removeDraftExample,
  renameDraftExample,
  selectDraftExample,
  updateDraftContract,
  updateDraftExample,
} from '@/lib/document-draft'
import { createDocumentExample } from '@/lib/document-examples'
import { parseJsonSafely } from '@/lib/json'

export function useDocumentDraft(initialDraft: DocumentDraft) {
  const [draft, setDraft] = useState(initialDraft)

  const activeExample = useMemo(() => getActiveExample(draft), [draft])
  const payloadStatus = useMemo(() => {
    if (!activeExample.data.trim()) return 'waiting' as const
    return parseJsonSafely(activeExample.data).ok
      ? ('valid' as const)
      : ('invalid' as const)
  }, [activeExample.data])
  const initialSnapshot = useMemo(
    () => getDocumentDraftSnapshot(initialDraft),
    [initialDraft],
  )
  const hasUnsavedChanges = getDocumentDraftSnapshot(draft) !== initialSnapshot

  const selectExample = useCallback((id: string) => {
    setDraft((current) => selectDraftExample(current, id))
  }, [])

  const updateExample = useCallback((value: string) => {
    setDraft((current) =>
      updateDraftExample(current, current.activeExampleId, value),
    )
  }, [])

  const renameExample = useCallback((id: string, name: string) => {
    setDraft((current) => renameDraftExample(current, id, name))
  }, [])

  const addExample = useCallback(() => {
    setDraft((current) =>
      addDraftExample(
        current,
        createDocumentExample(current.examples.length + 1),
      ),
    )
  }, [])

  const removeExample = useCallback((id: string) => {
    setDraft((current) => removeDraftExample(current, id))
  }, [])

  const updateContract = useCallback((contract: JsonContract) => {
    setDraft((current) => updateDraftContract(current, contract))
  }, [])

  const reset = useCallback(() => setDraft(initialDraft), [initialDraft])

  return {
    draft,
    activeExample,
    payloadStatus,
    canSubmit: payloadStatus === 'valid' && !draft.contractDisabled,
    hasUnsavedChanges,
    selectExample,
    updateExample,
    renameExample,
    addExample,
    removeExample,
    updateContract,
    reset,
  }
}
