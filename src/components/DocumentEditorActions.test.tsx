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

    const create = screen.getByRole('button', { name: 'Save & share' })
    expect(create).toBeDisabled()
    expect(create).not.toHaveAccessibleDescription()
    expect(screen.getByText('Fix JSON to save')).toBeInTheDocument()
    expect(
      screen.queryByText('Fix invalid JSON before saving.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'More specimen actions' }),
    ).toBeInTheDocument()
  })

  it('surfaces the primary create action after secondary actions', () => {
    render(
      <DocumentEditorActions
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          submission: { status: 'available' },
          hasUnsavedChanges: true,
        })}
        commands={buildDocumentEditorCommands()}
      />,
    )

    const toolbar = screen.getByRole('toolbar', { name: 'Editor actions' })
    const buttons = toolbar.querySelectorAll('button')
    const labels = [...buttons].map((button) => button.textContent || '')
    expect(labels.at(-1)).toContain('Save & share')
    expect(screen.getByText('Draft — not shared yet')).toBeInTheDocument()
  })

  it('collapses copy targets into a single menu on saved specimens', () => {
    render(
      <DocumentEditorActions
        mode={{
          type: 'saved',
          documentUrl: 'https://example.com/blob/1',
          apiUrl: 'https://example.com/api/blob/1',
        }}
        model={buildDocumentEditorModel({
          submission: { status: 'available' },
          hasUnsavedChanges: false,
        })}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Copy specimen' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy URL' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy curl' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy fetch' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Copy JSON' }),
    ).not.toBeInTheDocument()
  })
})
