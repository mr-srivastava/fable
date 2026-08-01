import { describe, expect, it } from 'vitest'
import { loadPublicConfig } from '@/config/public-config'

describe('loadPublicConfig', () => {
  it('loads required and optional configuration', () => {
    expect(
      loadPublicConfig({
        VITE_CONVEX_URL: 'https://example.convex.cloud',
        VITE_SHOW_DEVTOOLS: 'true',
      }),
    ).toEqual({
      convexUrl: 'https://example.convex.cloud',
      showDevtools: true,
    })
  })

  it('rejects missing Convex configuration', () => {
    expect(() => loadPublicConfig({})).toThrow('VITE_CONVEX_URL is required')
  })

  it('only enables devtools for the literal true value', () => {
    expect(
      loadPublicConfig({
        VITE_CONVEX_URL: 'https://example.convex.cloud',
        VITE_SHOW_DEVTOOLS: '1',
      }).showDevtools,
    ).toBe(false)
  })
})
