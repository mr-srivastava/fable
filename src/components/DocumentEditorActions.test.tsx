import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentEditorActions } from './DocumentEditorActions'
import {
  buildDocumentEditorCommands,
  buildDocumentEditorModel,
} from '@/test/factories/document-editor'

describe('DocumentEditorActions', () => {
  it('shows the save blocker as visible, associated guidance', () => {
    render(
      <DocumentEditorActions
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          submission: { status: 'unavailable', reason: 'invalidJson' },
          hasUnsavedChanges: true,
        })}
        commands={buildDocumentEditorCommands()}
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
