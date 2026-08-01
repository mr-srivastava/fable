import { describe, expect, it } from 'vitest'
import { json } from '@codemirror/lang-json'
import { EditorState } from '@codemirror/state'
import { getSchemaEditorDiagnostics } from './editor-diagnostics'

function state(source: string) {
  return EditorState.create({ doc: source, extensions: [json()] })
}

describe('schema editor diagnostics', () => {
  it('targets the exact value identified by an Ajv instance path', () => {
    const source = '{"users":[{"email":"ok"},{"email":null}]}'
    const [diagnostic] = getSchemaEditorDiagnostics(state(source), [
      {
        exampleId: 'one',
        instancePointer: '/users/1/email',
        fieldPointer: '/users/*/email',
        rulePointer: '#/properties/users/items/properties/email/type',
        code: 'typeMismatch',
        expected: 'string',
        message: 'Expected string.',
      },
    ])

    expect(source.slice(diagnostic.from, diagnostic.to)).toBe('null')
    expect(diagnostic).toMatchObject({
      severity: 'error',
      source: 'Contract',
      message: '/users/1/email: Expected string.',
    })
  })

  it('anchors missing-property and root errors to the document', () => {
    const source = '{}'
    const [diagnostic] = getSchemaEditorDiagnostics(state(source), [
      {
        exampleId: 'one',
        instancePointer: '',
        fieldPointer: '/id',
        rulePointer: '#/required',
        code: 'missingProperty',
        missingProperty: 'id',
        message: 'Missing required property "id".',
      },
    ])

    expect(source.slice(diagnostic.from, diagnostic.to)).toBe('{')
    expect(diagnostic.message).toBe('root: Missing required property "id".')
  })

  it('offers deterministic replacements for enum violations', () => {
    const [diagnostic] = getSchemaEditorDiagnostics(state('"unknown"'), [
      {
        exampleId: 'one',
        instancePointer: '',
        fieldPointer: '',
        rulePointer: '#/enum',
        code: 'enumMismatch',
        message: 'Use one of the allowed values.',
        allowedValues: ['ready', 'failed'],
      },
    ])

    expect(diagnostic.actions?.map((action) => action.name)).toEqual([
      'Use "ready"',
      'Use "failed"',
    ])
  })
})
