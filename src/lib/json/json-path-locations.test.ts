import { describe, expect, it } from 'vitest'
import {
  findJsonPathAtPosition,
  findJsonPathLocation,
  getJsonPathLocations,
} from './json-path-locations'

describe('JSON path locations', () => {
  const source = `{
  "data": { "a/b~c": 1 },
  "users": [{ "email": "one@example.com" }, { "email": null }],
  "empty": []
}`

  it('maps nested objects, escaped names, and array items to contract paths', () => {
    const locations = getJsonPathLocations(source)

    expect(locations.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        'data',
        'data.a/b~c',
        'users',
        'users[]',
        'users[].email',
        'empty',
      ]),
    )
    expect(
      findJsonPathAtPosition(locations, source.indexOf('one@example.com')),
    ).toBe('users[].email')
    expect(findJsonPathLocation(locations, 'data.a/b~c')).toBeDefined()
  })

  it('returns no locations for invalid JSON', () => {
    expect(getJsonPathLocations('{ "broken": }')).toEqual([])
  })
})
