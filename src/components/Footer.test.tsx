
import { render, screen } from '@testing-library/react'
import { Footer } from './shared/Footer'

describe('Footer', () => {
  it('renders the footer with correct text and links', () => {
    render(<Footer />)

    // Check for the company name
    const companyName = screen.getByText(/Varban Academy/i)
    expect(companyName).toBeInTheDocument()

    // Check for the copyright notice
    const currentYear = new Date().getFullYear()
    const copyrightNotice = screen.getByText(`© ${currentYear} Varban Academy. All rights reserved. | ISO 9001 Certified`)
    expect(copyrightNotice).toBeInTheDocument()

    // Check for the navigation links
    const termsLink = screen.getByRole('link', { name: /Terms of Service/i })
    expect(termsLink).toBeInTheDocument()
    expect(termsLink).toHaveAttribute('href', '/terms')

    const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i })
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })
})
