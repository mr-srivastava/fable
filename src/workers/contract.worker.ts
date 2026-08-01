import { expose } from 'comlink'
import { contractWorkerApi } from './contract/contract-worker.handlers'

expose(contractWorkerApi)
