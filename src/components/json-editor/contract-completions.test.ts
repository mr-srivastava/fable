import { CompletionContext } from '@codemirror/autocomplete'
import { json } from '@codemirror/lang-json'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { createContractCompletionSource } from './contract-completions'
import type { JsonContractField } from '@shared/document'

const fields: Array<JsonContractField> = [
  {
    path: 'id',
    schemaPointer: '/id',
    type: 'string',
    required: true,
    nullable: false,
    description: 'Stable identifier',
  },
  {
    path: 'status',
    schemaPointer: '/status',
    type: 'string',
    required: true,
    nullable: false,
    enumValues: ['ready', 'failed'],
  },
  {
    path: 'users',
    schemaPointer: '/users',
    type: 'array',
    required: true,
    nullable: false,
  },
  {
    path: 'users[]',
    schemaPointer: '/users/*',
    type: 'object',
    required: true,
    nullable: false,
  },
  {
    path: 'users[].email',
    schemaPointer: '/users/*/email',
    type: 'string',
    required: true,
    nullable: false,
  },
]

function complete(
  source: string,
  explicit = true,
  contractFields: ReadonlyArray<JsonContractField> = fields,
) {
  const state = EditorState.create({ doc: source, extensions: [json()] })
  const context = new CompletionContext(state, source.length, explicit)
  return createContractCompletionSource(contractFields)(context)
}

describe('contract completions', () => {
  it('suggests missing root properties without repeating existing fields', () => {
    const result = complete('{"id":"one",\n  "')

    expect(result).not.toBeNull()
    if (!result || result instanceof Promise) return
    expect(result.options.map((option) => option.label)).toEqual([
      'status',
      'users',
    ])
  })

  it('suggests direct properties for objects inside arrays', () => {
    const result = complete('{"users":[{\n  "')

    expect(result).not.toBeNull()
    if (!result || result instanceof Promise) return
    expect(result.options.map((option) => option.label)).toEqual(['email'])
  })

  it('suggests authored enum values while editing a field value', () => {
    const result = complete('{"status":"re')

    expect(result).not.toBeNull()
    if (!result || result instanceof Promise) return
    expect(result.options.map((option) => option.label)).toEqual([
      '"ready"',
      '"failed"',
    ])
  })

  it('uses schema pointers for property names containing path syntax', () => {
    const contractFields: Array<JsonContractField> = [
      {
        path: 'profile',
        schemaPointer: '/profile',
        type: 'object',
        required: true,
        nullable: false,
      },
      {
        path: 'profile.a.b',
        schemaPointer: '/profile/a.b',
        type: 'string',
        required: true,
        nullable: false,
      },
    ]
    const result = complete('{"profile":{"', true, contractFields)

    expect(result).not.toBeNull()
    if (!result || result instanceof Promise) return
    expect(result.options.map((option) => option.label)).toEqual(['a.b'])
  })
})
