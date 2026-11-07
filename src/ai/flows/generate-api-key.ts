'use server';

/**
 * Generates a user-owned API key. The user identity is derived from a verified
 * Firebase ID token; a caller-supplied UID is never trusted.
 */
import { adminAuth, adminDb } from '@/lib/firebase-admin';
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
  const decoded = await adminAuth.verifyIdToken(parsed.idToken, true);
  const userId = decoded.uid;
  const key = `sk_live_${randomBytes(24).toString('hex')}`;
  const keyRef = adminDb.ref(`apiKeys/${userId}`).push();
  if (!keyRef.key) throw new Error('Could not allocate an API key identifier.');

  const newKeyData: Omit<ApiKey, 'id'> = {
    name: parsed.keyName,
    keyPreview: key.slice(-4),
    createdAt: new Date().toISOString(),
    userId,
  };
  await keyRef.set({
    name: newKeyData.name,
    keyHash: createHash('sha256').update(key).digest('hex'),
    keyPreview: newKeyData.keyPreview,
    createdAt: newKeyData.createdAt,
    userId,
  });
  return { ...newKeyData, key, id: keyRef.key };
}

export async function listUserApiKeys(idToken: string): Promise<Array<Omit<ApiKey, 'key'> & { keyPreview: string }>> {
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  const snapshot = await adminDb.ref(`apiKeys/${decoded.uid}`).get();
  if (!snapshot.exists()) return [];

  const records = snapshot.val() as Record<string, any>;
  const results: Array<Omit<ApiKey, 'key'> & { keyPreview: string }> = [];
  for (const [id, record] of Object.entries(records)) {
    let keyPreview = typeof record.keyPreview === 'string' ? record.keyPreview : '••••';
    if (typeof record.key === 'string') {
      const keyHash = createHash('sha256').update(record.key).digest('hex');
      keyPreview = record.key.slice(-4);
      await adminDb.ref(`apiKeys/${decoded.uid}/${id}`).update({
        keyHash,
        keyPreview,
        key: null,
      });
    }
    results.push({
      id,
      name: String(record.name || 'API key'),
      keyPreview,
      createdAt: String(record.createdAt || new Date().toISOString()),
      userId: decoded.uid,
    });
  }
  return results;
}
