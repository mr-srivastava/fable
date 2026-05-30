import type { Id } from '../../convex/_generated/dataModel'

const DOCUMENT_ID_PATTERN = /^[a-z0-9_]+$/i

export function parseDocumentId(raw: string): Id<'documents'> | null {
  if (raw.length < 10 || raw.length > 64 || !DOCUMENT_ID_PATTERN.test(raw)) {
    return null
  }
  return raw as Id<'documents'>
}
