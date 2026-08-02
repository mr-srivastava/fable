import { describe, expect, it } from 'vitest'
import {
  formatFieldPathDisplay,
  getContainerPaths,
  isContractRowVisible,
} from './contractTree'
import type { JsonContractField } from '@shared/document'

const fields: Array<JsonContractField> = [
  { path: 'data', type: 'object', required: true, nullable: false },
  { path: 'data.id', type: 'string', required: true, nullable: false },
  { path: 'data.name', type: 'string', required: true, nullable: false },
  { path: 'status', type: 'string', required: true, nullable: false },
]

describe('formatFieldPathDisplay', () => {
  it('hides the path when it matches the label', () => {
    expect(formatFieldPathDisplay('data', 'data')).toBeNull()
    expect(formatFieldPathDisplay('status', 'status')).toBeNull()
  })

  it('shows a JSON path for nested fields', () => {
    expect(formatFieldPathDisplay('data.id', 'id')).toBe('$.data.id')
  })
})

describe('isContractRowVisible', () => {
  it('hides descendants when a container is collapsed', () => {
    const expanded = new Set(['status'])
    const containers = new Set(['data', 'status'])

    expect(isContractRowVisible('data', expanded, containers)).toBe(true)
    expect(isContractRowVisible('data.id', expanded, containers)).toBe(false)
    expect(isContractRowVisible('status', expanded, containers)).toBe(true)
  })

  it('shows nested fields when intermediate containers are absent', () => {
    const expanded = new Set<string>()
    const containers = new Set<string>()

    expect(isContractRowVisible('data.id', expanded, containers)).toBe(true)
  })
})

describe('getContainerPaths', () => {
  it('returns object and array container paths', () => {
    expect(getContainerPaths(fields)).toEqual(['data'])
  })
})
