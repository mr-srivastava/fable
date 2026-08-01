import { describe, expect, it } from 'vitest'
import { projectJsonSchemaToContract } from '@shared/json-schema'
import { generateTypeScript, inferJsonSchema } from './quicktype'

describe('Quicktype adapter', () => {
  it('infers required, optional, nullable, nested, and array fields from samples', async () => {
    const jsonSchema = await inferJsonSchema([
      JSON.stringify({ id: 1, profile: { name: 'Ada' }, tags: ['a'] }),
      JSON.stringify({ id: 2, profile: { name: null } }),
    ])
    const contract = projectJsonSchemaToContract(jsonSchema)

    expect(jsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(contract.fields.find((field) => field.path === 'id')).toMatchObject({
      type: 'number',
      required: true,
    })
    expect(
      contract.fields.find((field) => field.path === 'tags'),
    ).toMatchObject({
      type: 'array',
      required: false,
    })
    expect(
      contract.fields.find((field) => field.path === 'profile.name'),
    ).toMatchObject({
      nullable: true,
    })
  })

  it('generates TypeScript from the effective schema', async () => {
    const jsonSchema = await inferJsonSchema([JSON.stringify({ id: 'one' })])
    const source = await generateTypeScript(jsonSchema)
    expect(source).toContain('export interface Specimen')
    expect(source).toContain('id: string')
  })
})
