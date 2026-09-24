BEGIN;

-- The event trigger still runs when an authorized database role creates a
-- table. API roles do not need to invoke its SECURITY DEFINER function.
-- This function may be absent in projects that did not install ensure_rls.
DO $revoke$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
      FROM PUBLIC, anon, authenticated;
  END IF;
END
$revoke$;

COMMIT;
