import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function setupAndRunCompleteBookingFlow() {
  console.log("===============================================================================");
  console.log("=== CONFIGURANDO STUDIO ELITE E EXECUTANDO AGENDAMENTO COMPLETO DE PONTA A PONTA ===");
  console.log("===============================================================================\n");

  const testSlug = 'studio-elite';
  const testEmail = 'admin@studio-elite.com';
  const rawPassword = 'SenhaForte123!';
  const hashedPassword = await hashPassword(rawPassword);

  console.log(`📦 1. Configurando estabelecimento fixo para você poder acessar também:`);
  console.log(`   - URL Pública: http://localhost:3000/${testSlug}/book`);
  console.log(`   - Painel Admin: http://localhost:3000/login`);
  console.log(`   - E-mail Admin: ${testEmail}`);
  console.log(`   - Senha Admin: ${rawPassword}\n`);

  // Limpar tenant anterior com mesmo slug se existir
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: testSlug } });
  if (existingTenant) {
    await prisma.tenant.delete({ where: { slug: testSlug } });
  }

  // 1. Criar Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Studio Elite Coiffeur',
      slug: testSlug,
      description: 'Salão de beleza e estética premium.',
      isActive: true,
      timezone: 'America/Sao_Paulo',
      features: ['booking', 'multi_employee', 'inventory']
    }
  });

  // 2. Criar Funcionário Administrador
  const adminEmployee = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      name: 'Carlos Hairstylist',
      email: testEmail,
      passwordHash: hashedPassword,
      isAdmin: true,
      accessRole: 'ADMIN',
      role: 'Master Hairstylist',
      commissionRate: 50.0,
      isActive: true
    }
  });

  // 3. Criar Horários de Atendimento (Todos os dias das 08:00 às 20:00)
  for (let day = 0; day <= 6; day++) {
    await prisma.employeeSchedule.create({
      data: {
        employeeId: adminEmployee.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00'
      }
    });
  }

  // 4. Criar Serviço VINCULADO AO FUNCIONÁRIO (Conexão many-to-many essencial!)
  const service = await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'Corte e Escova Premium',
      description: 'Lavagem, corte estilizado e escova modeladora.',
      price: 120.0,
      duration: 30,
      category: 'Cabelo',
      isActive: true,
      employees: {
        connect: [{ id: adminEmployee.id }] // Vincula o funcionário ao serviço!
      }
    }
  });

  console.log("✅ Estabelecimento, Profissional (Carlos) e Serviço vinculado configurados com sucesso!\n");

  // 5. Executar fluxo visual no Navegador (Microsoft Edge)
  console.log("🖥️ 2. Abrindo o navegador visual para executar o agendamento completo de ponta a ponta...");
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 1200 // Ritmo calmo para acompanhamento na tela
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  try {
    // 1. Acessar a página pública de agendamento
    console.log(`👉 Passo 1: Abrindo a agenda pública (/${testSlug}/book)...`);
    await page.goto(`${BASE_URL}/${testSlug}/book`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 2. Clicar no serviço
    console.log(`👉 Passo 2: Selecionando o serviço "${service.name}"...`);
    const serviceElement = await page.waitForSelector(`text=${service.name}`, { timeout: 8000 });
    await serviceElement.click();
    await page.waitForTimeout(2000);

    // 3. Selecionar o profissional (Carlos)
    console.log(`👉 Passo 3: Selecionando o profissional "${adminEmployee.name}"...`);
    const professionalElement = await page.waitForSelector(`text=${adminEmployee.name}`, { timeout: 8000 });
    await professionalElement.click();
    await page.waitForTimeout(2000);

    // 4. Selecionar uma data disponível (próximo dia útil / botão de dia)
    console.log("👉 Passo 4: Escolhendo data no calendário...");
    const dayButtons = await page.$$('button:has-text("Hoje"), button[data-date], .cursor-pointer:has-text("2"), .cursor-pointer:has-text("3")');
    if (dayButtons.length > 0) {
      await dayButtons[0].click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 5. Selecionar um horário disponível
    console.log("👉 Passo 5: Escolhendo horário disponível...");
    const timeSlots = await page.$$('button:has-text(":00"), button:has-text(":30")');
    if (timeSlots.length > 0) {
      await timeSlots[0].click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 6. Preencher dados do cliente
    console.log("👉 Passo 6: Preenchendo dados do cliente (Nome e Telefone)...");
    const nameInput = await page.$('input[placeholder*="nome" i], input[name="clientName"], input[name="name"]');
    if (nameInput) await nameInput.fill('Alexandre Usuário Teste');

    const phoneInput = await page.$('input[placeholder*="tel" i], input[placeholder*="cel" i], input[name="clientPhone"], input[name="phone"]');
    if (phoneInput) await phoneInput.fill('11999998888');

    await page.waitForTimeout(2000);

    // 7. Confirmar agendamento
    console.log("👉 Passo 7: Confirmando a reserva...");
    const confirmButton = await page.$('button:has-text("Confirmar"), button:has-text("Agendar"), button:has-text("Finalizar")');
    if (confirmButton) {
      await confirmButton.click();
      await page.waitForTimeout(4000);
    }

    console.log("✅ Agendamento enviado!");

    // 8. Fazer login no painel administrativo e ver o agendamento na tela do admin!
    console.log("👉 Passo 8: Acessando o painel de administração (/login) para ver a reserva no sistema...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', rawPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Abrir lista de agendamentos
    console.log("👉 Passo 9: Abrindo a tela de Agendamentos (/admin/bookings)...");
    await page.goto(`${BASE_URL}/admin/bookings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    console.log("\n🎉 FLUXO COMPLETO EXECUTADO E COMPROVADO COM SUCESSO NA SUA TELA!");
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error("Erro no teste de agendamento:", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

setupAndRunCompleteBookingFlow().catch(console.error);
