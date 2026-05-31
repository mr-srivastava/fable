import { describe, expect, it } from 'vitest'
import { MAX_JSON_SIZE, formatJson, parseJsonSafely } from '@/lib/json'

describe('parseJsonSafely', () => {
  it('returns parsed values and byte size for valid JSON', () => {
    const result = parseJsonSafely('{"name":"Avery"}')

    expect(result).toEqual({
      ok: true,
      value: { name: 'Avery' },
      size: 16,
    })
  })

  it('returns enhanced error text for invalid JSON', () => {
    const result = parseJsonSafely('{"name":}')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('while parsing')
      expect(result.error).toContain('{"name":}')
    }
  })

  it('returns the existing size error for oversized JSON', () => {
    const input = JSON.stringify({ value: 'x'.repeat(MAX_JSON_SIZE) })
    const result = parseJsonSafely(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/^JSON too large:/)
      expect(result.size).toBeGreaterThan(MAX_JSON_SIZE)
    }
  })
})

describe('formatJson', () => {
  it('formats valid JSON', () => {
    expect(formatJson('{"name":"Avery"}')).toBe('{\n  "name": "Avery"\n}')
  })

  it('returns an empty string for invalid JSON', () => {
    expect(formatJson('{"name":}')).toBe('')
  })
})
