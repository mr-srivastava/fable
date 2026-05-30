import type { Id } from '../../convex/_generated/dataModel'

const BLOB_ID_PATTERN = /^[a-z0-9_]+$/i

export function parseBlobId(raw: string): Id<'blobs'> | null {
  if (raw.length < 10 || raw.length > 64 || !BLOB_ID_PATTERN.test(raw)) {
    return null
  }
  return raw as Id<'blobs'>
}
