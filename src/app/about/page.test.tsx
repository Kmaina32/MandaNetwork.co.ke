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
  it('renders the Varban Academy heading', async () => {
    render(<AboutPage />);
    expect(await screen.findByText('About Varban Academy', { exact: true })).toBeInTheDocument();
  });

  it('renders the mission and courses sections', async () => {
    render(<AboutPage />);
    expect(await screen.findByText('Our Mission')).toBeInTheDocument();
    expect(await screen.findByText('Our Courses')).toBeInTheDocument();
  });

  it('renders the Explore Our Courses link', async () => {
    render(<AboutPage />);
    const button = await screen.findByRole('link', { name: /Explore Our Courses/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', '/');
  });
});
