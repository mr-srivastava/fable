import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JsonEditorPanel } from './JsonEditorPanel'
import type { JsonEditorProps } from './json-editor/JsonEditor.types'
import { formatJson } from '@/lib/json'
import {
  buildDocumentEditorCommands,
  buildDocumentEditorModel,
} from '@/test/factories/document-editor'

vi.mock('@/components/json-editor/JsonEditor', () => ({
  JsonEditor: ({ value, onChange, validation }: JsonEditorProps) => (
    <div>
      JSON editor
      <button
        type="button"
        aria-label="Format JSON"
        disabled={validation.status !== 'valid' || value.trim() === ''}
        onClick={() => onChange(formatJson(value))}
      />
    </div>
  ),
}))

describe('JsonEditorPanel workspace hierarchy', () => {
  it('renders one editable JSON surface in the desktop workspace', () => {
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel()}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(screen.getAllByText('JSON editor')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Format JSON' })).toHaveLength(
      1,
    )
    expect(
      document.querySelector('[data-slot="resizable-panel-group"]'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Contract' }),
    ).not.toBeInTheDocument()
  })

  it('uses Variants and Contract tabs with one editable surface on mobile', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) satisfies MediaQueryList,
    )

    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel()}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Variants' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Contract' })).toBeInTheDocument()
    expect(screen.getAllByText('JSON editor')).toHaveLength(1)
    expect(
      document.querySelector('[data-slot="resizable-panel-group"]'),
    ).not.toBeInTheDocument()

    matchMedia.mockRestore()
  })

  it('formats valid JSON through the active example command', () => {
    const updateVariant = vi.fn()
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          payload: { status: 'valid', value: '{"id":1}', size: 8 },
        })}
        commands={buildDocumentEditorCommands({ updateVariant })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Format JSON' }))

    expect(updateVariant).toHaveBeenCalledWith('one', '{\n  "id": 1\n}')
  })

  it('disables formatting when JSON is invalid', () => {
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          payload: {
            status: 'invalid',
            reason: 'syntax',
            value: '{',
            message: 'Invalid JSON',
          },
        })}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Format JSON' })).toBeDisabled()
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument()
    expect(screen.queryByText('Invalid JSON')).not.toBeInTheDocument()
  })

  it('does not repeat valid JSON or unsaved state in the payload header', () => {
    render(
      <JsonEditorPanel
        mode={{ type: 'saved', documentUrl: '/blob/one', apiUrl: '/api/blob' }}
        model={buildDocumentEditorModel({ hasUnsavedChanges: true })}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(screen.queryByText('Valid JSON')).not.toBeInTheDocument()
    expect(screen.getAllByText('Unsaved changes')).toHaveLength(1)
  })
})
