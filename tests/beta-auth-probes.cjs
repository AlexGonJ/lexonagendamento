const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { encodeReply } = require('next/dist/compiled/react-server-dom-webpack/client.node');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');
const base = 'http://localhost:3000';
const id = randomUUID();
const email = `beta-${id}@example.invalid`;
const phone = `000${id.replace(/[^0-9]/g, '')}00000000000`;
const ip = '192.0.2.241';
const results = [];
async function invoke(name, route, args) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.next/dev/server/server-reference-manifest.json'), 'utf8'));
  const action = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(action, `Action ${name} não registrada`);
  const response = await fetch(`${base}${route}`, { method: 'POST', headers: {
    'Next-Action': action[0], Origin: base, Accept: 'text/x-component', 'x-forwarded-for': ip,
  }, body: await encodeReply(args) });
  const text = await response.text();
  assert.equal(response.headers.get('set-cookie'), null, 'Credencial inválida não pode criar sessão');
  assert.equal(response.status, 200, `Action retornou HTTP ${response.status}`);
  return text;
}
async function check(name, fn) {
  try { results.push({ name, status: 'PASSED', details: await fn() }); }
  catch (error) { results.push({ name, status: 'FAILED', details: error.message }); }
  console.log(JSON.stringify(results.at(-1)));
}
(async () => {
  try {
    assert.equal(await prisma.rateLimitState.count({ where: { key: `login:super-admin:${ip}` } }), 0, 'Chave de teste de Super Admin já existe; não tocar');
    await check('limite-login-funcionario-http', async () => {
      for (let i = 1; i <= 6; i++) {
        const data = new FormData(); data.set('email', email); data.set('password', 'invalid-beta-fixture');
        const response = await invoke('login', '/login', [data]);
        assert.match(response, i <= 5 ? /Credenciais inválidas/ : /Muitas tentativas/);
      }
      return '5 credenciais inválidas; sexta tentativa bloqueada; sem cookie de sessão.';
    });
    await check('limite-superadmin-http', async () => {
      for (let i = 1; i <= 6; i++) {
        const data = new FormData(); data.set('secret', `invalid-${id}`);
        const response = await invoke('superAdminLogin', '/super-admin/login', [data]);
        assert.match(response, i <= 5 ? /Senha incorreta/ : /Muitas tentativas/);
      }
      return '5 senhas inválidas; sexta bloqueada. IP TEST-NET isolado da sessão do usuário.';
    });
    await check('limite-verificacao-otp-http', async () => {
      for (let i = 1; i <= 11; i++) {
        const response = await invoke('verifyClientOtp', '/brutusbarbearia/book', [phone, '000000']);
        assert.match(response, i <= 10 ? /Código inválido ou expirado/ : /Muitas tentativas/);
      }
      return '10 códigos inválidos; décima primeira tentativa bloqueada. Nenhum OTP enviado.';
    });
    for (const route of ['whatsapp-reminders', 'whatsapp-inactive', 'whatsapp-outbox', 'subscription-lifecycle']) {
      await check(`cron-auth-${route}`, async () => {
        for (const headers of [{}, { 'x-cron-secret': `invalid-${id}` }]) {
          const response = await fetch(`${base}/api/cron/${route}`, { headers });
          assert.equal(response.status, 401);
          const body = await response.json(); assert.equal(body.success, false);
        }
        return 'Sem segredo e com segredo inválido: HTTP 401. Job não executado.';
      });
    }
  } catch (error) { results.push({ name: 'runner', status: 'FAILED', details: error.message }); }
  finally {
    await prisma.rateLimitState.deleteMany({ where: { key: { in: [`login:employee:${email}`, `login:super-admin:${ip}`, `otp:verify:phone:${phone}`] } } });
    await prisma.$disconnect();
    fs.writeFileSync(path.join(root, 'tests/beta-auth-results.json'), JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2) + '\n');
    process.exitCode = results.some(r => r.status === 'FAILED') ? 1 : 0;
  }
})();
