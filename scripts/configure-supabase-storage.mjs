import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const bucketId = 'public-images';
const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) throw listError;

const existing = buckets.find((bucket) => bucket.id === bucketId);
if (existing && !existing.public) {
  throw new Error('public-images já existe como bucket privado. Revise seu conteúdo antes de torná-lo público.');
}

const options = {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

const { error } = existing
  ? await supabase.storage.updateBucket(bucketId, options)
  : await supabase.storage.createBucket(bucketId, options);

if (error) throw error;
console.log(`Bucket ${bucketId} configurado com limite de 5 MB e formatos JPEG, PNG e WebP.`);
