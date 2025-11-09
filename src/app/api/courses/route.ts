
import { getAllCourses, logApiCall, getUserById } from '@/lib/firebase-service';
import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  const snapshot = await adminDb.ref('apiKeys').get();
  if (!snapshot.exists()) {
    return null;
  }
  const allUserKeys = snapshot.val();
  for (const userId in allUserKeys) {
    const userKeys = allUserKeys[userId];
    for (const keyId in userKeys) {
      if (userKeys[keyId].key === apiKey) {
        return userId;
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized: Missing API Key' }, { status: 401 });
  }
  const apiKey = authHeader.split('Bearer ')[1];
  
  try {
    const userId = await getUserIdFromApiKey(apiKey);
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    // Optional: Implement rate limiting here by checking user's apiCallCount
    // For now, we'll just log the call.
    await logApiCall(userId, '/api/courses');

    const courses = await getAllCourses();
    return NextResponse.json(courses);
  } catch (error) {
    console.error('API Error fetching courses:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
