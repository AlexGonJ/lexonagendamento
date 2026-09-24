import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

try {
  const [tables, policies, functions] = await Promise.all([
    prisma.$queryRaw`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
             has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
             has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    `,
    prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, permissive, roles
      FROM pg_policies
      WHERE (schemaname = 'public' AND policyname = 'deny_direct_client_access')
         OR (schemaname = 'storage' AND tablename = 'objects'
             AND policyname = 'public_images_server_only')
    `,
    prisma.$queryRaw`
      SELECT p.proname AS name,
             has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
             EXISTS (SELECT 1 FROM pg_event_trigger e
                     WHERE e.evtfoid = p.oid AND e.evtenabled <> 'D') AS trigger_enabled
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    `,
  ]);

  const noRls = tables.filter((table) => !table.rls).map((table) => table.name);
  const apiAccess = tables.filter((table) => table.anon_access || table.authenticated_access).map((table) => table.name);
  const noDenyPolicy = tables
    .filter((table) => !policies.some((policy) => policy.schemaname === 'public' && policy.tablename === table.name))
    .map((table) => table.name);
  const storagePolicy = policies.some((policy) => policy.schemaname === 'storage' && policy.permissive === 'RESTRICTIVE');
  const functionProtected = functions.every((fn) => !fn.anon_execute && !fn.authenticated_execute && fn.trigger_enabled);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Variáveis do Supabase ausentes.');
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('public-images');
  if (bucketError) throw bucketError;

  const bucketValid = bucket.public === true
    && bucket.file_size_limit === 5 * 1024 * 1024
    && ['image/jpeg', 'image/png', 'image/webp'].every((mime) => bucket.allowed_mime_types?.includes(mime));

  console.log(JSON.stringify({
    tableCount: tables.length,
    noRls,
    apiAccess,
    noDenyPolicy,
    storagePolicy,
    functionProtected,
    bucketValid,
  }, null, 2));

  if (noRls.length || apiAccess.length || noDenyPolicy.length || !storagePolicy || !functionProtected || !bucketValid) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
