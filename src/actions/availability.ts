"use server";

import prisma from "@/lib/prisma";

/**
 * Função utilitária para converter "HH:MM" em minutos desde a meia-noite
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Função utilitária para formatar minutos desde a meia-noite em "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function getAvailableSlots(
  employeeId: string, 
  dateStr: string, // formato "YYYY-MM-DD"
  serviceDuration: number, // em minutos
  tx?: any
) {
  const client = (tx || prisma) as typeof prisma;

  // 1. Descobrir o dia da semana da data solicitada
  // No JavaScript, getDay() de uma string UTC pode bugar por fuso horário.
  // Vamos forçar o parse correto. "2026-06-25T12:00:00" garante o dia local.
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Dom, 1 = Seg...

  // 2. Buscar a agenda padrão do funcionário para este dia da semana
  const schedules = await client.employeeSchedule.findMany({
    where: { employeeId, dayOfWeek }
  });

  if (schedules.length === 0) {
    return []; // Não trabalha neste dia
  }

  // 3. Buscar os agendamentos já confirmados/pendentes para esse dia
  // dateStr é "YYYY-MM-DD". Precisamos buscar agendamentos nesse intervalo de 24h.
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const bookings = await client.booking.findMany({
    where: {
      employeeId,
      status: { not: 'CANCELLED' },
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      service: true // para saber a duração dos serviços já marcados
    }
  });

  // Mapear os bookings para blocos de minutos ocupados [startMin, endMin]
  const occupiedBlocks = bookings.map(booking => {
    const bDate = new Date(booking.date);
    // Extraímos a hora local (ou UTC se preferirmos consistência, aqui assumiremos que a hora salva já reflete a hora do agendamento)
    // O ideal é usar os métodos UTC se o banco salva em UTC. 
    const startMin = bDate.getUTCHours() * 60 + bDate.getUTCMinutes();
    const endMin = startMin + booking.service.duration;
    return { startMin, endMin };
  });

  // 4. Gerar os slots possíveis baseados nos blocos de agenda livre
  const availableSlots: string[] = [];
  const intervalStep = 15; // Intervalo de 15 em 15 minutos (ex: 09:00, 09:15)

  for (const block of schedules) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    // Iteramos do início ao fim do bloco de 15 em 15 mins
    for (let currentStart = blockStart; currentStart + serviceDuration <= blockEnd; currentStart += intervalStep) {
      const currentEnd = currentStart + serviceDuration;

      // Verifica se este slot entra em conflito com algum bloco ocupado
      const hasConflict = occupiedBlocks.some(occupied => {
        // Lógica de interseção de intervalos de tempo:
        // Ocorre conflito se o slot proposto começar antes de terminar o ocupado,
        // E terminar depois de começar o ocupado.
        return (currentStart < occupied.endMin) && (currentEnd > occupied.startMin);
      });

      // Bônus: Não permitir agendar no passado (se for o dia de hoje)
      const now = new Date();
      const isPast = false;
      if (dateStr === now.toISOString().split('T')[0]) {
        // Aqui precisaria comparar o currentStart com a hora/minuto atual
        // Para simplificar o MVP, não bloquearemos rigorosamente fuso horário, 
        // mas é uma melhoria futura.
      }

      if (!hasConflict && !isPast) {
        availableSlots.push(minutesToTime(currentStart));
      }
    }
  }

  // Ordena os slots do menor para o maior e remove duplicatas (caso haja blocos sobrepostos acidentalmente)
  const uniqueSortedSlots = Array.from(new Set(availableSlots)).sort();
  
  return uniqueSortedSlots;
}
