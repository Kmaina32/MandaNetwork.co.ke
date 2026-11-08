import { render, screen } from '@testing-library/react';
import AdminLayout from './layout';
import { useAuth } from '@/hooks/use-auth';

jest.mock('@/hooks/use-auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/components/AdminSidebar', () => ({ AdminSidebar: () => <nav>Admin navigation</nav> }));
jest.mock('@/components/Header', () => ({ Header: () => <header>Admin header</header> }));
jest.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }));
jest.mock('@/components/LoadingAnimation', () => ({ LoadingAnimation: () => <div>Loading account</div> }));
jest.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const mockedUseAuth = useAuth as jest.Mock;

describe('AdminLayout access boundary', () => {
  it('shows a loading state while authentication is unresolved', () => {
    mockedUseAuth.mockReturnValue({ loading: true, user: null, isAdmin: false, dbUser: null });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Loading account')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('denies unauthenticated visitors', () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: null, isAdmin: false, dbUser: null });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('fails closed for authenticated accounts without an admin role', () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: { uid: 'user-1' }, isAdmin: false, dbUser: null });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('denies authenticated non-admin users with a profile', () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: { uid: 'user-1' }, isAdmin: false, dbUser: { uid: 'user-1' } });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the admin shell for an administrator with a profile', () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: { uid: 'admin-1' }, isAdmin: true, dbUser: { uid: 'admin-1' } });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Admin navigation')).toBeInTheDocument();
    expect(screen.getByText('Admin header')).toBeInTheDocument();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders the super-admin shell when the configured UID is authorized without a profile record', () => {
    mockedUseAuth.mockReturnValue({ loading: false, user: { uid: 'super-admin' }, isAdmin: true, dbUser: null });
    render(<AdminLayout><p>Protected content</p></AdminLayout>);
    expect(screen.getByText('Admin navigation')).toBeInTheDocument();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});
