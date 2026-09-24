"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { assertImageUpload } from "@/lib/upload-validation";
import { recordAuditEvent } from "@/lib/audit";
import { scheduleDateTime } from "@/lib/schedule-time";

export async function getTenantSettings() {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, description: true, logoUrl: true, coverUrl: true, themeBgColor: true, themeButtonColor: true, timezone: true, minimumLeadMinutes: true, cancellationLeadMinutes: true, bookingTimeMode: true, bookingTimezoneMigratedAt: true, holidays: { orderBy: { date: "asc" } } },
  });

  if (!tenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  return tenant;
}

export async function updateTenantSettings(formData: FormData) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const logoFile = formData.get("logoFile") as File | null;
  const coverFile = formData.get("coverFile") as File | null;
  const timezone = String(formData.get("timezone") || "America/Sao_Paulo");
  const minimumLeadMinutes = Math.max(0, Number(formData.get("minimumLeadMinutes") || 0));
  const cancellationLeadMinutes = Math.max(0, Number(formData.get("cancellationLeadMinutes") || 0));
  if (!Intl.supportedValuesOf("timeZone").includes(timezone) || !Number.isInteger(minimumLeadMinutes) || !Number.isInteger(cancellationLeadMinutes)) throw new Error("Configuração de agenda inválida.");

  if (!name) {
    throw new Error("O nome do estabelecimento é obrigatório.");
  }

  const tenantId = session.tenantId;

  // Busca dados atuais do tenant
  const currentTenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!currentTenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  let logoUrl = currentTenant.logoUrl;
  let coverUrl = currentTenant.coverUrl;

  // Upload de Logo
  if (logoFile && logoFile.size > 0) {
    const ext = await assertImageUpload(logoFile);
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const logoPath = `${tenantId}/settings/logo_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(logoPath, buffer, {
        contentType: logoFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload do logo:", uploadError);
      throw new Error("Erro ao fazer upload do logo.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(logoPath);

    logoUrl = publicUrlData.publicUrl;
  }

  // Upload de Capa/Banner
  if (coverFile && coverFile.size > 0) {
    const ext = await assertImageUpload(coverFile);
    const arrayBuffer = await coverFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const coverPath = `${tenantId}/settings/cover_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(coverPath, buffer, {
        contentType: coverFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload da capa:", uploadError);
      throw new Error("Erro ao fazer upload da imagem de capa.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(coverPath);

    coverUrl = publicUrlData.publicUrl;
  }

  // Atualiza tenant no banco
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      description,
      logoUrl,
      coverUrl,
      timezone,
      minimumLeadMinutes,
      cancellationLeadMinutes,
    }
  });

  await recordAuditEvent({
    tenantId,
    actorId: session.userId,
    actorRole: "ADMIN",
    action: "TENANT_SETTINGS_UPDATED",
    entityType: "TENANT",
    entityId: tenantId,
    metadata: {
      changed: ["name", "description", ...(logoFile?.size ? ["logo"] : []), ...(coverFile?.size ? ["cover"] : [])],
    },
  });

  // Revalida a página inicial do tenant e os agendamentos
  revalidatePath(`/${updatedTenant.slug}`);
  revalidatePath(`/${updatedTenant.slug}/book`);
  revalidatePath(`/admin`);

  return { success: true };
}

export async function addTenantHoliday(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  const dateStr = String(formData.get("date") || "");
  const name = String(formData.get("name") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error("Informe uma data válida.");
  await prisma.tenantHoliday.upsert({ where: { tenantId_date: { tenantId: session.tenantId, date: new Date(`${dateStr}T12:00:00.000Z`) } }, create: { tenantId: session.tenantId, date: new Date(`${dateStr}T12:00:00.000Z`), name: name || null }, update: { name: name || null } });
  revalidatePath("/admin/settings");
}

export async function removeTenantHoliday(id: string) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  await prisma.tenantHoliday.deleteMany({ where: { id, tenantId: session.tenantId } });
  revalidatePath("/admin/settings");
}

/** Preview only: old rows are never shifted automatically when a timezone is changed. */
export async function getTimezoneMigrationPreview() {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { timezone: true, bookingTimeMode: true, bookingTimezoneMigratedAt: true } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  const summary = await prisma.booking.aggregate({ where: { tenantId: session.tenantId }, _count: { id: true }, _min: { date: true }, _max: { date: true } });
  const blockCount = await prisma.employeeAvailabilityBlock.count({ where: { employee: { tenantId: session.tenantId } } });
  return { ...tenant, bookingCount: summary._count.id, blockCount, firstBooking: summary._min.date, lastBooking: summary._max.date };
}

/** Converts legacy wall-clock appointment and availability timestamps after the admin confirms the reviewed row counts. */
export async function migrateTenantBookingTimezone(expectedCounts: { bookingCount: number; blockCount: number }) {
  const session = await getCurrentSession();
  if (!session?.isAdmin) throw new Error("Não autorizado.");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  if (tenant.bookingTimeMode === "IANA_UTC") throw new Error("Os horários deste estabelecimento já foram migrados.");
  const bookings = await prisma.booking.findMany({ where: { tenantId: session.tenantId }, select: { id: true, date: true } });
  const blocks = await prisma.employeeAvailabilityBlock.findMany({ where: { employee: { tenantId: session.tenantId } }, select: { id: true, startAt: true, endAt: true } });
  if (bookings.length !== expectedCounts.bookingCount || blocks.length !== expectedCounts.blockCount) throw new Error("A quantidade de agendamentos ou bloqueios mudou. Revise a prévia antes de migrar.");
  await prisma.$transaction(async (tx) => {
    for (const booking of bookings) {
      const dateStr = `${booking.date.getUTCFullYear()}-${String(booking.date.getUTCMonth() + 1).padStart(2, "0")}-${String(booking.date.getUTCDate()).padStart(2, "0")}`;
      const timeStr = `${String(booking.date.getUTCHours()).padStart(2, "0")}:${String(booking.date.getUTCMinutes()).padStart(2, "0")}`;
      await tx.booking.update({ where: { id: booking.id }, data: { date: scheduleDateTime(dateStr, timeStr, tenant.timezone, "IANA_UTC") } });
    }
    for (const block of blocks) {
      const startDate = scheduleDateTime(
        `${block.startAt.getUTCFullYear()}-${String(block.startAt.getUTCMonth() + 1).padStart(2, "0")}-${String(block.startAt.getUTCDate()).padStart(2, "0")}`,
        `${String(block.startAt.getUTCHours()).padStart(2, "0")}:${String(block.startAt.getUTCMinutes()).padStart(2, "0")}`,
        tenant.timezone,
        "IANA_UTC",
      );
      const endDate = scheduleDateTime(
        `${block.endAt.getUTCFullYear()}-${String(block.endAt.getUTCMonth() + 1).padStart(2, "0")}-${String(block.endAt.getUTCDate()).padStart(2, "0")}`,
        `${String(block.endAt.getUTCHours()).padStart(2, "0")}:${String(block.endAt.getUTCMinutes()).padStart(2, "0")}`,
        tenant.timezone,
        "IANA_UTC",
      );
      await tx.employeeAvailabilityBlock.update({ where: { id: block.id }, data: { startAt: startDate, endAt: endDate } });
    }
    await tx.tenant.update({ where: { id: session.tenantId }, data: { bookingTimeMode: "IANA_UTC", bookingTimezoneMigratedAt: new Date() } });
  });
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "BOOKING_TIMEZONE_MIGRATED", entityType: "TENANT", entityId: session.tenantId, metadata: { bookingCount: bookings.length, blockCount: blocks.length, timezone: tenant.timezone } });
  revalidatePath("/admin"); revalidatePath("/admin/settings");
  return { success: true, migratedBookings: bookings.length, migratedBlocks: blocks.length };
}
