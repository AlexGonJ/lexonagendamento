import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log("===============================================================================");
  console.log("=== INICIANDO SESSÃO DE TESTES INTERATIVOS NO NAVEGADOR VISUAL (PLAYWRIGHT) ===");
  console.log("===============================================================================\n");

  // Launch browser in VISUAL mode (headless: false) on the user's screen!
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    slowMo: 1000 // Slow down actions by 1 second so the user can visually follow every step!
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // ETAPA 1: Demonstração e Teste das Landing Pages e Checkout
    // -------------------------------------------------------------------------
    console.log("👉 Etapa 1: Acessando a Landing Page Principal (/)");
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log("👉 Etapa 2: Acessando a Landing Page de Barbearias (/barbearias)");
    await page.goto(`${BASE_URL}/barbearias`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log("👉 Etapa 3: Acessando a Landing Page de Salões (/saloes)");
    await page.goto(`${BASE_URL}/saloes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log("👉 Etapa 4: Testando o Checkout de Planos (/checkout?plan=profissional)");
    await page.goto(`${BASE_URL}/checkout?plan=profissional`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------------------
    // ETAPA 2: Demonstração do Fluxo de Agendamento Público ao Vivo
    // -------------------------------------------------------------------------
    console.log("👉 Etapa 5: Abrindo o Fluxo Público de Agendamento (/brutusbarbearia/book)");
    await page.goto(`${BASE_URL}/brutusbarbearia/book`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Clicar no primeiro serviço se disponível
    const serviceButtons = await page.$$('button, div[role="button"]');
    if (serviceButtons.length > 0) {
      console.log("   - Selecionando serviço...");
      await serviceButtons[0].click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // -------------------------------------------------------------------------
    // ETAPA 3: Teste da Área Administrativa (/login)
    // -------------------------------------------------------------------------
    console.log("👉 Etapa 6: Acessando a Área de Login Administrativo (/login)");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Testar tentativa com credenciais inválidas na tela
    console.log("   - Testando validação com credenciais inválidas ao vivo...");
    await page.fill('input[name="email"]', 'usuario_teste_errado@lexon.com');
    await page.fill('input[name="password"]', 'SenhaErrada123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------------------
    // ETAPA 4: Teste da Área do Super Admin (/super-admin/login)
    // -------------------------------------------------------------------------
    console.log("👉 Etapa 7: Acessando a Área de Login do Super Admin (/super-admin/login)");
    await page.goto(`${BASE_URL}/super-admin/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log("\n✅ Navegação e testes visuais concluídos com sucesso no navegador aberto!");
    await page.waitForTimeout(4000);

  } catch (error) {
    console.error("Erro durante a execução do navegador interativo:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
