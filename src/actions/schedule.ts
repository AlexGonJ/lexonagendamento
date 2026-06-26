"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEmployeeSchedules(employeeId: string) {
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
  await prisma.employeeSchedule.delete({
    where: { id: scheduleId }
  });

  revalidatePath(`/admin/employees/${employeeId}/schedule`);
  revalidatePath("/brutusbarbearia/book");
}
