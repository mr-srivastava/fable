import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarketingWorkbenchPreview } from './MarketingWorkbenchPreview'

describe('MarketingWorkbenchPreview', () => {
  it('mirrors the playground payload and contract panels', () => {
    render(<MarketingWorkbenchPreview />)

    expect(
      screen.getByRole('img', {
        name: /preview of the specimen workbench/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Payload')).toBeInTheDocument()
    expect(screen.getByText('Contract Inspector')).toBeInTheDocument()
    expect(screen.getByText('Variant 1')).toBeInTheDocument()
    expect(screen.getByText('user.email')).toBeInTheDocument()
    expect(screen.queryByText('Save & share')).not.toBeInTheDocument()
  })
})
