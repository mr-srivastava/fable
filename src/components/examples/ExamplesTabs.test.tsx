// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExamplesTabs } from './ExamplesTabs'

const examples = [
  { id: 'one', name: 'Success', data: '{}', createdAt: 1 },
  { id: 'two', name: 'Error', data: '{}', createdAt: 2 },
]

afterEach(cleanup)

function renderTabs(
  overrides: Partial<React.ComponentProps<typeof ExamplesTabs>> = {},
) {
  const props: React.ComponentProps<typeof ExamplesTabs> = {
    examples,
    activeExampleId: 'one',
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    validationCounts: { two: 2 },
    canAdd: true,
    children: <div>Editor content</div>,
    ...overrides,
  }
  render(<ExamplesTabs {...props} />)
  return props
}

describe('ExamplesTabs', () => {
  it('uses tab keyboard navigation and exposes validation counts', async () => {
    const user = userEvent.setup()
    const props = renderTabs()
    const success = screen.getByRole('tab', { name: 'Success' })

    success.focus()
    await user.keyboard('{ArrowRight}')

    expect(props.onSelect).toHaveBeenCalledWith('two')
    expect(
      screen.getByRole('tab', { name: 'Error, 2 contract violations' }),
    ).toHaveFocus()
  })

  it('commits a rename with Enter and returns focus to the tab', async () => {
    const user = userEvent.setup()
    const props = renderTabs()

    await user.click(
      screen.getByRole('button', { name: 'Actions for Success' }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Rename “Success”' }))
    const input = await screen.findByRole('textbox', { name: 'Example name' })
    await user.clear(input)
    await user.type(input, 'Primary{Enter}')

    expect(props.onRename).toHaveBeenCalledWith('one', 'Primary')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Success' })).toHaveFocus(),
    )
  })

  it('scopes actions to the active example and explains last-example deletion', async () => {
    const user = userEvent.setup()
    const props = renderTabs({ examples: [examples[0]] })

    await user.click(
      screen.getByRole('button', { name: 'Actions for Success' }),
    )
    expect(
      screen.getByRole('menuitem', { name: 'Delete “Success”' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByText('A specimen needs at least one example.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Rename “Success”' }))
    await user.type(
      await screen.findByRole('textbox', { name: 'Example name' }),
      ' changed{Escape}',
    )

    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('labels the collection and adds examples from its toolbar', async () => {
    const user = userEvent.setup()
    const props = renderTabs()

    expect(
      screen.getByRole('heading', { name: 'Examples' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 payloads')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add example' }))

    expect(props.onAdd).toHaveBeenCalledOnce()
  })

  it('deletes the active example from its attached actions menu', async () => {
    const user = userEvent.setup()
    const props = renderTabs()

    await user.click(
      screen.getByRole('button', { name: 'Actions for Success' }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Delete “Success”' }))

    expect(props.onDelete).toHaveBeenCalledWith('one')
  })
})
