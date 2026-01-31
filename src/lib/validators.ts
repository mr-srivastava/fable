export const MAX_BLOB_SIZE = 102400 // 100KB in bytes

export interface ValidationResult {
  valid: boolean
  error?: string
  size?: number
}

export function validateJSON(input: string): ValidationResult {
  try {
    JSON.parse(input)
    const size = new Blob([input]).size

    if (size > MAX_BLOB_SIZE) {
      return {
        valid: false,
        error: `JSON too large: ${size} bytes (max ${MAX_BLOB_SIZE})`,
        size,
      }
    }

    return { valid: true, size }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    }
  }
}

export function formatBytes(bytes: number): string {
  return bytes < 1024
    ? `${bytes} B`
    : `${(bytes / 1024).toFixed(2)} KB`
}
