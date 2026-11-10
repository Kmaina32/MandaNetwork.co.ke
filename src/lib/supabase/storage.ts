'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'academy-assets';

export async function uploadAcademyAsset(file: File, folder = 'uploads'): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sign in before uploading files.');

  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'uploads';
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const path = `${user.id}/${safeFolder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (urlError || !data?.signedUrl) throw urlError || new Error('Could not create a secure file link.');
  return data.signedUrl;
}

/** Public image assets are stored separately from private documents and course submissions. */
export async function uploadPublicAcademyImage(file: File, folder = 'images'): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sign in before uploading images.');
  if (!file.type.startsWith('image/') || !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP and GIF images are supported.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'images';
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : 'jpg';
  const path = `${user.id}/${safeFolder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('academy-media').upload(path,file,{
    cacheControl:'31536000',upsert:false,contentType:file.type,
  });
  if(error)throw error;
  const {data}=supabase.storage.from('academy-media').getPublicUrl(path);
  if(!data?.publicUrl)throw new Error('Could not create a public image URL.');
  return data.publicUrl;
}
