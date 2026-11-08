import { render, screen } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';
import { Footer as CompactFooter } from './Footer';
import { Footer as EditorialFooter } from './shared/Footer';

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('authenticated footer visibility', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders the public editorial footer and legal navigation when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<EditorialFooter />);

    expect(screen.getByRole('link', { name: 'Varban Academy' })).toHaveAttribute('href', '/');
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Varban Academy. All rights reserved.`))).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Terms and agreements/i })[0]).toHaveAttribute('href', '/legal/terms');
    expect(screen.getAllByRole('link', { name: /Privacy notice/i })[0]).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: /Account deletion/i })).toHaveAttribute('href', '/account-deletion');
    expect(screen.getAllByRole('link', { name: /Data safety/i })[0]).toHaveAttribute('href', '/legal/data-safety');
  });

  it('hides the editorial footer for authenticated users', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'authenticated-user' }, loading: false });
    const { queryByRole } = render(<EditorialFooter />);
    expect(queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('hides the compact footer for authenticated users', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'authenticated-user' }, loading: false });
    const { queryByRole } = render(<CompactFooter />);
    expect(queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('does not flash a public footer while authentication is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { queryByRole } = render(<EditorialFooter />);
    expect(queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('renders the compact footer when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<CompactFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms and agreements' })).toHaveAttribute('href', '/legal/terms');
  });
});
