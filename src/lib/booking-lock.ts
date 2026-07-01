export async function acquireEmployeeDayLock(
  executor: { $executeRawUnsafe: (query: string, ...values: string[]) => Promise<unknown> },
  lockKey: string
) {
  await executor.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    lockKey
  );
}
