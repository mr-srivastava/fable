import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DocumentDraft } from '@/lib/document-draft'
import type { JsonContract } from '@shared/document'
import {
  addDraftExample,
  applyDraftInference,
  failDraftInference,
  getActiveExample,
  getDocumentDraftSnapshot,
  removeDraftExample,
  renameDraftExample,
  selectDraftExample,
  updateDraftContract,
  updateDraftExample,
} from '@/lib/document-draft'
import { createDocumentExample } from '@/lib/document-examples'
import { ContractWorkerClient } from '@/lib/contract/contract-worker-client'
import { parseJsonSafely } from '@/lib/json'

export function useDocumentDraft(initialDraft: DocumentDraft) {
  const [draft, setDraft] = useState(initialDraft)
  const contractWorker = useRef<ContractWorkerClient | null>(null)
  const inferenceInput = JSON.stringify(
    draft.examples.map((example) => example.data),
  )

  useEffect(() => {
    const client = ContractWorkerClient.create()
    contractWorker.current = client

    return () => {
      contractWorker.current = null
      client.terminate()
    }
  }, [])

  useEffect(() => {
    const samples = JSON.parse(inferenceInput) as Array<string>
    if (samples.some((sample) => !parseJsonSafely(sample).ok)) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const client = contractWorker.current
      if (!client) return
      try {
        const jsonSchema = await client.infer(samples, {
          signal: controller.signal,
        })
        setDraft((current) => applyDraftInference(current, jsonSchema))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setDraft((current) =>
          failDraftInference(
            current,
            error instanceof Error
              ? error.message
              : 'Contract inference failed',
          ),
        )
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [inferenceInput])

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

  const generateTypeScript = useCallback(() => {
    if (!draft.jsonSchema)
      return Promise.reject(new Error('Contract is not ready'))
    const client = contractWorker.current
    if (!client)
      return Promise.reject(new Error('Contract worker is not ready'))
    return client.generateTypeScript(draft.jsonSchema)
  }, [draft.jsonSchema])

  return {
    draft,
    activeExample,
    payloadStatus,
    canSubmit:
      payloadStatus === 'valid' &&
      draft.inferenceStatus === 'ready' &&
      draft.schemaDiagnostics.length === 0 &&
      !draft.contractDisabled,
    hasUnsavedChanges,
    selectExample,
    updateExample,
    renameExample,
    addExample,
    removeExample,
    updateContract,
    generateTypeScript,
    reset,
  }
}
