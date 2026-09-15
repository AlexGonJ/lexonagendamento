"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "./auth";
import { scheduleDateTime, type BookingTimeMode } from "@/lib/schedule-time";

async function assertScheduleAccess(employeeId: string, adminOnly = false) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId: session.tenantId }, select: { id: true } });
  if (!employee || (adminOnly && !session.isAdmin) || (!session.isAdmin && session.userId !== employeeId)) {
    throw new Error("Não autorizado.");
  }
  return session;
}

export async function getEmployeeSchedules(employeeId: string) {
  await assertScheduleAccess(employeeId);
  return await prisma.employeeSchedule.findMany({
    where: { employeeId },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
}

export async function addScheduleBlock(formData: FormData) {
  const employeeId = formData.get("employeeId") as string;
  const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;

  if (!employeeId || isNaN(dayOfWeek) || !startTime || !endTime) {
    throw new Error("Preencha todos os campos corretamente.");
  }

  if (dayOfWeek < 0 || dayOfWeek > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    throw new Error("Informe dia e horários válidos.");
  }
  await assertScheduleAccess(employeeId, true);

  if (startTime >= endTime) {
    throw new Error("O horário de fim deve ser posterior ao horário de início.");
  }

  await prisma.employeeSchedule.create({
    data: {
      employeeId,
      dayOfWeek,
      startTime,
      endTime,
    }
  });

  revalidatePath(`/admin/employees/${employeeId}/schedule`);
  revalidatePath("/brutusbarbearia/book");
}

export async function removeScheduleBlock(scheduleId: string, employeeId: string) {
  await assertScheduleAccess(employeeId, true);
  const schedule = await prisma.employeeSchedule.findFirst({ where: { id: scheduleId, employeeId }, select: { id: true } });
  if (!schedule) throw new Error("Horário não encontrado.");
  await prisma.employeeSchedule.delete({ where: { id: schedule.id } });

  revalidatePath(`/admin/employees/${employeeId}/schedule`);
  revalidatePath("/brutusbarbearia/book");
}

export async function addEmployeeTimeOff(formData: FormData) {
  const employeeId = String(formData.get("employeeId") || "");
  const dateStr = String(formData.get("date") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error("Informe uma data válida.");
  await assertScheduleAccess(employeeId, true);
  await prisma.employeeTimeOff.upsert({ where: { employeeId_date: { employeeId, date: new Date(`${dateStr}T12:00:00.000Z`) } }, create: { employeeId, date: new Date(`${dateStr}T12:00:00.000Z`), reason: reason || null }, update: { reason: reason || null } });
  revalidatePath(`/admin/employees/${employeeId}/schedule`);
}

export async function getEmployeeTimeOff(employeeId: string) {
  await assertScheduleAccess(employeeId);
  return prisma.employeeTimeOff.findMany({ where: { employeeId }, orderBy: { date: "asc" } });
}

export async function removeEmployeeTimeOff(id: string, employeeId: string) {
  await assertScheduleAccess(employeeId, true);
  await prisma.employeeTimeOff.deleteMany({ where: { id, employeeId } });
  revalidatePath(`/admin/employees/${employeeId}/schedule`);
}

export async function addEmployeeAvailabilityBlock(formData: FormData) {
  const employeeId = String(formData.get("employeeId") || "");
  const dateStr = String(formData.get("date") || "");
  const startTime = String(formData.get("startTime") || "");
  const endTime = String(formData.get("endTime") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) throw new Error("Informe uma data e um intervalo de horário válido.");
  const session = await assertScheduleAccess(employeeId, true);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { timezone: true, bookingTimeMode: true } });
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  const mode = tenant.bookingTimeMode as BookingTimeMode;
  await prisma.employeeAvailabilityBlock.create({ data: { employeeId, startAt: scheduleDateTime(dateStr, startTime, tenant.timezone, mode), endAt: scheduleDateTime(dateStr, endTime, tenant.timezone, mode), reason: reason || null } });
  revalidatePath(`/admin/employees/${employeeId}/schedule`);
}

export async function getEmployeeAvailabilityBlocks(employeeId: string) {
  await assertScheduleAccess(employeeId);
  return prisma.employeeAvailabilityBlock.findMany({ where: { employeeId }, orderBy: { startAt: "asc" } });
}

export async function removeEmployeeAvailabilityBlock(id: string, employeeId: string) {
  await assertScheduleAccess(employeeId, true);
  await prisma.employeeAvailabilityBlock.deleteMany({ where: { id, employeeId } });
  revalidatePath(`/admin/employees/${employeeId}/schedule`);
}
