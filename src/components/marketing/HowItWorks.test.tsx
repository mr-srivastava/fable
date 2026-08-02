import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HowItWorks } from './HowItWorks'

describe('HowItWorks', () => {
  it('renders the workflow steps', () => {
    render(<HowItWorks />)

    expect(
      screen.getByRole('heading', { name: 'How it works' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Paste or edit JSON')).toBeInTheDocument()
    expect(screen.getByText('Infer a contract')).toBeInTheDocument()
    expect(screen.getByText('Annotate fields')).toBeInTheDocument()
    expect(screen.getByText('Save and share')).toBeInTheDocument()
  })
})
