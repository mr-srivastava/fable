import { useActorRef, useSelector } from '@xstate/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { waitFor } from 'xstate'
import type { DocumentDraft, DocumentWriteInput } from '@/lib/document-draft'
import type {
  DocumentEditorMachineInput,
  DocumentPersistenceResult,
} from '@/lib/document-editor-machine'
import type { DocumentEditorCommands } from '@/lib/document-editor-model'
import { documentEditorMachine } from '@/lib/document-editor-machine'
import { createDocumentEditorViewModel } from '@/lib/document-editor-model'
import { deriveDocumentEditorCapabilities } from '@/lib/document-editor-capabilities'
import { ContractWorkerClient } from '@/lib/contract/contract-worker-client'

type UseDocumentEditorInput = {
  initialDraft: DocumentDraft
  persistDocument: (
    input: DocumentWriteInput,
  ) => Promise<DocumentPersistenceResult>
}

export function useDocumentEditor({
  initialDraft,
  persistDocument,
}: UseDocumentEditorInput) {
  const persistRef = useRef(persistDocument)
  persistRef.current = persistDocument
  const workerRef = useRef<ContractWorkerClient | null>(null)
  const getWorker = useCallback(() => {
    if (typeof Worker === 'undefined') {
      throw new Error('Contract worker is unavailable')
    }
    workerRef.current ??= ContractWorkerClient.create()
    return workerRef.current
  }, [])

  useEffect(
    () => () => {
      workerRef.current?.terminate()
      workerRef.current = null
    },
    [],
  )

  const input = useMemo<DocumentEditorMachineInput>(
    () => ({
      initialDraft,
      inferContract: (samples, options) => getWorker().infer(samples, options),
      generateTypeScript: (jsonSchema, options) =>
        getWorker().generateTypeScript(jsonSchema, options),
      persistDocument: (document) => persistRef.current(document),
    }),
    [getWorker, initialDraft],
  )
  const actorRef = useActorRef(documentEditorMachine, { input })
  const snapshot = useSelector(actorRef, (current) => current)
  const model = useMemo(
    () => createDocumentEditorViewModel(snapshot),
    [snapshot],
  )

  const submit = useCallback(async () => {
    const current = actorRef.getSnapshot()
    if (!deriveDocumentEditorCapabilities(current).canSubmit) {
      throw new Error('Document is not ready to save')
    }
    actorRef.send({ type: 'document.submitRequested' })
    const completed = await waitFor(
      actorRef,
      (next) =>
        next.matches({ persistence: 'saved' }) ||
        next.matches({ persistence: 'failed' }),
    )
    if (completed.matches({ persistence: 'failed' })) {
      throw new Error(
        completed.context.persistenceError ?? 'Failed to save document',
      )
    }
    return completed.context.persistenceResult!
  }, [actorRef])

  const generateTypeScript = useCallback(async () => {
    const current = actorRef.getSnapshot()
    if (!deriveDocumentEditorCapabilities(current).canExport) {
      throw new Error('Contract is not ready')
    }
    actorRef.send({ type: 'export.typescriptRequested' })
    const completed = await waitFor(
      actorRef,
      (next) =>
        next.matches({ export: 'ready' }) || next.matches({ export: 'failed' }),
    )
    if (completed.matches({ export: 'failed' })) {
      throw new Error(completed.context.exportError ?? 'Export failed')
    }
    return completed.context.exportSource!
  }, [actorRef])

  const commands = useMemo<DocumentEditorCommands>(
    () => ({
      updateVariant: (variantId, json) =>
        actorRef.send({ type: 'variant.jsonChanged', variantId, json }),
      selectVariant: (variantId) =>
        actorRef.send({ type: 'variant.selected', variantId }),
      renameVariant: (variantId, name) =>
        actorRef.send({ type: 'variant.renamed', variantId, name }),
      addVariant: () => actorRef.send({ type: 'variant.added' }),
      removeVariant: (variantId) =>
        actorRef.send({ type: 'variant.removed', variantId }),
      changeContractOverride: (change) =>
        actorRef.send({ type: 'contract.overrideChanged', change }),
      reset: () => actorRef.send({ type: 'document.reset' }),
      submit,
      generateTypeScript,
    }),
    [actorRef, generateTypeScript, submit],
  )

  return { model, commands }
}
