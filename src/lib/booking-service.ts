import prisma from "@/lib/prisma";
import { getAvailableSlots } from "@/actions/availability";
import { acquireEmployeeDayLock } from "@/lib/booking-lock";
import { debitSubscriptionCredit } from "@/lib/credit-ledger";
import { enqueueWhatsappMessage } from "@/lib/whatsapp-outbox";
import { scheduleDateTime, type BookingTimeMode } from "@/lib/schedule-time";

export type BookingRequest = { tenantSlug: string; serviceId: string; employeeId: string; dateStr: string; timeStr: string; clientId: string; customerSubscriptionId?: string; notes?: string };

/** Single transactional reservation path used by Server Actions and the public API. */
export async function createBookingForClient(input: BookingRequest) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
  if (!tenant?.isActive) throw new Error("Este estabelecimento está indisponível no momento.");
  const bookingDate = scheduleDateTime(input.dateStr, input.timeStr, tenant.timezone, tenant.bookingTimeMode as BookingTimeMode);
  if (Number.isNaN(bookingDate.getTime()) || bookingDate.getTime() <= Date.now()) throw new Error("Data ou horário inválidos.");

  return prisma.$transaction(async (tx) => {
    await acquireEmployeeDayLock(tx, `booking:${tenant.id}:${input.employeeId}:${input.dateStr}`);
    const [service, employee, client] = await Promise.all([
      tx.service.findFirst({ where: { id: input.serviceId, tenantId: tenant.id, isActive: true } }),
      tx.employee.findFirst({ where: { id: input.employeeId, tenantId: tenant.id, isActive: true }, include: { services: { select: { id: true } } } }),
      tx.client.findUnique({ where: { id: input.clientId } }),
    ]);
    if (!service) throw new Error("Serviço inválido para este estabelecimento.");
    if (!employee || !employee.services.some((item) => item.id === service.id)) throw new Error("Este profissional não atende o serviço selecionado.");
    if (!client) throw new Error("Cliente não encontrado.");
    if (!(await getAvailableSlots(employee.id, input.dateStr, service.duration, tx)).includes(input.timeStr)) throw new Error("O horário selecionado não está mais disponível.");
    const subscription = input.customerSubscriptionId ? await tx.customerSubscription.findFirst({ where: { id: input.customerSubscriptionId, tenantId: tenant.id, clientId: client.id, status: "ACTIVE", startDate: { lte: bookingDate }, endDate: { gte: bookingDate }, remainingSlots: { gt: 0 } }, select: { id: true } }) : null;
    if (input.customerSubscriptionId && !subscription) throw new Error("A assinatura informada está inválida ou sem créditos.");
    const booking = await tx.booking.create({ data: { date: bookingDate, notes: input.notes || null, status: "CONFIRMED", tenantId: tenant.id, serviceId: service.id, employeeId: employee.id, clientId: client.id, customerSubscriptionId: subscription?.id ?? null, servicePrice: service.price, serviceDuration: service.duration, commissionRate: employee.commissionRate } });
    if (subscription) await debitSubscriptionCredit(tx, subscription.id, booking.id, { tenantId: tenant.id, clientId: client.id, status: "ACTIVE", startDate: { lte: bookingDate }, endDate: { gte: bookingDate } });
    await enqueueWhatsappMessage(tx, { tenantId: tenant.id, eventKey: `booking:${booking.id}:confirmation`, bookingId: booking.id, recipient: client.phone, type: "CONFIRMATION", data: { clientName: client.name, serviceName: service.name, employeeName: employee.name, dateStr: input.dateStr.split("-").reverse().join("/"), timeStr: input.timeStr } });
    return { bookingId: booking.id, bookingDate, serviceName: service.name, employeeName: employee.name, clientName: client.name, clientPhone: client.phone };
  });
}
