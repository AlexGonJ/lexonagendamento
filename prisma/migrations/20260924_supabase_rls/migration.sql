-- The application authenticates users in Next.js and accesses Postgres via Prisma.
-- No Supabase Auth identity is mapped to Employee/Client. Public API roles must
-- never read or mutate these tables, including tables without a tenantId.
-- Run this migration as the owner of the Prisma tables (normally postgres).

BEGIN;

DO $rls$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Tenant', 'Plan', 'TenantPlan', 'CheckoutOrder', 'Service',
    'Employee', 'InventoryProduct', 'InventoryMovement',
    'EmployeeSchedule', 'EmployeeTimeOff', 'EmployeeAvailabilityBlock',
    'TenantHoliday', 'Client', 'Booking', 'OtpVerification',
    'PasswordResetToken', 'RateLimitState', 'WhatsappLog',
    'WhatsappOutbox', 'ClientCommunicationPreference', 'CustomerPlan',
    'CustomerSubscription', 'CreditLedgerEntry', 'Expense', 'Receipt',
    'CashSession', 'PaymentWebhookEvent', 'AuditLog', '_EmployeeToService'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected Prisma table public.% is missing', table_name;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);

    -- A restrictive policy still denies access if a broad grant or permissive
    -- policy is added later. Table owners and service_role bypass RLS.
    EXECUTE format('DROP POLICY IF EXISTS deny_direct_client_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY deny_direct_client_access ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      table_name
    );
  END LOOP;
END
$rls$;

-- Supabase projects can automatically grant privileges on newly created
-- public objects. Keep future Prisma migrations private by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

-- Uploaded images are intentionally served through their public URL. Only
-- the server-side service role may create, list or change objects in this
-- bucket. Public-bucket downloads bypass storage.objects RLS by design.
-- Bucket configuration is managed through the Storage API, not SQL metadata.
DROP POLICY IF EXISTS public_images_server_only ON storage.objects;
CREATE POLICY public_images_server_only
  ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'public-images')
  WITH CHECK (bucket_id <> 'public-images');

COMMIT;
