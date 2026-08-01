import { describe, expect, it } from 'vitest'
import { json } from '@codemirror/lang-json'
import { syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import {
  findJsonPathAtPosition,
  findJsonPathLocation,
  findJsonPointerLocation,
  getJsonPathLocationsFromTree,
} from './json-path-locations'

function getLocations(source: string) {
  const state = EditorState.create({ doc: source, extensions: [json()] })
  return getJsonPathLocationsFromTree(source, syntaxTree(state))
}

describe('JSON path locations', () => {
  const source = `{
  "data": { "a/b~c": 1 },
  "users": [{ "email": "one@example.com" }, { "email": null }],
  "empty": []
}`

  it('maps nested objects, escaped names, and array items to contract paths', () => {
    const locations = getLocations(source)

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
    expect(findJsonPointerLocation(locations, '/users/1/email')).toMatchObject({
      path: 'users[].email',
      instancePointer: '/users/1/email',
      schemaPointer: '/users/*/email',
    })
    expect(
      source.slice(
        findJsonPointerLocation(locations, '/users/1/email')?.valueFrom,
        findJsonPointerLocation(locations, '/users/1/email')?.valueTo,
      ),
    ).toBe('null')
  })

  it('returns no locations for invalid JSON', () => {
    expect(getLocations('{ "broken": }')).toEqual([])
  })

  it('keeps display paths separate from canonical schema pointers', () => {
    const [location] = getLocations('{"a.b/items[]":true}')

    expect(location).toMatchObject({
      path: 'a.b/items[]',
      instancePointer: '/a.b~1items[]',
      schemaPointer: '/a.b~1items[]',
    })
  })
})
