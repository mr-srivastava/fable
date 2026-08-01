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
        activePath="data.id"
        activePathPresent={false}
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
    const onSelectPath = vi.fn()
    render(
      <ContractPanel
        contract={contract}
        onSelectPath={onSelectPath}
        onOverrideChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'data.id' }))
    expect(onSelectPath).toHaveBeenCalledWith('data.id')
  })
})
