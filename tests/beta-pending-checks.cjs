// Integration checks against the real scheduling functions and configured Postgres.
// Creates only UUID-scoped fixtures with messaging disabled, then removes them.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = function (module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};
const prisma = require('../src/lib/prisma.ts').default;
const { createBookingForClient } = require('../src/lib/booking-service.ts');
const { getAvailableSlots } = require('../src/actions/availability.ts');
const { scheduleDateTime, formatScheduleTime } = require('../src/lib/schedule-time.ts');
const { assertRateLimit } = require('../src/lib/rate-limit.ts');
const runId = randomUUID();
const results = [];
const tenantIds = [];
let clientId;
const rateKey = `beta-check:${runId}:rate`;
async function check(id, action) {
  try { const details = await action(); results.push({ id, status: 'PASSED', details }); }
  catch (error) { results.push({ id, status: 'FAILED', details: error.message }); }
  console.log(JSON.stringify(results.at(-1)));
}

(async () => {
  try {
    for (const mode of ['IANA_UTC', 'LEGACY_UTC_WALL']) {
      const tenant = await prisma.tenant.create({ data: {
        slug: `beta-check-${runId}-${mode.toLowerCase()}`, name: `TESTE TEMPORARIO ${runId}`,
        features: [], whatsappEnabled: false, whatsappConfirmEnabled: false,
        whatsappReminderEnabled: false, whatsappInactiveEnabled: false,
        bookingTimeMode: mode, timezone: 'America/Sao_Paulo',
      } });
      tenantIds.push(tenant.id);
      const service = await prisma.service.create({ data: { tenantId: tenant.id, name: 'TESTE 30 min', category: 'TESTE', duration: 30, price: 59 } });
      const employee = await prisma.employee.create({ data: { tenantId: tenant.id, name: 'TESTE SEM LOGIN', role: 'TESTE', services: { connect: { id: service.id } }, schedules: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })) } } });
      if (!clientId) clientId = (await prisma.client.create({ data: { name: 'TESTE SEM ENVIO', phone: `beta-test-${runId}` } })).id;
      const dateStr = '2030-01-15';
      const local = (day, time) => scheduleDateTime(day, time, tenant.timezone, mode);
      const input = { tenantSlug: tenant.slug, serviceId: service.id, employeeId: employee.id, dateStr, timeStr: '13:00', clientId };
      await prisma.employeeAvailabilityBlock.create({ data: { employeeId: employee.id, startAt: local(dateStr, '12:00'), endAt: local(dateStr, '13:00'), reason: 'TESTE' } });
      await check(`${mode}:past`, async () => { await assert.rejects(createBookingForClient({ ...input, dateStr: '2000-01-15' }), /Data ou horário inválidos/); return 'Servidor rejeitou passado.'; });
      await check(`${mode}:outside-hours`, async () => { await assert.rejects(createBookingForClient({ ...input, timeStr: '18:00' }), /não está mais disponível/); return 'Servidor rejeitou fora do expediente.'; });
      await check(`${mode}:blocked`, async () => { await assert.rejects(createBookingForClient({ ...input, timeStr: '12:00' }), /não está mais disponível/); return 'Servidor rejeitou bloqueio no mesmo dia.'; });
      await check(`${mode}:stored-and-message-time`, async () => {
        const created = await createBookingForClient(input);
        const row = await prisma.booking.findUniqueOrThrow({ where: { id: created.bookingId } });
        const queued = await prisma.whatsappOutbox.findUniqueOrThrow({ where: { eventKey: `booking:${row.id}:confirmation` } });
        assert.equal(formatScheduleTime(row.date, tenant.timezone, mode), '13:00');
        assert.equal(queued.payload.data.timeStr, '13:00');
        assert.equal(row.date.toISOString(), mode === 'IANA_UTC' ? '2030-01-15T16:00:00.000Z' : '2030-01-15T13:00:00.000Z');
        return { stored: row.date.toISOString(), display: '13:00', queuedMessage: '13:00', externalMessageSent: false };
      });
      await check(`${mode}:occupied`, async () => { await assert.rejects(createBookingForClient(input), /não está mais disponível/); return 'Servidor rejeitou horário ocupado.'; });
      await check(`${mode}:concurrent`, async () => {
        const pair = await Promise.allSettled([createBookingForClient({ ...input, timeStr: '14:00' }), createBookingForClient({ ...input, timeStr: '14:00' })]);
        assert.equal(pair.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(await prisma.booking.count({ where: { tenantId: tenant.id, date: local(dateStr, '14:00') } }), 1);
        assert.match(pair.find(r => r.status === 'rejected').reason.message, /não está mais disponível/);
        return 'Duas chamadas reais concorrentes; exatamente uma reserva persistida.';
      });
      await check(`${mode}:previous-day-block`, async () => {
        const block = await prisma.employeeAvailabilityBlock.create({ data: { employeeId: employee.id, startAt: local('2030-01-14', '16:00'), endAt: local(dateStr, '10:00'), reason: 'TESTE CRUZA MEIA-NOITE' } });
        try { const slots = await getAvailableSlots(employee.id, dateStr, 30); assert.equal(slots.includes('09:00'), false, '09:00 foi oferecido apesar do bloqueio terminar às 10:00'); return 'Bloqueio entre dias respeitado.'; }
        finally { await prisma.employeeAvailabilityBlock.delete({ where: { id: block.id } }); }
      });
    }
    await check('rate-limit-concurrency-helper', async () => {
      const attempts = await Promise.all(Array.from({ length: 6 }, () => assertRateLimit(rateKey, { limit: 5, windowMs: 300000, blockMs: 1800000 })));
      assert.equal(attempts.filter(r => r.allowed).length, 5);
      assert.equal((await assertRateLimit(rateKey, { limit: 5, windowMs: 300000, blockMs: 1800000 })).allowed, false);
      return 'Helper real/Postgres: 6 chamadas concorrentes, 5 aceitas; próxima bloqueada. Não substitui teste dos endpoints login/OTP.';
    });
  } catch (error) {
    results.push({ id: 'runner', status: 'FAILED', details: error.message });
  } finally {
    try {
      for (const id of tenantIds) await prisma.tenant.delete({ where: { id } });
      if (clientId) await prisma.client.delete({ where: { id: clientId } });
      await prisma.rateLimitState.deleteMany({ where: { key: rateKey } });
      results.push({ id: 'cleanup', status: 'PASSED', details: 'Removidos somente fixtures UUID desta execução; nenhum envio externo.' });
    } catch (error) { results.push({ id: 'cleanup', status: 'FAILED', details: error.message, tenantIds, clientId }); }
    await prisma.$disconnect();
    const report = { runId, timestamp: new Date().toISOString(), scope: 'Funções reais e Postgres; não é teste autenticado E2E', results };
    fs.writeFileSync(path.join(root, 'tests', 'beta-pending-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: results.filter(r => r.status === 'PASSED').length, failed: results.filter(r => r.status === 'FAILED').length }));
    process.exitCode = results.some(r => r.status === 'FAILED') ? 1 : 0;
  }
})();
