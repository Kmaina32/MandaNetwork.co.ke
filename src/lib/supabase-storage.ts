import { getSupabaseBrowserClient } from './supabase/client';

const BUCKET = 'academy-media';
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

/** Uploads media using the same cookie-backed Supabase Auth session as the app. */
export async function uploadAcademyMedia(file: File, category: 'images' | 'videos' | 'documents' = 'images') {
  if (!file) throw new Error('Choose a file to upload.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Unsupported file type. Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 50 MB or smaller.');
  if (category === 'images' && !file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (category === 'videos' && !file.type.startsWith('video/')) throw new Error('Choose a video file.');

  const supabase = getSupabaseBrowserClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sign in with your Varban Academy account before uploading.');

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const objectPath = `${user.id}/${category}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message || 'Upload failed. Check your account permissions and try again.');

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return {
    bucket: BUCKET,
    path: data.path,
    publicUrl: publicData.publicUrl,
    contentType: file.type,
    size: file.size,
  };
}

export function getAcademyMediaPublicUrl(path: string) {
  const { data } = getSupabaseBrowserClient().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
