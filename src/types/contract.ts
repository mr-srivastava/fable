export type JsonFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object'
  | 'unknown'

export type JsonContractField = {
  path: string
  type: JsonFieldType
  required: boolean
  nullable: boolean
  enumValues?: Array<string>
  description?: string
}

export type JsonContract = {
  version: number
  fields: Array<JsonContractField>
}
