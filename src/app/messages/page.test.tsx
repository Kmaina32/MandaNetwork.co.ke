
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessagesPage from './page';
import { useAuth } from '@/hooks/use-auth';
import { getAllNotifications } from '@/lib/firebase-service';
import { useRouter } from 'next/navigation';

jest.mock('@/hooks/use-auth');
jest.mock('@/lib/firebase-service');
jest.mock('next/navigation');

const mockUseAuth = useAuth as jest.Mock;
const mockGetAllNotifications = getAllNotifications as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('MessagesPage', () => {
  const mockUser = { uid: '123' };
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockUseRouter.mockReturnValue(mockRouter);
    mockGetAllNotifications.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MessagesPage />);
    expect(screen.getByText('Message Center')).toBeInTheDocument();
  });

  it('displays loading animation when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<MessagesPage />);
    expect(screen.getByTestId('loading-animation')).toBeInTheDocument();
  });

  it('redirects to login if user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<MessagesPage />);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('displays "No messages yet" when there are no messages', async () => {
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  const mockMessages = [
    { id: '1', userId: '123', title: 'New Message from Employer 1', body: { employerName: 'Employer 1', organizationName: 'Org 1', message: 'Message 1', email: 'email1@test.com' }, createdAt: new Date().toISOString(), read: false, archived: false },
    { id: '2', userId: '123', title: 'New Message from Employer 2', body: { employerName: 'Employer 2', organizationName: 'Org 2', message: 'Message 2', email: 'email2@test.com' }, createdAt: new Date(Date.now() - 10000).toISOString(), read: true, archived: false },
  ];

  it('displays messages when they exist', async () => {
    mockGetAllNotifications.mockResolvedValue(mockMessages);
    render(<MessagesPage />);
    await waitFor(() => {
      expect(screen.getByText('Employer 1')).toBeInTheDocument();
      expect(screen.getByText('Employer 2')).toBeInTheDocument();
    });
  });

  it('filters messages by unread', async () => {
    mockGetAllNotifications.mockResolvedValue(mockMessages);
    render(<MessagesPage />);
    await waitFor(() => {
        expect(screen.getByText('Employer 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Unread Only'));
    await waitFor(() => {
      expect(screen.getByText('Employer 1')).toBeInTheDocument();
      expect(screen.queryByText('Employer 2')).not.toBeInTheDocument();
    });
  });

  it('sorts messages by oldest', async () => {
    mockGetAllNotifications.mockResolvedValue(mockMessages);
    render(<MessagesPage />);
    await waitFor(() => {
        expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Employer 1');
    });

    fireEvent.click(screen.getByText(/Sort/));
    fireEvent.click(screen.getByText('Oldest First'));

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Employer 2');
    });
  });

  it('searches messages', async () => {
    mockGetAllNotifications.mockResolvedValue(mockMessages);
    render(<MessagesPage />);
    await waitFor(() => {
        expect(screen.getByText('Employer 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search messages...'), { target: { value: 'Employer 1' } });

    await waitFor(() => {
      expect(screen.getByText('Employer 1')).toBeInTheDocument();
      expect(screen.queryByText('Employer 2')).not.toBeInTheDocument();
    });
  });

  it('clears search and filters', async () => {
    mockGetAllNotifications.mockResolvedValue(mockMessages);
    render(<MessagesPage />);
    await waitFor(() => {
        expect(screen.getByText('Employer 1')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search messages...'), { target: { value: 'search term' } });
    fireEvent.click(screen.getByText('Unread Only'));
    
    await waitFor(() => {
        expect(screen.queryByText('Employer 1')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear Filters'));

    await waitFor(() => {
        expect(screen.getByText('Employer 1')).toBeInTheDocument();
        expect(screen.getByText('Employer 2')).toBeInTheDocument();
      });
  });
  
});
