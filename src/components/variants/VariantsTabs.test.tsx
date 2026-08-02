import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VariantsTabs } from './VariantsTabs'
import { buildDocumentVariant } from '@/test/factories/document'

const variants = [
  buildDocumentVariant({ name: 'Success' }),
  buildDocumentVariant({ id: 'two', name: 'Error', createdAt: 2 }),
]

function renderTabs(
  overrides: Partial<React.ComponentProps<typeof VariantsTabs>> = {},
) {
  const props: React.ComponentProps<typeof VariantsTabs> = {
    variants,
    activeVariantId: 'one',
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    validationCounts: { two: 2 },
    canAdd: true,
    children: <div>Editor content</div>,
    ...overrides,
  }
  render(<VariantsTabs {...props} />)
  return props
}

describe('VariantsTabs', () => {
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
    await user.click(
      await screen.findByRole('menuitem', { name: 'Rename “Success”' }),
    )
    const input = await screen.findByRole('textbox', { name: 'Variant name' })
    await user.clear(input)
    await user.type(input, 'Primary{Enter}')

    expect(props.onRename).toHaveBeenCalledWith('one', 'Primary')
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Success' })).toHaveFocus(),
    )
  })

  it('scopes actions to the active variant and explains last-variant deletion', async () => {
    const user = userEvent.setup()
    const props = renderTabs({ variants: [variants[0]] })

    await user.click(
      screen.getByRole('button', { name: 'Actions for Success' }),
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Delete “Success”' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByText('A specimen needs at least one variant.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Rename “Success”' }))
    await user.type(
      await screen.findByRole('textbox', { name: 'Variant name' }),
      ' changed{Escape}',
    )

    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('labels the collection and adds variants from its toolbar', async () => {
    const user = userEvent.setup()
    const props = renderTabs()

    expect(screen.getByText(/Variants/)).toBeInTheDocument()
    expect(screen.getByText(/2 variants/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add variant' }))

    expect(props.onAdd).toHaveBeenCalledOnce()
  })

  it('deletes the active variant from its attached actions menu', async () => {
    const user = userEvent.setup()
    const props = renderTabs()

    await user.click(
      screen.getByRole('button', { name: 'Actions for Success' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Delete “Success”' }),
    )

    expect(props.onDelete).toHaveBeenCalledWith('one')
  })
})
