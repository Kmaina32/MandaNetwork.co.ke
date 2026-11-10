'use server';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifySupabaseAccessToken } from '@/lib/supabase/verify-access-token';
import type { ApiKey } from '@/lib/types';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

const GenerateApiKeyInputSchema = z.object({
  idToken: z.string().min(20),
  keyName: z.string().trim().min(3).max(64),
});
export type GenerateApiKeyInput = z.infer<typeof GenerateApiKeyInputSchema>;

export async function generateApiKey(input: GenerateApiKeyInput): Promise<ApiKey> {
  const parsed = GenerateApiKeyInputSchema.parse(input);
  const user = await verifySupabaseAccessToken(parsed.idToken);
  const key = 'sk_live_' + randomBytes(24).toString('hex');
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from('user_api_keys').insert({
    user_id: user.id, name: parsed.keyName,
    key_hash: createHash('sha256').update(key).digest('hex'),
    key_preview: key.slice(-4),
  }).select('id,name,key_preview,created_at,user_id').single();
  if (error) throw error;
  return { id: data.id, name: data.name, keyPreview: data.key_preview, createdAt: data.created_at, userId: data.user_id, key } as ApiKey;
}

export async function listUserApiKeys(idToken: string): Promise<Array<Omit<ApiKey, 'key'>>> {
  const user = await verifySupabaseAccessToken(idToken);
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from('user_api_keys')
    .select('id,name,key_preview,created_at,user_id').eq('user_id',user.id).is('revoked_at',null)
    .order('created_at',{ascending:false});
  if (error) throw error;
  return (data || []).map(row => ({ id: row.id, name: row.name, keyPreview: row.key_preview, createdAt: row.created_at, userId: row.user_id })) as Array<Omit<ApiKey,'key'>>;
}
