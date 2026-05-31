import { MAX_JSON_SIZE, parseJsonSafely } from '@/lib/json'

export const MAX_BLOB_SIZE = MAX_JSON_SIZE

export interface ValidationResult {
  valid: boolean
  error?: string
  size?: number
}

type ParseJSONResult =
  | { ok: true; parsed: unknown; size: number }
  | { ok: false; error: string; size?: number }

export function parseJSONInput(input: string): ParseJSONResult {
  const result = parseJsonSafely(input)
  return result.ok
    ? { ok: true, parsed: result.value, size: result.size }
    : result
}

export function validateJSON(input: string): ValidationResult {
  const result = parseJSONInput(input)
  if (result.ok) {
    return { valid: true, size: result.size }
  }
  return { valid: false, error: result.error, size: result.size }
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
}
