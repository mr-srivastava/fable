import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MarketingHero } from './MarketingHero'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('MarketingHero', () => {
  it('renders the hero headline and an honest workbench preview', () => {
    render(<MarketingHero />)

    expect(
      screen.getByRole('heading', {
        name: /turn json into contract-ready specimens/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Payload')).toBeInTheDocument()
    expect(screen.getByText('Contract Inspector')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /open playground/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Edit', { selector: '[role="listitem"]' }),
    ).not.toBeInTheDocument()
  })
})
