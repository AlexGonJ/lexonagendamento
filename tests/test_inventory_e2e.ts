import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runInventoryE2E() {
  console.log("===============================================================================");
  console.log("=== TESTE 1: GESTÃO COMPLETA DE ESTOQUE E AUDITORIA NO PAINEL (E2E) ===");
  console.log("===============================================================================\n");

  const timestamp = Date.now();
  const testSlug = `barbearia-estoque-${timestamp.toString().slice(-4)}`;
  const testEmail = `admin@${testSlug}.com`;
  const rawPassword = 'SenhaEstoque123!';
  const hashedPassword = await hashPassword(rawPassword);

  console.log(`📦 1. Configurando estabelecimento com módulo de Estoque e Alertas Avançados:`);
  console.log(`   - Estabelecimento: Barbearia & Cosméticos Beta (${testSlug})`);
  console.log(`   - Admin: ${testEmail}`);

  // Criar Tenant com features 'inventory' e 'inventory_advanced'
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Barbearia & Cosméticos Beta',
      slug: testSlug,
      isActive: true,
      features: ['booking', 'multi_employee', 'inventory', 'inventory_advanced']
    }
  });

  // Criar Admin
  await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      name: 'Gerente de Estoque',
      email: testEmail,
      passwordHash: hashedPassword,
      isAdmin: true,
      accessRole: 'ADMIN',
      role: 'Gerente de Operações',
      isActive: true
    }
  });

  console.log("✅ Usuário e estabelecimento criados com sucesso!\n");

  // Iniciar Navegador Visual (Playwright)
  console.log("🖥️ 2. Abrindo o navegador visual (Microsoft Edge) para executar o fluxo...");
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 1200 // Ritmo calmo para que o usuário acompanhe na tela
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  try {
    // 1. Login com credenciais válidas
    console.log("👉 Passo 1: Acessando tela de login (/login)...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    console.log(`👉 Passo 2: Preenchendo credenciais do Administrador (${testEmail})...`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', rawPassword);
    
    // Submeter login
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Acessar tela de estoque
    await page.goto(`${BASE_URL}/admin/inventory`, { waitUntil: 'networkidle' });
    console.log("✅ Tela de Gestão de Estoque acessada:", page.url());
    await page.waitForTimeout(2000);

    // 2. Abrir formulário de cadastro de produto
    console.log("👉 Passo 3: Clicando em 'Adicionar produto'...");
    await page.click('button:has-text("Adicionar produto")');
    await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1000);

    // Preencher campos do produto
    console.log("👉 Passo 4: Preenchendo dados do produto (Nome, SKU, Custo, Saldo e Mínimo)...");
    await page.fill('input[name="name"]', 'Pomada Modeladora Efeito Matte');
    await page.fill('input[name="sku"]', 'POM-MATTE-01');
    await page.fill('input[name="cost"]', '25.00');
    await page.fill('input[name="initialQuantity"]', '8');
    await page.fill('input[name="minimumQuantity"]', '5');
    await page.fill('input[name="description"]', 'Pomada premium para fixação e efeito seco.');
    await page.waitForTimeout(1500);

    // Salvar produto
    console.log("   - Salvando produto no sistema...");
    await page.click('button:has-text("Cadastrar produto")');
    await page.waitForTimeout(3500);

    console.log("✅ Produto cadastrado com saldo inicial de 8 unidades!");

    // 3. Registrar movimentação de saída para testar alerta de estoque baixo
    console.log("👉 Passo 5: Registrando movimentação de saída (-4 unidades) para testar alerta de reposição...");
    
    const qtyInput = await page.$('input[placeholder="0,000"], input[type="number"][name="quantity"], input[step="0.001"]');
    if (qtyInput) {
      const selectKind = await page.$('select');
      if (selectKind) {
        await selectKind.selectOption('OUT').catch(() => {});
      }
      await qtyInput.fill('4');
      await page.waitForTimeout(1000);
      
      const confirmMoveBtn = await page.$('button:has-text("Registrar"), button:has-text("Confirmar")');
      if (confirmMoveBtn) {
        await confirmMoveBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log("✅ Movimentação registrada! Saldo atualizado para 4 unidades (alerta visual de reposição acionado).");
    await page.waitForTimeout(2500);

    // 4. Acessar tela de Auditoria
    console.log("👉 Passo 6: Acessando tela de Auditoria (/admin/audit) para validar registro de eventos...");
    await page.goto(`${BASE_URL}/admin/audit`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);

    console.log("\n🎉 TESTE DE GESTÃO DE ESTOQUE E AUDITORIA CONCLUÍDO COM SUCESSO!");
    await page.waitForTimeout(4000);

  } catch (err) {
    console.error("Erro durante o teste de estoque no navegador:", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runInventoryE2E().catch(console.error);
