# Lexon Agenda

SaaS multiempresa para gestão de agenda, clientes, profissionais e automações de WhatsApp. Inclui landing pages por nicho, checkout de assinatura e página pública de agendamento por estabelecimento.

## Principais recursos

- Agenda pública por empresa em `/{tenant}/book`.
- Painel administrativo para serviços, profissionais, agenda, CRM e financeiro.
- Autenticação por senha, Google e OTP para clientes.
- Integração de WhatsApp com modos simulador, Evolution e Meta Cloud API.
- Checkout com Mercado Pago e ativação do estabelecimento por webhook.
- Landing pages gerais, para barbearias e para salões.
- Rastreamento Meta Pixel de visitas, início de checkout e contatos pelo WhatsApp.

## Tecnologias

- Next.js 16, React 19 e TypeScript
- Prisma + PostgreSQL/Supabase
- Tailwind CSS e componentes React
- Mercado Pago, Google OAuth, Cloudflare Turnstile e APIs de WhatsApp

## Executar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env.local` com as variáveis necessárias. Nunca versione chaves ou tokens.

   | Variável | Uso |
   | --- | --- |
   | `DATABASE_URL` e `DIRECT_URL` | Banco PostgreSQL/Supabase |
   | `AUTH_SESSION_SECRET` | Assinatura das sessões |
   | `OTP_HASH_SECRET` | Chave HMAC dos códigos OTP; recomendada além do segredo de sessão |
   | `PASSWORD_RESET_SECRET` | Chave HMAC específica para tokens de recuperação de senha |
   | `APP_URL`, `RESEND_API_KEY` e `EMAIL_FROM` | URL pública e envio de e-mails de recuperação de senha |
   | `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login Google (opcional) |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` | Proteção Turnstile (opcional no desenvolvimento) |
   | `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` | Consulta e validação de assinatura do webhook Mercado Pago; obrigatórias em produção |
   | `SUPER_ADMIN_SECRET`, `SUPER_ADMIN_TOTP_SECRET` e `CRON_SECRET` | Acesso administrativo com MFA TOTP e endpoints de cron |

3. Gere o cliente Prisma e aplique as migrações do ambiente:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Inicie o projeto:

   ```bash
   npm run dev
   ```

   Acesse `http://localhost:3000`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run lint` | Executa o ESLint |
| `npm run build` | Gera o cliente Prisma e a build de produção |
| `npm run start` | Inicia a build de produção |

## Rotas principais

| Rota | Finalidade |
| --- | --- |
| `/` | Landing principal |
| `/barbearias` e `/saloes` | Landing pages por nicho |
| `/checkout` | Cadastro e redirecionamento de pagamento |
| `/whatsapp` | Registra o evento de contato e redireciona ao WhatsApp |
| `/{tenant}` | Página pública de um estabelecimento |
| `/{tenant}/book` | Fluxo público de agendamento |
| `/admin` | Painel do estabelecimento |
| `/super-admin` | Administração da plataforma |

## Rastreamento e pagamentos

O Pixel Meta é único para a plataforma. As landing pages são diferenciadas pela URL e pelos parâmetros dos eventos; não crie um Pixel novo para cada landing page. A configuração dos eventos e conversões está em [docs/META_PIXEL.md](docs/META_PIXEL.md).

O pagamento é confirmado pelo webhook em `/api/webhooks/mercadopago`. Para atribuir uma venda confirmada às campanhas da Meta, implemente também a Conversions API nesse webhook.

## Estrutura do projeto

```text
src/app/          Rotas, páginas e endpoints
src/actions/      Server Actions
src/components/   Componentes reutilizáveis e fluxos de interface
src/lib/          Integrações e utilitários
prisma/           Schema e migrações do banco
public/           Imagens e demais ativos estáticos
docs/             Documentação operacional
```

O documento [documentacao_arquitetura.md](documentacao_arquitetura.md) registra decisões e escopo do MVP.
