import prisma from "@/lib/prisma";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  blockMs?: number;
};

function secondsFromMs(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

export async function assertRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return prisma.$transaction(async (tx) => {
    // Serializa a atualização por chave para que requisições concorrentes não
    // ultrapassem o limite entre a leitura e a escrita do contador.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rate-limit:${key}`}))`;

    const now = new Date();
    const blockMs = options.blockMs ?? options.windowMs;
    const record = await tx.rateLimitState.findUnique({ where: { key } });

    if (record?.blockedUntil && record.blockedUntil.getTime() > now.getTime()) {
      return {
        allowed: false,
        retryAfterSeconds: secondsFromMs(record.blockedUntil.getTime() - now.getTime()),
      };
    }

    const windowExpired =
      !record || now.getTime() - record.windowStart.getTime() >= options.windowMs;

    if (windowExpired) {
      await tx.rateLimitState.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          windowStart: now,
          blockedUntil: null,
        },
        update: {
          count: 1,
          windowStart: now,
          blockedUntil: null,
        },
      });

      return { allowed: true, remaining: options.limit - 1 };
    }

    const nextCount = record.count + 1;
    if (nextCount > options.limit) {
      const blockedUntil = new Date(now.getTime() + blockMs);
      await tx.rateLimitState.update({
        where: { key },
        data: {
          blockedUntil,
        },
      });

      return {
        allowed: false,
        retryAfterSeconds: secondsFromMs(blockMs),
      };
    }

    await tx.rateLimitState.update({
      where: { key },
      data: {
        count: nextCount,
        blockedUntil: null,
      },
    });

    return { allowed: true, remaining: options.limit - nextCount };
  });
}
