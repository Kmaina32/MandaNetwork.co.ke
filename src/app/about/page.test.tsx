import { render, screen } from '@testing-library/react';
import AboutPage from './page';

jest.mock('@/components/Header', () => ({
  Header: () => <header>Mocked Header</header>,
}));

jest.mock('@/components/Sidebar', () => ({
  AppSidebar: () => null,
}));

jest.mock('@/components/Footer', () => ({
  Footer: () => <footer>Mocked Footer</footer>,
}));

jest.mock('@/lib/firebase-service', () => ({
  getTeamMembers: jest.fn().mockResolvedValue([]),
}));

describe('AboutPage', () => {
  it('renders the Varban Academy heading', () => {
    render(<AboutPage />);
    expect(screen.getByText('About Varban Academy', { exact: true })).toBeInTheDocument();
  });

  it('renders the mission and courses sections', () => {
    render(<AboutPage />);
    expect(screen.getByText('Our Mission')).toBeInTheDocument();
    expect(screen.getByText('Our Courses')).toBeInTheDocument();
  });

  it('renders the Explore Our Courses link', () => {
    render(<AboutPage />);
    const button = screen.getByRole('link', { name: /Explore Our Courses/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/');
  });
});
