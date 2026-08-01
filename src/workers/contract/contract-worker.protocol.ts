import type { JsonSchema } from '@shared/document'

export type ContractWorkerApi = {
  infer: (samples: Array<string>) => Promise<JsonSchema>
  generateTypeScript: (jsonSchema: JsonSchema) => Promise<string>
}
