// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { JsonEditorPanel } from './JsonEditorPanel'
import type { DocumentEditorViewModel } from '@/lib/document-editor-model'

vi.mock('@/components/JsonEditor', () => ({
  JsonEditor: () => <div>JSON editor</div>,
}))

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: true })
})

afterEach(cleanup)

const model: DocumentEditorViewModel = {
  payload: { status: 'valid', value: '{}' },
  examples: {
    items: [{ id: 'one', name: 'Example', data: '{}', createdAt: 1 }],
    activeId: 'one',
    validationCounts: {},
    canAdd: true,
  },
  contract: { status: { type: 'ready' }, schemaDiagnostics: [] },
  submission: { status: 'available' },
  exports: { status: 'unavailable' },
  hasUnsavedChanges: false,
}

describe('JsonEditorPanel workspace hierarchy', () => {
  it('uses Examples and Contract as the mobile workspace with one editable JSON surface', () => {
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={model}
        commands={{
          updateExample: vi.fn(),
          selectExample: vi.fn(),
          renameExample: vi.fn(),
          addExample: vi.fn(),
          removeExample: vi.fn(),
          changeContractOverride: vi.fn(),
          reset: vi.fn(),
          submit: vi.fn(),
          generateTypeScript: vi.fn(),
        }}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Examples' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Contract' })).toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Formatted' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Edit' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: 'Preview' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Format JSON' })).toHaveLength(
      2,
    )
    expect(
      document.querySelector('[data-slot="resizable-panel-group"]'),
    ).toHaveClass('md:flex')
  })

  it('formats valid JSON through the active example command', () => {
    const updateExample = vi.fn()
    render(
      <JsonEditorPanel
        mode={{ type: 'create' }}
        model={{ ...model, payload: { status: 'valid', value: '{"id":1}' } }}
        commands={{
          updateExample,
          selectExample: vi.fn(),
          renameExample: vi.fn(),
          addExample: vi.fn(),
          removeExample: vi.fn(),
          changeContractOverride: vi.fn(),
          reset: vi.fn(),
          submit: vi.fn(),
          generateTypeScript: vi.fn(),
        }}
      />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Format JSON' })[0])

    expect(updateExample).toHaveBeenCalledWith('one', '{\n  "id": 1\n}')

    updateExample.mockClear()
    fireEvent.keyDown(screen.getAllByText('JSON editor')[0], {
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
        model={{
          ...model,
          payload: { status: 'invalid', value: '{', message: 'Invalid JSON' },
        }}
        commands={{
          updateExample: vi.fn(),
          selectExample: vi.fn(),
          renameExample: vi.fn(),
          addExample: vi.fn(),
          removeExample: vi.fn(),
          changeContractOverride: vi.fn(),
          reset: vi.fn(),
          submit: vi.fn(),
          generateTypeScript: vi.fn(),
        }}
      />,
    )

    expect(
      screen.getAllByRole('button', { name: 'Format JSON' })[0],
    ).toBeDisabled()
  })
})
