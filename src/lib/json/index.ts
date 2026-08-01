import parseJson from 'json-parse-even-better-errors'
import { MAX_EXAMPLE_BYTES, getUtf8Size } from '@shared/document-limits'

export const MAX_JSON_SIZE = MAX_EXAMPLE_BYTES

export type ParseJsonResult =
  | { ok: true; value: unknown; size: number }
  | { ok: false; reason: 'syntax' | 'size'; error: string; size?: number }

export function getJsonSize(input: string): number {
  return getUtf8Size(input)
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`
}

export function validateJsonSize(
  input: string,
  maxBytes = MAX_JSON_SIZE,
):
  | { valid: true; size: number }
  | { valid: false; error: string; size: number } {
  const size = getJsonSize(input)
  if (size > maxBytes) {
    return {
      valid: false,
      error: `JSON too large: ${size} bytes (max ${maxBytes})`,
      size,
    }
  }

  return { valid: true, size }
}

function removeJsonMetadata(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value
  }

  delete (value as Record<symbol, unknown>)[Symbol.for('indent')]
  delete (value as Record<symbol, unknown>)[Symbol.for('newline')]

  if (Array.isArray(value)) {
    value.forEach(removeJsonMetadata)
    return value
  }

  Object.values(value).forEach(removeJsonMetadata)
  return value
}

export function parseJsonSafely(input: string): ParseJsonResult {
  try {
    const value = removeJsonMetadata(parseJson(input))
    const sizeValidation = validateJsonSize(input)
    if (!sizeValidation.valid) {
      return {
        ok: false,
        reason: 'size',
        error: sizeValidation.error,
        size: sizeValidation.size,
      }
    }

    return { ok: true, value, size: sizeValidation.size }
  } catch (error) {
    return {
      ok: false,
      reason: 'syntax',
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

export function formatJson(input: string): string {
  const result = parseJsonSafely(input)
  return result.ok ? JSON.stringify(result.value, null, 2) : ''
}
