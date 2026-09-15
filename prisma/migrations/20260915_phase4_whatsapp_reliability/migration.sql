CREATE TABLE "ClientCommunicationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "promotionalOptOut" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientCommunicationPreference_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WhatsappLog" ADD COLUMN "providerMessageId" TEXT, ADD COLUMN "deliveredAt" TIMESTAMP(3), ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "WhatsappOutbox" ADD COLUMN "providerMessageId" TEXT, ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "WhatsappLog_providerMessageId_key" ON "WhatsappLog"("providerMessageId");
CREATE UNIQUE INDEX "ClientCommunicationPreference_tenantId_clientId_key" ON "ClientCommunicationPreference"("tenantId", "clientId");
CREATE INDEX "ClientCommunicationPreference_tenantId_promotionalOptOut_idx" ON "ClientCommunicationPreference"("tenantId", "promotionalOptOut");
ALTER TABLE "ClientCommunicationPreference" ADD CONSTRAINT "ClientCommunicationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCommunicationPreference" ADD CONSTRAINT "ClientCommunicationPreference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
