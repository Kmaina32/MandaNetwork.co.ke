'use server';

/**
 * Creates a verified invitation for a member of an organization.
 */
import { adminDb } from '@/lib/firebase-admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';
import { z } from 'zod';
import { ai } from '@/ai/genkit-instance';

const CreateOrgInviteInputSchema = z.object({
  idToken: z.string().min(20),
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  organizationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
});
export type CreateOrgInviteInput = z.infer<typeof CreateOrgInviteInputSchema>;

const CreateOrgInviteOutputSchema = z.object({
  success: z.boolean(),
  inviteId: z.string().optional(),
  message: z.string(),
});
export type CreateOrgInviteOutput = z.infer<typeof CreateOrgInviteOutputSchema>;

export async function createOrganizationInvite(input: CreateOrgInviteInput): Promise<CreateOrgInviteOutput> {
  return createOrganizationInviteFlow(input);
}

const createOrganizationInviteFlow = ai.defineFlow(
  {
    name: 'createOrganizationInviteFlow',
    inputSchema: CreateOrgInviteInputSchema,
    outputSchema: CreateOrgInviteOutputSchema,
  },
  async ({ idToken, email, organizationId }) => {
    try {
      const decoded = await verifySupabaseAccessToken(idToken);
      const userSnapshot = await adminDb.ref(`users/${decoded.legacyUid}`).get();
      const user = userSnapshot.val();
      if (!user?.isOrganizationAdmin || user.organizationId !== organizationId) {
        throw new Error('You are not authorized to invite members to this organization.');
      }

      const organizationSnapshot = await adminDb.ref(`organizations/${organizationId}`).get();
      if (!organizationSnapshot.exists()) throw new Error('Organization not found.');
      const organization = organizationSnapshot.val();
      if (organization.ownerId !== decoded.legacyUid && user.isOrganizationAdmin !== true) {
        throw new Error('Organization administrator permission is required.');
      }

      const existingInvites = await adminDb.ref('invitations').orderByChild('email').equalTo(email).get();
      if (existingInvites.exists()) {
        const existing = existingInvites.val() as Record<string, any>;
        const duplicate = Object.entries(existing).find(([, invite]) =>
          invite.organizationId === organizationId && invite.status === 'pending'
        );
        if (duplicate) {
          return { success: true, inviteId: duplicate[0], message: 'A pending invitation already exists for this email.' };
        }
      }

      const inviteRef = adminDb.ref('invitations').push();
      if (!inviteRef.key) throw new Error('Could not allocate an invitation.');
      await inviteRef.set({
        email,
        organizationId,
        organizationName: organization.name,
        createdBy: decoded.legacyUid,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: 'pending',
      });
      return { success: true, inviteId: inviteRef.key, message: 'Invitation created successfully.' };
    } catch (error) {
      console.error('Failed to create organization invitation:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'An internal error occurred.' };
    }
  }
);
