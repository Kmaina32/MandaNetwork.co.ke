import { render, screen } from '@testing-library/react';
import { Footer } from './shared/Footer';

describe('Footer', () => {
  it('renders the editorial footer and legal navigation', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Varban Academy' })).toHaveAttribute('href', '/');
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Varban Academy. All rights reserved.`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms and agreements/i })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: /Privacy notice/i })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: /Account deletion/i })).toHaveAttribute('href', '/account-deletion');
    expect(screen.getByRole('link', { name: /Data safety/i })).toHaveAttribute('href', '/legal/data-safety');
  });
});
