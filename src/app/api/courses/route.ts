import { NextResponse, NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  const snapshot = await adminDb.ref('apiKeys').get();
  if (!snapshot.exists()) return null;

  const incomingHash = createHash('sha256').update(apiKey).digest();
  const allUserKeys = snapshot.val() as Record<string, Record<string, any>>;
  for (const [userId, userKeys] of Object.entries(allUserKeys)) {
    for (const [keyId, stored] of Object.entries(userKeys || {})) {
      if (typeof stored?.keyHash === 'string' && /^[a-f0-9]{64}$/i.test(stored.keyHash)) {
        const savedHash = Buffer.from(stored.keyHash, 'hex');
        if (savedHash.length === incomingHash.length && timingSafeEqual(savedHash, incomingHash)) return userId;
      }

      // One-time migration for legacy plaintext keys. New keys are never persisted in plaintext.
      if (typeof stored?.key === 'string' && stored.key.length === apiKey.length) {
        const legacyHash = createHash('sha256').update(stored.key).digest();
        if (timingSafeEqual(legacyHash, incomingHash)) {
          await adminDb.ref(`apiKeys/${userId}/${keyId}`).update({
            keyHash: legacyHash.toString('hex'),
            keyPreview: stored.key.slice(-4),
            key: null,
          });
          return userId;
        }
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized: Missing API Key' }, { status: 401 });
  }
  const apiKey = authHeader.slice('Bearer '.length).trim();
  if (!/^sk_live_[a-f0-9]{48}$/i.test(apiKey)) {
    return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  try {
    const userId = await getUserIdFromApiKey(apiKey);
    if (!userId) return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });

    const day = new Date().toISOString().slice(0, 10);
    const limitRef = adminDb.ref(`apiRateLimits/${userId}/${day}`);
    const limitResult = await limitRef.transaction((current) => {
      const count = Number(current?.count) || 0;
      if (count >= 1000) return;
      return { count: count + 1, updatedAt: Date.now() };
    });
    if (!limitResult.committed) {
      return NextResponse.json({ message: 'Daily API rate limit reached.' }, { status: 429 });
    }

    await adminDb.ref(`users/${userId}/apiCallCount`).transaction(current => (Number(current) || 0) + 1);
    const usageRef = adminDb.ref(`apiUsage/${userId}`).push();
    await usageRef.set({ endpoint: '/api/courses', timestamp: new Date().toISOString() });

    const coursesSnapshot = await adminDb.ref('courses').get();
    const coursesData = coursesSnapshot.val();
    const courses = coursesData
      ? Object.keys(coursesData).map(id => ({ id, ...coursesData[id] })).reverse()
      : [];
    return NextResponse.json(courses);
  } catch (error) {
    console.error('API Error fetching courses:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
