import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { JsonEditorPanel } from './JsonEditorPanel'
import {
  buildDocumentEditorCommands,
  buildDocumentEditorModel,
} from '@/test/factories/document-editor'

vi.mock('@/components/JsonEditor', () => ({
  JsonEditor: () => <div>JSON editor</div>,
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

  it('uses Examples and Contract tabs with one editable surface on mobile', () => {
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

    expect(screen.getByRole('tab', { name: 'Examples' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Contract' })).toBeInTheDocument()
    expect(screen.getAllByText('JSON editor')).toHaveLength(1)
    expect(
      document.querySelector('[data-slot="resizable-panel-group"]'),
    ).not.toBeInTheDocument()

    matchMedia.mockRestore()
  })

  it('formats valid JSON through the active example command', () => {
    const updateExample = vi.fn()
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          payload: { status: 'valid', value: '{"id":1}', size: 8 },
        })}
        commands={buildDocumentEditorCommands({ updateExample })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Format JSON' }))

    expect(updateExample).toHaveBeenCalledWith('one', '{\n  "id": 1\n}')

    updateExample.mockClear()
    fireEvent.keyDown(screen.getByText('JSON editor'), {
      altKey: true,
      shiftKey: true,
      key: 'F',
    })

    expect(updateExample).toHaveBeenCalledWith('one', '{\n  "id": 1\n}')
  })

  it('disables formatting when JSON is invalid', () => {
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={buildDocumentEditorModel({
          payload: {
            status: 'invalid',
            value: '{',
            message: 'Invalid JSON',
          },
        })}
        commands={buildDocumentEditorCommands()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Format JSON' })).toBeDisabled()
  })
})
