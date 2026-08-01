import {
  generateTypeScript,
  inferJsonSchema,
} from '../../lib/contract/quicktype'
import type { ContractWorkerApi } from './contract-worker.protocol'

export const contractWorkerApi: ContractWorkerApi = {
  infer: inferJsonSchema,
  generateTypeScript,
}
