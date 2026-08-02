import { describe, expect, it } from 'vitest'
import {
  buildContractInspectorState,
  getImmediateChildCount,
} from './contractInspectorModel'
import type { JsonContractField } from '@shared/document'

const fields: Array<JsonContractField> = [
  {
    path: 'data',
    type: 'object',
    required: true,
    nullable: false,
    schemaPointer: '/properties/data',
  },
  {
    path: 'data.id',
    type: 'string',
    required: true,
    nullable: false,
    schemaPointer: '/properties/data/properties/id',
  },
  {
    path: 'data.name',
    type: 'string',
    required: true,
    nullable: false,
    schemaPointer: '/properties/data/properties/name',
  },
  {
    path: 'status',
    type: 'string',
    required: true,
    nullable: false,
    schemaPointer: '/properties/status',
  },
]

describe('getImmediateChildCount', () => {
  it('counts only direct children', () => {
    expect(getImmediateChildCount(fields[0], fields)).toBe(2)
    expect(getImmediateChildCount(fields[3], fields)).toBe(0)
  })
})

describe('buildContractInspectorState', () => {
  it('marks nested rows invisible when their container is collapsed', () => {
    const state = buildContractInspectorState(fields, {
      expandedPaths: new Set(['status']),
    })

    expect(
      state.rows.map((row) => ({
        path: row.field.path,
        visible: row.visible,
        childCount: row.childCount,
        depth: row.depth,
        label: row.label,
      })),
    ).toEqual([
      {
        path: 'data',
        visible: true,
        childCount: 2,
        depth: 0,
        label: 'data',
      },
      {
        path: 'data.id',
        visible: false,
        childCount: 0,
        depth: 1,
        label: 'id',
      },
      {
        path: 'data.name',
        visible: false,
        childCount: 0,
        depth: 1,
        label: 'name',
      },
      {
        path: 'status',
        visible: true,
        childCount: 0,
        depth: 0,
        label: 'status',
      },
    ])
  })

  it('attaches diagnostics to matching schema pointers', () => {
    const state = buildContractInspectorState(fields, {
      expandedPaths: new Set(['data']),
      schemaDiagnostics: [
        {
          variantId: 'one',
          instancePointer: '/data/id',
          fieldPointer: '/properties/data/properties/id',
          rulePointer: '#/properties/data/properties/id/type',
          message: 'Expected string.',
          code: 'typeMismatch',
          expected: 'string',
        },
      ],
    })

    expect(
      state.rows.find((row) => row.field.path === 'data.id')?.diagnostics,
    ).toEqual([
      expect.objectContaining({
        fieldPointer: '/properties/data/properties/id',
      }),
    ])
    expect(
      state.rows.find((row) => row.field.path === 'status')?.diagnostics,
    ).toEqual([])
  })
})
