import { releaseProxy, wrap } from 'comlink'
import type { Remote } from 'comlink'
import type { JsonSchema } from '@shared/document'
import type { ContractWorkerApi } from '@/workers/contract/contract-worker.protocol'

export type ContractWorkerRequestOptions = {
  signal?: AbortSignal
}

function abortError() {
  const error = new Error('Worker request was aborted')
  error.name = 'AbortError'
  return error
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(abortError())

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(abortError())
    signal.addEventListener('abort', handleAbort, { once: true })
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', handleAbort)
    })
  })
}

export class ContractWorkerClient {
  private constructor(
    private readonly worker: Worker,
    private readonly api: Remote<ContractWorkerApi>,
  ) {}

  static create() {
    const worker = new Worker(
      new URL('../../workers/contract.worker.ts', import.meta.url),
      { type: 'module' },
    )
    return new ContractWorkerClient(worker, wrap<ContractWorkerApi>(worker))
  }

  infer(samples: Array<string>, options?: ContractWorkerRequestOptions) {
    return withAbortSignal(this.api.infer(samples), options?.signal)
  }

  generateTypeScript(
    jsonSchema: JsonSchema,
    options?: ContractWorkerRequestOptions,
  ) {
    return withAbortSignal(
      this.api.generateTypeScript(jsonSchema),
      options?.signal,
    )
  }

  terminate() {
    this.api[releaseProxy]()
    this.worker.terminate()
  }
}
