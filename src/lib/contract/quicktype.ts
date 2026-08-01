import {
  InputData,
  JSONSchemaInput,
  jsonInputForTargetLanguage,
  quicktype,
} from 'quicktype-core'
import { normalizeJsonSchema } from '../../../shared/json-schema'
import type { JsonSchema } from '@shared/document'

export async function inferJsonSchema(
  samples: Array<string>,
): Promise<JsonSchema> {
  const jsonInput = jsonInputForTargetLanguage('schema')
  await jsonInput.addSource({ name: 'Specimen', samples })
  const inputData = new InputData()
  inputData.addInput(jsonInput)
  const result = await quicktype({ inputData, lang: 'schema' })
  return normalizeJsonSchema(JSON.parse(result.lines.join('\n')))
}

export async function generateTypeScript(
  jsonSchema: JsonSchema,
): Promise<string> {
  const schemaInput = new JSONSchemaInput(undefined)
  await schemaInput.addSource({
    name: 'Specimen',
    schema: JSON.stringify(jsonSchema),
  })
  const inputData = new InputData()
  inputData.addInput(schemaInput)
  const result = await quicktype({
    inputData,
    lang: 'typescript',
    rendererOptions: { 'just-types': 'true' },
  })
  return `${result.lines.join('\n').trim()}\n`
}
