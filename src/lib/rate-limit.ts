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
  const now = new Date();
  const blockMs = options.blockMs ?? options.windowMs;
  const record = await prisma.rateLimitState.findUnique({ where: { key } });

  if (record?.blockedUntil && record.blockedUntil.getTime() > now.getTime()) {
    return {
      allowed: false,
      retryAfterSeconds: secondsFromMs(record.blockedUntil.getTime() - now.getTime()),
    };
  }

  const windowExpired =
    !record || now.getTime() - record.windowStart.getTime() >= options.windowMs;

  if (windowExpired) {
    await prisma.rateLimitState.upsert({
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
    await prisma.rateLimitState.update({
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

  await prisma.rateLimitState.update({
    where: { key },
    data: {
      count: nextCount,
      blockedUntil: null,
    },
  });

  return { allowed: true, remaining: options.limit - nextCount };
}

