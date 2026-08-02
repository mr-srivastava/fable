import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ContractPanel } from './ContractPanel'

describe('ContractPanel path selection', () => {
  const contract = {
    version: 1,
    fields: [
      {
        path: 'data.id',
        schemaPointer: '/data/id',
        type: 'string' as const,
        required: true,
        nullable: false,
      },
    ],
  }

  it('marks the selected path and reports when it is absent', () => {
    render(
      <ContractPanel
        contract={contract}
        activePointer="/data/id"
        activePointerPresent={false}
        onOverrideChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'data.id is not present in this example.',
    )
    expect(
      screen.getByRole('button', { name: 'Selected field: data.id' }),
    ).toBeInTheDocument()
  })

  it('selects a field from its contract row', async () => {
    const user = userEvent.setup()
    const onSelectPointer = vi.fn()
    render(
      <ContractPanel
        contract={contract}
        onSelectPointer={onSelectPointer}
        onOverrideChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'data.id' }))
    expect(onSelectPointer).toHaveBeenCalledWith('/data/id')
  })

  it('renders the empty state without a contract', () => {
    render(<ContractPanel onOverrideChange={vi.fn()} />)

    expect(screen.getByText('No contract fields')).toBeInTheDocument()
  })
})
