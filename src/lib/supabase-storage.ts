import { getSupabaseSession } from './supabase-auth';

const BUCKET = 'academy-media';
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase Storage is not configured.');
  return { url: url.replace(/\/$/, ''), key };
}

/**
 * Uploads images/videos into a user-owned folder in the public academy-media
 * bucket. Public read is intentional for published course media; writes remain
 * authenticated and constrained by Storage RLS to the caller's own UUID folder.
 */
export async function uploadAcademyMedia(file: File, category: 'images' | 'videos' | 'documents' = 'images') {
  if (!file) throw new Error('Choose a file to upload.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Unsupported file type. Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 50 MB or smaller.');

  const session = await getSupabaseSession();
  if (!session?.user?.id || !session.access_token) {
    throw new Error('Sign in with your Varban Academy Supabase account before uploading.');
  }
  if (category === 'images' && !file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (category === 'videos' && !file.type.startsWith('video/')) throw new Error('Choose a video file.');

  const { url, key } = getConfig();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const objectPath = `${session.user.id}/${category}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
      'cache-control': '3600',
    },
    body: file,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || 'Upload failed. Check your account permissions and try again.');
  }
  return {
    bucket: BUCKET,
    path: objectPath,
    publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
    contentType: file.type,
    size: file.size,
  };
}

export function getAcademyMediaPublicUrl(path: string) {
  const { url } = getConfig();
  return `${url}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
