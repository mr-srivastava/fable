import type {
  JsonContract,
  JsonContractField,
  JsonFieldType,
} from '@/types/contract'

type FieldAccumulator = {
  path: string
  type: JsonFieldType
  required: boolean
  nullable: boolean
  seen: number
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getValueType(value: unknown): JsonFieldType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isPlainObject(value)) return 'object'

  const valueType = typeof value
  if (valueType === 'string') return 'string'
  if (valueType === 'number') return 'number'
  if (valueType === 'boolean') return 'boolean'
  return 'unknown'
}

function combineTypes(
  current: JsonFieldType,
  next: JsonFieldType,
): JsonFieldType {
  if (current === next) return current
  if (current === 'null') return next
  if (next === 'null') return current
  return 'unknown'
}

function upsertField(
  fields: Map<string, FieldAccumulator>,
  path: string,
  value: unknown,
  required: boolean,
) {
  const nextType = getValueType(value)
  const existing = fields.get(path)

  if (!existing) {
    fields.set(path, {
      path,
      type: nextType,
      required,
      nullable: value === null,
      seen: 1,
    })
    return
  }

  existing.type = combineTypes(existing.type, nextType)
  existing.required = existing.required && required
  existing.nullable = existing.nullable || value === null
  existing.seen += 1
}

function walkValue(
  value: unknown,
  path: string,
  fields: Map<string, FieldAccumulator>,
  required: boolean,
) {
  if (path) {
    upsertField(fields, path, value, required)
  }

  if (Array.isArray(value)) {
    walkArray(value, path, fields)
    return
  }

  if (isPlainObject(value)) {
    for (const [key, childValue] of Object.entries(value)) {
      walkValue(childValue, path ? `${path}.${key}` : key, fields, true)
    }
  }
}

function walkArray(
  items: Array<unknown>,
  arrayPath: string,
  fields: Map<string, FieldAccumulator>,
) {
  if (items.length === 0) return

  const itemPath = `${arrayPath}[]`
  const objectItems = items.filter(isPlainObject)

  if (objectItems.length > 0) {
    const keys = new Set(objectItems.flatMap((item) => Object.keys(item)))
    for (const key of keys) {
      for (const item of objectItems) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          walkValue(item[key], `${itemPath}.${key}`, fields, true)
        } else {
          const field = fields.get(`${itemPath}.${key}`)
          if (field) field.required = false
        }
      }

      const field = fields.get(`${itemPath}.${key}`)
      if (field && field.seen < objectItems.length) {
        field.required = false
      }
    }
  } else {
    for (const item of items) {
      walkValue(item, itemPath, fields, true)
    }
  }
}

export function inferContractFromJson(value: unknown): JsonContract {
  const fields = new Map<string, FieldAccumulator>()
  walkValue(value, '', fields, true)

  const contractFields: Array<JsonContractField> = Array.from(
    fields.values(),
  ).map(({ path, type, required, nullable }) => ({
    path,
    type,
    required,
    nullable,
  }))

  return {
    version: 1,
    fields: contractFields.sort((a, b) => a.path.localeCompare(b.path)),
  }
}
