import { render, screen } from '@testing-library/react';
import { Footer } from './shared/Footer';

describe('Footer', () => {
  it('renders the editorial footer and legal navigation', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Varban Academy' })).toHaveAttribute('href', '/');
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Varban Academy. All rights reserved.`))).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Terms and agreements/i })[0]).toHaveAttribute('href', '/legal/terms');
    expect(screen.getAllByRole('link', { name: /Privacy notice/i })[0]).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getAllByRole('link', { name: /Account deletion/i })[0]).toHaveAttribute('href', '/account-deletion');
    expect(screen.getAllByRole('link', { name: /Data safety/i })[0]).toHaveAttribute('href', '/legal/data-safety');
  });
});
