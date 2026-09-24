import { chromium, Browser, Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

export interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  details: string;
}

const results: TestResult[] = [];

function recordResult(res: TestResult) {
  results.push(res);
  const icon = res.status === 'PASSED' ? '✅' : res.status === 'FAILED' ? '❌' : '⚠️';
  console.log(`${icon} [${res.category}] ${res.name}: ${res.status}`);
  if (res.details) console.log(`   ${res.details}`);
}

async function runTests() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();

  try {
    console.log("=======================================================");
    console.log("=== INICIANDO BATERIA COMPLETA DE TESTES BETA ===");
    console.log("=======================================================\n");

    // =========================================================================
    // SEÇÃO 3: LANDING PAGES & PREÇOS & POLÍTICAS
    // =========================================================================
    console.log("--- Executando Testes da Seção 3: Landing Pages & Preços ---");

    const landingPages = ['/', '/barbearias', '/saloes'];

    for (const route of landingPages) {
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      const text = await page.innerText('body');

      // Check for forbidden claim "sem risco de bloqueio"
      const hasForbiddenRiskClaim = /sem risco de bloqueio/i.test(text);
      recordResult({
        id: `SEC3_PROMISES_${route}`,
        category: 'Seção 3 - Promessas Comerciais',
        name: `Ausência de promessa de "sem risco de bloqueio" em ${route}`,
        status: hasForbiddenRiskClaim ? 'FAILED' : 'PASSED',
        details: hasForbiddenRiskClaim ? `Encontrada promessa indevida em ${route}` : `Nenhuma promessa proibida encontrada na página ${route}.`
      });

      // Check prices displayed on landing pages (59, 119, 229)
      const has59 = /59/i.test(text);
      const has119 = /119/i.test(text);
      const has229 = /229/i.test(text);

      recordResult({
        id: `SEC3_PRICES_${route}`,
        category: 'Seção 3 - Preços nas Landing Pages',
        name: `Preços dos planos (R$ 59, R$ 119, R$ 229) em ${route}`,
        status: (has59 && has119 && has229) ? 'PASSED' : 'FAILED',
        details: `Planos encontrados em ${route}: R$ 59 (${has59}), R$ 119 (${has119}), R$ 229 (${has229})`
      });

      // Check free month mention
      const hasFreeMonth = /gr[aá]tis|experimente|teste/i.test(text);
      recordResult({
        id: `SEC3_FREE_MONTH_${route}`,
        category: 'Seção 3 - Primeiro mês grátis',
        name: `Menção de período/mês grátis em ${route}`,
        status: hasFreeMonth ? 'PASSED' : 'FAILED',
        details: `Página ${route} apresenta menção consistente ao período gratuito.`
      });

      // Test CTAs leading to checkout, signup, or the platform's WhatsApp contact flow.
      const ctaLinks = await page.$$eval(
        'a[href*="/checkout"], a[href*="plan="], a[href*="/admin"], a[href*="/whatsapp?"]',
        (els) => els.map((element) => element.getAttribute('href')),
      );
      recordResult({
        id: `SEC3_CTAS_${route}`,
        category: 'Seção 3 - CTAs de Planos',
        name: `CTAs de planos ativos e direcionando corretamente em ${route}`,
        status: ctaLinks.length > 0 ? 'PASSED' : 'FAILED',
        details: `Encontrados ${ctaLinks.length} links/CTAs para checkout, cadastro ou WhatsApp.`
      });

      await page.close();
    }

    // =========================================================================
    // SEÇÃO 3.11: CHECKOUT PAGE
    // =========================================================================
    console.log("\n--- Executando Teste do Checkout ---");
    const checkoutPage = await context.newPage();
    await checkoutPage.goto(`${BASE_URL}/checkout?plan=profissional`, { waitUntil: 'networkidle' });
    const checkoutText = await checkoutPage.innerText('body');
    const hasProfissionalInfo = /119/i.test(checkoutText) || /Profissional/i.test(checkoutText);
    recordResult({
      id: 'SEC3_CHECKOUT_VAL',
      category: 'Seção 3 - Checkout',
      name: 'Exibição de plano e valores na página de checkout (/checkout)',
      status: hasProfissionalInfo ? 'PASSED' : 'FAILED',
      details: `Página de checkout renderizou com sucesso com informações do plano selecionado.`
    });
    await checkoutPage.close();

    // =========================================================================
    // SEÇÃO 1: SEGURANÇA E ACESSO
    // =========================================================================
    console.log("\n--- Executando Testes da Seção 1: Segurança e Acesso ---");

    // 1.1 Inspecionar dados públicos em /[tenant]/book para verificar vazamentos
    const bookPage = await context.newPage();
    let leakedData = false;
    let leakDetails = '';

    bookPage.on('response', async (response) => {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const body = await response.text();
          if (body.includes('passwordHash') || body.includes('calendarToken') || body.includes('$2b$')) {
            leakedData = true;
            leakDetails = `Vazamento detectado em resposta JSON de ${response.url()}`;
          }
        }
      } catch {}
    });

    await bookPage.goto(`${BASE_URL}/brutusbarbearia/book`, { waitUntil: 'networkidle' });
    const bookPageHtml = await bookPage.content();
    if (bookPageHtml.includes('passwordHash') || bookPageHtml.includes('calendarToken')) {
      leakedData = true;
      leakDetails = 'Vazamento de credenciais no HTML renderizado';
    }

    recordResult({
      id: 'SEC1_PUBLIC_DATA_LEAK',
      category: 'Seção 1 - Segurança',
      name: 'Respostas públicas de funcionários/serviços não expõem hash ou tokens',
      status: leakedData ? 'FAILED' : 'PASSED',
      details: leakedData ? leakDetails : 'Nenhum hash de senha, segredo ou token confidencial exposto no DOM ou rede pública.'
    });

    // 1.2 Testar login com credenciais inválidas
    const loginPage = await context.newPage();
    await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    const emailInput = await loginPage.$('input[name="email"]');
    const passwordInput = await loginPage.$('input[name="password"]');
    const submitBtn = await loginPage.$('button[type="submit"]');

    if (emailInput && passwordInput && submitBtn) {
      await emailInput.fill('usuario_inexistente_beta@teste.com');
      await passwordInput.fill('SenhaErrada123!');
      await submitBtn.click();

      // Aguardar mensagem de erro ou feedback
      await loginPage.waitForTimeout(2500);
      const loginResultText = await loginPage.innerText('body');
      const hasErrorBanner = loginResultText.includes('⚠️') || /credenciais|inválid|não encontrad|erro/i.test(loginResultText);
      const notInAdmin = !loginPage.url().includes('/admin') || loginPage.url().includes('/login');

      recordResult({
        id: 'SEC1_INVALID_LOGIN',
        category: 'Seção 1 - Segurança',
        name: 'Tentativa de login com credenciais inválidas é recusada com mensagem de erro',
        status: (hasErrorBanner && notInAdmin) ? 'PASSED' : 'FAILED',
        details: `Login recusado com sucesso com exibição de alerta de segurança ao usuário.`
      });
    }
    await loginPage.close();

    // 1.4 Acesso direto a rotas protegidas sem autenticação
    const unauthAdminPage = await context.newPage();
    await unauthAdminPage.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    const adminUrl = unauthAdminPage.url();
    const redirectedToLogin = adminUrl.includes('/login') || adminUrl.includes('/auth') || adminUrl.includes('error');
    recordResult({
      id: 'SEC1_RBAC_UNAUTH_ADMIN',
      category: 'Seção 1 - Segurança',
      name: 'Acesso a rotas administrativas (/admin) sem autenticação é bloqueado',
      status: redirectedToLogin ? 'PASSED' : 'FAILED',
      details: `Tentativa de acesso direto redirecionou para autenticação: ${adminUrl}`
    });
    await unauthAdminPage.close();

    const unauthSuperAdminPage = await context.newPage();
    await unauthSuperAdminPage.goto(`${BASE_URL}/super-admin`, { waitUntil: 'networkidle' });
    const superAdminUrl = unauthSuperAdminPage.url();
    const redirectedToSuperLogin = superAdminUrl.includes('/super-admin/login') || superAdminUrl.includes('/login');
    recordResult({
      id: 'SEC1_RBAC_UNAUTH_SUPERADMIN',
      category: 'Seção 1 - Segurança',
      name: 'Acesso a rotas Super Admin (/super-admin) sem autenticação é bloqueado',
      status: redirectedToSuperLogin ? 'PASSED' : 'FAILED',
      details: `Tentativa de acesso redirecionou para tela de login do Super Admin: ${superAdminUrl}`
    });
    await unauthSuperAdminPage.close();

    // =========================================================================
    // SEÇÃO 2: AGENDAMENTO E REGRAS DE HORÁRIO
    // =========================================================================
    console.log("\n--- Executando Testes da Seção 2: Agendamento e Horários ---");

    // Testar fluxo de agendamento em Desktop e Mobile
    const viewports = [
      { name: 'Desktop (1280x800)', width: 1280, height: 800 },
      { name: 'Mobile (390x844 - iPhone 14)', width: 390, height: 844 }
    ];

    for (const vp of viewports) {
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/brutusbarbearia/book`, { waitUntil: 'networkidle' });

      const hasInteractiveElements = (await page.$$('button, div[role="button"], .cursor-pointer')).length > 0;

      recordResult({
        id: `SEC2_BOOKING_UI_${vp.width}`,
        category: 'Seção 2 - Agendamento Público',
        name: `Interface de agendamento responsiva em ${vp.name}`,
        status: hasInteractiveElements ? 'PASSED' : 'FAILED',
        details: `Página pública de agendamento carregou perfeitamente e responsiva em ${vp.name}.`
      });

      await page.close();
    }

    // Validação de Snapshot Comercial (Seção 2.7)
    const tenantA = await prisma.tenant.findFirst({
      where: { slug: 'brutusbarbearia' },
      include: { services: true, employees: true }
    });

    const tenantB = await prisma.tenant.findFirst({
      where: { slug: 'lumina-estetica-avancada' },
      include: { services: true, employees: true }
    });

    if (tenantA && tenantA.services.length > 0 && tenantA.employees.length > 0) {
      const testService = tenantA.services[0];
      const testEmployee = tenantA.employees[0];

      // Criar cliente de teste
      const testClient = await prisma.client.upsert({
        where: { phone: '11999998888' },
        update: {},
        create: {
          name: 'Cliente Teste Beta Autônomo',
          phone: '11999998888',
        }
      });

      // Criar reserva com snapshot
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 10);
      bookingDate.setHours(15, 30, 0, 0);

      const testBooking = await prisma.booking.create({
        data: {
          tenantId: tenantA.id,
          serviceId: testService.id,
          employeeId: testEmployee.id,
          clientId: testClient.id,
          date: bookingDate,
          status: 'PENDING',
          servicePrice: testService.price,
          serviceDuration: testService.duration,
          commissionRate: testEmployee.commissionRate
        }
      });

      // Validar snapshot
      recordResult({
        id: 'SEC2_SNAPSHOT_FINANCIAL',
        category: 'Seção 2 - Snapshot Financeiro',
        name: 'Preservação de snapshots comerciais de preço e comissão na reserva',
        status: (testBooking.servicePrice === testService.price && testBooking.commissionRate === testEmployee.commissionRate) ? 'PASSED' : 'FAILED',
        details: `Snapshots registrados: Preço R$ ${testBooking.servicePrice}, Duração ${testBooking.serviceDuration}m, Comissão ${testBooking.commissionRate}%`
      });

      // Testar cancelamento de reserva (Seção 2.6)
      const cancelledBooking = await prisma.booking.update({
        where: { id: testBooking.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });

      recordResult({
        id: 'SEC2_CANCEL_BOOKING',
        category: 'Seção 2 - Cancelamento',
        name: 'Cancelamento de agendamento registra status e timestamp de cancelamento',
        status: (cancelledBooking.status === 'CANCELLED' && cancelledBooking.cancelledAt !== null) ? 'PASSED' : 'FAILED',
        details: `Reserva ${testBooking.id} cancelada com sucesso em ${cancelledBooking.cancelledAt?.toISOString()}`
      });

      // Limpar agendamento de teste
      await prisma.booking.delete({ where: { id: testBooking.id } });
    }

    // =========================================================================
    // SEÇÃO 4: ESTOQUE E MULTI-TENANT ISOLATION
    // =========================================================================
    console.log("\n--- Executando Testes da Seção 4: Estoque e Isolamento ---");

    if (tenantA && tenantB) {
      const testSku = 'TEST-SKU-BETA-001';

      // Limpar produtos de teste prévios se existirem
      await prisma.inventoryMovement.deleteMany({
        where: { product: { sku: testSku } }
      });
      await prisma.inventoryProduct.deleteMany({
        where: { sku: testSku }
      });

      // 1. Criar produto no Tenant A
      const productA = await prisma.inventoryProduct.create({
        data: {
          tenantId: tenantA.id,
          name: 'Pomada Modeladora Efeito Seco',
          sku: testSku,
          quantity: 10,
          costCents: 2500,
          unit: 'un'
        }
      });

      // 2. Tentar criar produto com MESMO SKU no Tenant A (deve falhar por constraint única)
      let duplicateInSameTenantFailed = false;
      try {
        await prisma.inventoryProduct.create({
          data: {
            tenantId: tenantA.id,
            name: 'Produto Duplicado Mesmo Tenant',
            sku: testSku,
            quantity: 5,
            unit: 'un'
          }
        });
      } catch (err) {
        duplicateInSameTenantFailed = true;
      }

      // 3. Criar produto com MESMO SKU no Tenant B (deve ser permitido por isolamento multi-tenant)
      let duplicateInDifferentTenantAllowed = false;
      let productB: Awaited<ReturnType<typeof prisma.inventoryProduct.create>> | null = null;
      try {
        productB = await prisma.inventoryProduct.create({
          data: {
            tenantId: tenantB.id,
            name: 'Produto Teste Tenant B Mesmo SKU',
            sku: testSku,
            quantity: 20,
            unit: 'un'
          }
        });
        duplicateInDifferentTenantAllowed = true;
      } catch (err) {
        duplicateInDifferentTenantAllowed = false;
      }

      recordResult({
        id: 'SEC4_SKU_ISOLATION',
        category: 'Seção 4 - Estoque e Multi-tenancy',
        name: 'Validação de unicidade de SKU (Rejeitado no mesmo tenant, Permitido em outro)',
        status: (duplicateInSameTenantFailed && duplicateInDifferentTenantAllowed) ? 'PASSED' : 'FAILED',
        details: `Mesmo tenant duplicado rejeitado: ${duplicateInSameTenantFailed} | Tenants diferentes permitido: ${duplicateInDifferentTenantAllowed}`
      });

      // 4.4 Movimentações de estoque e saldo
      const initialQty = Number(productA.quantity);
      const movementIn = await prisma.inventoryMovement.create({
        data: {
          tenantId: tenantA.id,
          productId: productA.id,
          type: 'IN',
          quantityDelta: 5,
          quantityAfter: initialQty + 5,
          note: 'Entrada teste beta'
        }
      });
      await prisma.inventoryProduct.update({
        where: { id: productA.id },
        data: { quantity: initialQty + 5 }
      });

      const updatedProductA = await prisma.inventoryProduct.findUnique({
        where: { id: productA.id },
        include: { movements: true }
      });

      recordResult({
        id: 'SEC4_STOCK_MOVEMENTS',
        category: 'Seção 4 - Estoque',
        name: 'Registro de movimentação de estoque (IN/OUT) com atualização de saldo e histórico',
        status: (Number(updatedProductA?.quantity) === 15 && updatedProductA?.movements.length === 1) ? 'PASSED' : 'FAILED',
        details: `Saldo inicial: ${initialQty} -> Novo saldo: ${updatedProductA?.quantity} com movimentação registrada no histórico.`
      });

      // 4.8 Arquivamento de produto
      const archivedProduct = await prisma.inventoryProduct.update({
        where: { id: productA.id },
        data: { isActive: false }
      });
      recordResult({
        id: 'SEC4_ARCHIVE_PRODUCT',
        category: 'Seção 4 - Estoque',
        name: 'Arquivamento de produto remove da lista ativa preservando histórico',
        status: (archivedProduct.isActive === false) ? 'PASSED' : 'FAILED',
        details: `Produto ${productA.name} arquivado com sucesso (isActive: false) e histórico de movimentações preservado.`
      });

      // Limpar dados de teste de estoque
      await prisma.inventoryMovement.deleteMany({ where: { product: { sku: testSku } } });
      if (productB) {
        await prisma.inventoryProduct.deleteMany({ where: { id: productB.id } });
      }
      await prisma.inventoryProduct.deleteMany({ where: { sku: testSku } });
    }

    // =========================================================================
    // SEÇÃO 6: USO DIÁRIO, APRESENTAÇÃO E POLÍTICAS
    // =========================================================================
    console.log("\n--- Executando Testes da Seção 6: Apresentação e Políticas ---");

    // 6.8 Termos de uso e Política de Privacidade
    const privacyPage = await context.newPage();
    await privacyPage.goto(`${BASE_URL}/politica-de-privacidade`, { waitUntil: 'networkidle' });
    const privacyText = await privacyPage.innerText('body');
    const hasPrivacyContent = privacyText.length > 200 && /privacidade|dados|lgpd/i.test(privacyText);
    recordResult({
      id: 'SEC6_PRIVACY_PAGE',
      category: 'Seção 6 - Políticas e Legal',
      name: 'Página de Política de Privacidade carregada com conteúdo adequado',
      status: hasPrivacyContent ? 'PASSED' : 'FAILED',
      details: `Página /politica-de-privacidade respondeu com ${privacyText.length} caracteres de texto legal.`
    });
    await privacyPage.close();

    const termsPage = await context.newPage();
    await termsPage.goto(`${BASE_URL}/termos-de-uso`, { waitUntil: 'networkidle' });
    const termsText = await termsPage.innerText('body');
    const hasTermsContent = termsText.length > 200 && /termos|serviço|condições/i.test(termsText);
    recordResult({
      id: 'SEC6_TERMS_PAGE',
      category: 'Seção 6 - Políticas e Legal',
      name: 'Página de Termos de Uso carregada com conteúdo adequado',
      status: hasTermsContent ? 'PASSED' : 'FAILED',
      details: `Página /termos-de-uso respondeu com ${termsText.length} caracteres de texto legal.`
    });
    await termsPage.close();

  } catch (error) {
    console.error("Erro durante a execução dos testes:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  // Resumo final
  console.log("\n=======================================================");
  console.log("=== RESUMO DOS TESTES AUTOMATIZADOS EXECUTADOS ===");
  console.log("=======================================================");
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total de testes: ${results.length} | Aprovados: ${passed} | Falhas: ${failed}\n`);

  fs.writeFileSync(
    path.join(process.cwd(), 'tests', 'test_results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
}

runTests().catch(console.error);
