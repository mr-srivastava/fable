import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentEditorActions } from './DocumentEditorActions'
import {
  buildDocumentEditorCommands,
  buildDocumentEditorModel,
} from '@/test/factories/document-editor'

describe('DocumentEditorActions', () => {
  it('disables saving without repeating the editor error', () => {
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
    expect(create).not.toHaveAccessibleDescription()
    expect(
      screen.queryByText('Fix invalid JSON before saving.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'More specimen actions' }),
    ).toBeInTheDocument()
  })
})
