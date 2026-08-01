// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocumentEditorActions } from './DocumentEditorActions'
import type { DocumentEditorViewModel } from '@/lib/document-editor-model'

afterEach(cleanup)

function buildModel(
  submission: DocumentEditorViewModel['submission'],
): DocumentEditorViewModel {
  return {
    payload: { status: 'valid', value: '{}' },
    examples: {
      items: [{ id: 'one', name: 'Example', data: '{}', createdAt: 1 }],
      activeId: 'one',
      validationCounts: {},
      canAdd: true,
    },
    contract: { status: { type: 'ready' }, schemaDiagnostics: [] },
    submission,
    exports: { status: 'unavailable' },
    hasUnsavedChanges: true,
  }
}

describe('DocumentEditorActions', () => {
  it('shows the save blocker as visible, associated guidance', () => {
    render(
      <DocumentEditorActions
        mode={{ type: 'create' }}
        model={buildModel({ status: 'unavailable', reason: 'invalidJson' })}
        commands={{
          submit: vi.fn(),
          reset: vi.fn(),
          generateTypeScript: vi.fn(),
        }}
      />,
    )

    const create = screen.getByRole('button', { name: 'Create specimen' })
    expect(create).toBeDisabled()
    expect(create).toHaveAccessibleDescription(
      'Fix invalid JSON before saving.',
    )
    expect(screen.getByText('Fix invalid JSON before saving.')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'More specimen actions' }),
    ).toBeInTheDocument()
  })
})
