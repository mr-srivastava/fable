export const MAX_BLOB_SIZE = 102400 // 100KB in bytes

export interface ValidationResult {
  valid: boolean
  error?: string
  size?: number
}

type ParseJSONResult =
  | { ok: true; parsed: unknown; size: number }
  | { ok: false; error: string; size?: number }

export function parseJSONInput(input: string): ParseJSONResult {
  try {
    const parsed = JSON.parse(input)
    const size = new Blob([input]).size

    if (size > MAX_BLOB_SIZE) {
      return {
        ok: false,
        error: `JSON too large: ${size} bytes (max ${MAX_BLOB_SIZE})`,
        size,
      }
    }

    return { ok: true, parsed, size }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    }
  }
}

export function validateJSON(input: string): ValidationResult {
  const result = parseJSONInput(input)
  if (result.ok) {
    return { valid: true, size: result.size }
  }
  return { valid: false, error: result.error, size: result.size }
}

export function formatBytes(bytes: number): string {
  return bytes < 1024
    ? `${bytes} B`
    : `${(bytes / 1024).toFixed(2)} KB`
}
