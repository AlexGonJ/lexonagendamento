BEGIN;

-- Prisma's migration history is not an application model, but it lives in
-- the exposed public schema and must not be available to Data API roles.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS deny_direct_client_access ON public."_prisma_migrations";
CREATE POLICY deny_direct_client_access
  ON public."_prisma_migrations" AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMIT;
