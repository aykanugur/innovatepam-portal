import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import Home from '@/app/page'

describe('Home page', () => {
  it('renders the submit idea link', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: /submit.*idea/i })).toBeInTheDocument()
  })

  it('renders the portal brand text', () => {
    render(<Home />)
    const matches = screen.getAllByText(/InnovatEPAM/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
