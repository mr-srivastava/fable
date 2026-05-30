import type { JsonContract } from './contract'

export type JsonDocumentMetadata = {
  version: number
}

export type JsonDocument = {
  id: string
  data: string
  size: number
  updatedAt?: number
  metadata?: JsonDocumentMetadata
  contract?: JsonContract
}
