import type { JsonContract } from './contract'

export type JsonDocumentExample = {
  id: string
  name: string
  data: string
  createdAt: number
  updatedAt?: number
}

export type JsonDocumentMetadata = {
  version: number
}

export type JsonDocument = {
  id: string
  data: string
  examples?: Array<JsonDocumentExample>
  size: number
  updatedAt?: number
  metadata?: JsonDocumentMetadata
  contract?: JsonContract
}
