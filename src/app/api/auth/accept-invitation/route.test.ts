import { NextRequest } from 'next/server';
import { POST } from './route';
import { getSupabaseServerClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({ getSupabaseServerClient: jest.fn() }));

const mockServer = getSupabaseServerClient as jest.Mock;
const inviteId = '123e4567-e89b-12d3-a456-426614174000';

function request(body: unknown, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/auth/accept-invitation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}

function authenticatedClient(rpc = jest.fn().mockResolvedValue({ data: 'org-1', error: null })) {
  mockServer.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'learner@example.test' } }, error: null }) },
    rpc,
  });
  return rpc;
}

describe('POST /api/auth/accept-invitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects cross-origin requests before opening an authenticated client', async () => {
    const response = await POST(request({ inviteId }, 'https://attacker.example'));
    expect(response.status).toBe(403);
    expect(mockServer).not.toHaveBeenCalled();
  });

  it('requires an authenticated account with an email address', async () => {
    mockServer.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      rpc: jest.fn(),
    });
    const response = await POST(request({ inviteId }));
    expect(response.status).toBe(401);
  });

  it('rejects malformed invitation identifiers without calling the acceptance RPC', async () => {
    const rpc = authenticatedClient();
    const response = await POST(request({ inviteId: 'not-a-uuid' }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepts a valid invitation through the database-owned acceptance procedure', async () => {
    const rpc = authenticatedClient();
    const response = await POST(request({ inviteId: ` ${inviteId} ` }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('accept_organization_invitation', { p_invite_id: inviteId });
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    await expect(response.json()).resolves.toEqual({ success: true, organizationId: 'org-1' });
  });

  it('maps expired invitations to HTTP 410', async () => {
    authenticatedClient(jest.fn().mockResolvedValue({ data: null, error: { message: 'Invitation expired' } }));
    const response = await POST(request({ inviteId }));
    expect(response.status).toBe(410);
  });

  it('maps email or already-used invitation conflicts to HTTP 409', async () => {
    authenticatedClient(jest.fn().mockResolvedValue({ data: null, error: { message: 'Invitation already used' } }));
    const response = await POST(request({ inviteId }));
    expect(response.status).toBe(409);
  });
});
