ALTER TABLE "WhatsappOutbox" ADD COLUMN "bookingId" TEXT;
CREATE INDEX "WhatsappOutbox_bookingId_idx" ON "WhatsappOutbox"("bookingId");
ALTER TABLE "WhatsappOutbox" ADD CONSTRAINT "WhatsappOutbox_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
