export const MAX_JSON_SIZE = 102400 // 100KB in bytes

export type ParseJsonResult =
  | { ok: true; value: unknown; size: number }
  | { ok: false; error: string; size?: number }

export function getJsonSize(input: string): number {
  return new Blob([input]).size
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

export function parseJsonSafely(input: string): ParseJsonResult {
  try {
    const value = JSON.parse(input)
    const sizeValidation = validateJsonSize(input)
    if (!sizeValidation.valid) {
      return {
        ok: false,
        error: sizeValidation.error,
        size: sizeValidation.size,
      }
    }

    return { ok: true, value, size: sizeValidation.size }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

export function formatJson(input: string): string {
  const result = parseJsonSafely(input)
  return result.ok ? JSON.stringify(result.value, null, 2) : ''
}
