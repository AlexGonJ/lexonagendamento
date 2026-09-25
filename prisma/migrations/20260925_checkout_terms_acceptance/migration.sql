ALTER TABLE "CheckoutOrder"
  ADD COLUMN "termsReadConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT;
