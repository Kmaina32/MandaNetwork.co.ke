'use server';

import { createSupabaseUserClient } from '@/lib/supabase/user-client';
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
    const { user, client } = await createSupabaseUserClient(idToken);
    const [{ data: organization, error: orgError }, { data: membership, error: memberError }] = await Promise.all([
      client.from('organizations').select('id,name,owner_id').eq('id',organizationId).maybeSingle(),
      client.from('organization_members').select('member_role,status').eq('organization_id',organizationId)
        .eq('user_id',user.id).eq('status','active').maybeSingle(),
    ]);
    if (orgError) throw orgError;
    if (memberError) throw memberError;
    if (!organization) throw new Error('Organization not found.');
    const isOwner = organization.owner_id === user.id;
    const isMemberAdmin = membership && ['owner','admin'].includes(membership.member_role);
    if (!isOwner && !isMemberAdmin) throw new Error('You are not authorized to invite members to this organization.');

    const { data: existing, error: existingError } = await client.from('organization_invitations')
      .select('id,email,organization_id,status,expires_at').eq('organization_id',organizationId)
      .ilike('email',email).eq('status','pending').limit(20);
    if (existingError) throw existingError;
    const duplicate = (existing || []).find((row:any) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
    if (duplicate) return { success:true, inviteId:duplicate.id, message:'A pending invitation already exists for this email.' };

    const inviteId = crypto.randomUUID();
    const { error } = await client.from('organization_invitations').insert({
      id:inviteId, organization_id:organizationId, email, invited_user_id:null,
      member_role:'member', status:'pending', invited_by:user.id,
      expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString(),
      content:{organizationName:organization.name,createdBy:user.id,createdAt:new Date().toISOString()},
    });
    if (error) throw error;
    return { success:true, inviteId, message:'Invitation created successfully.' };
  } catch (error) {
    console.error('Failed to create Supabase organization invitation:', error instanceof Error ? error.message : 'Unknown error');
    return { success:false, message:error instanceof Error ? error.message : 'An internal error occurred.' };
  }
});
