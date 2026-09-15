"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "./auth";

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
