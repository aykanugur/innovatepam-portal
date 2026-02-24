import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home page', () => {
  it('renders the submit idea button', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: /submit an idea/i })).toBeInTheDocument()
  })

  it('renders the portal heading', () => {
    render(<Home />)
    expect(screen.getByText(/InnovateEPAM Portal/i)).toBeInTheDocument()
  })
})
