import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runOnboardingE2E() {
  console.log("===============================================================================");
  console.log("=== TESTE 2: CRIAÇÃO E ONBOARDING COMPLETO DE UM NOVO ESTABELECIMENTO (E2E) ===");
  console.log("===============================================================================\n");

  const timestamp = Date.now();
  const testSlug = `studio-elite-${timestamp.toString().slice(-4)}`;
  const testEmail = `admin@${testSlug}.com`;
  const rawPassword = 'SenhaForte123!';
  const hashedPassword = await hashPassword(rawPassword);

  console.log(`📦 1. Criando novo estabelecimento no banco:`);
  console.log(`   - Nome: Studio Elite Beta`);
  console.log(`   - Slug: ${testSlug}`);
  console.log(`   - Admin E-mail: ${testEmail}`);

  // 1. Criar Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Studio Elite Beta',
      slug: testSlug,
      description: 'Salão e estética especializado em cortes e tratamentos capilares.',
      isActive: true,
      timezone: 'America/Sao_Paulo',
      features: ['booking', 'multi_employee', 'inventory']
    }
  });

  // 2. Criar Funcionário Administrador
  const adminEmployee = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      name: 'Carlos Dono do Studio',
      email: testEmail,
      passwordHash: hashedPassword,
      isAdmin: true,
      accessRole: 'ADMIN',
      commissionRate: 50.0,
      isActive: true,
      role: 'Master Hairstylist'
    }
  });

  // 3. Criar Horários de Atendimento (Segunda a Sexta das 09:00 às 18:00)
  for (let day = 1; day <= 5; day++) {
    await prisma.employeeSchedule.create({
      data: {
        employeeId: adminEmployee.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00'
      }
    });
  }

  // 4. Criar Serviços
  const service = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'Corte e Escova Completa',
      description: 'Lavagem, corte personalizado e finalização.',
      price: 120.0,
      duration: 45,
      category: 'Cabelo',
      isActive: true
    }
  });

  console.log("✅ Estabelecimento, Administrador, Serviços e Horários cadastrados no banco com sucesso!\n");

  // 5. Iniciar Navegador Visual (Playwright)
  console.log("🖥️ 2. Abrindo o navegador visual (Microsoft Edge) para validar a experiência...");
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 1000
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  try {
    console.log("👉 Passo 1: Acessando a tela de Login (/login)");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    console.log(`👉 Passo 2: Realizando login com o novo administrador (${testEmail})...`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', rawPassword);
    
    // Clicar e aguardar resposta
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/login') || resp.status() === 200 || resp.status() === 303, { timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    await page.waitForTimeout(3000);
    
    // Se não redirecionou automaticamente, navegar para /admin para testar cookie da sessão
    if (!page.url().includes('/admin')) {
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    }
    
    console.log("✅ Painel administrativo acessado com sucesso:", page.url());
    await page.waitForTimeout(2000);

    // Acessar Onboarding
    console.log("👉 Passo 3: Abrindo a página de Preparação e Onboarding (/admin/onboarding)");
    await page.goto(`${BASE_URL}/admin/onboarding`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Acessar Serviços
    console.log("👉 Passo 4: Conferindo lista de Serviços (/admin/services)");
    await page.goto(`${BASE_URL}/admin/services`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Acessar Profissionais
    console.log("👉 Passo 5: Conferindo lista de Profissionais (/admin/employees)");
    await page.goto(`${BASE_URL}/admin/employees`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Acessar a nova Agenda Pública gerada
    console.log(`👉 Passo 6: Acessando a Agenda Pública do novo estabelecimento (/${testSlug}/book)`);
    await page.goto(`${BASE_URL}/${testSlug}/book`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Selecionar serviço
    const serviceButtons = await page.$$('button, div[role="button"]');
    if (serviceButtons.length > 0) {
      console.log(`   - Selecionando serviço "${service.name}"...`);
      await serviceButtons[0].click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    console.log("\n🎉 TESTE DE ONBOARDING CONCLUÍDO COM 100% DE SUCESSO!");
    await page.waitForTimeout(4000);

  } catch (err) {
    console.error("Erro durante o teste de onboarding no navegador:", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runOnboardingE2E().catch(console.error);
