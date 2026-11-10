'use server';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';
import { z } from 'zod';
import { ai } from '@/ai/genkit-instance';

const CreateOrgInviteInputSchema = z.object({
  idToken: z.string().min(20),
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  organizationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
});
export type CreateOrgInviteInput = z.infer<typeof CreateOrgInviteInputSchema>;
const CreateOrgInviteOutputSchema = z.object({ success: z.boolean(), inviteId: z.string().optional(), message: z.string() });
export type CreateOrgInviteOutput = z.infer<typeof CreateOrgInviteOutputSchema>;

export async function createOrganizationInvite(input: CreateOrgInviteInput): Promise<CreateOrgInviteOutput> {
  return createOrganizationInviteFlow(input);
}

const createOrganizationInviteFlow = ai.defineFlow({
  name: 'createOrganizationInviteFlow',
  inputSchema: CreateOrgInviteInputSchema,
  outputSchema: CreateOrgInviteOutputSchema,
}, async ({ idToken, email, organizationId }) => {
  try {
    const user = await verifySupabaseAccessToken(idToken);
    const admin = getSupabaseAdminClient();
    const [{ data: organization, error: orgError }, { data: membership, error: memberError }] = await Promise.all([
      admin.from('organizations').select('id,name,owner_id').eq('id',organizationId).maybeSingle(),
      admin.from('organization_members').select('member_role,status').eq('organization_id',organizationId)
        .eq('user_id',user.id).eq('status','active').maybeSingle(),
    ]);
    if (orgError) throw orgError;
    if (memberError) throw memberError;
    if (!organization) throw new Error('Organization not found.');
    const isOwner = organization.owner_id === user.id;
    const isMemberAdmin = membership && ['owner','admin'].includes(membership.member_role);
    if (!isOwner && !isMemberAdmin) throw new Error('You are not authorized to invite members to this organization.');

    const { data: existing, error: existingError } = await admin.from('academy_records')
      .select('record_id,data').eq('collection','invitations').limit(500);
    if (existingError) throw existingError;
    const duplicate = (existing || []).find((row:any) => String(row.data?.email || '').toLowerCase() === email
      && row.data?.organizationId === organizationId && row.data?.status === 'pending'
      && (!row.data?.expiresAt || new Date(row.data.expiresAt).getTime() > Date.now()));
    if (duplicate) return { success:true, inviteId:duplicate.record_id, message:'A pending invitation already exists for this email.' };

    const inviteId = crypto.randomUUID();
    const { error } = await admin.from('academy_records').insert({
      collection:'invitations', record_id:inviteId, owner_id:user.id,
      data:{ email, organizationId, organizationName:organization.name, createdBy:user.id,
        createdAt:new Date().toISOString(), expiresAt:new Date(Date.now()+7*24*60*60*1000).toISOString(), status:'pending' },
    });
    if (error) throw error;
    return { success:true, inviteId, message:'Invitation created successfully.' };
  } catch (error) {
    console.error('Failed to create Supabase organization invitation:', error instanceof Error ? error.message : 'Unknown error');
    return { success:false, message:error instanceof Error ? error.message : 'An internal error occurred.' };
  }
});
