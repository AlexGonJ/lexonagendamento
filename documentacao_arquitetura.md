# Plano de Implementação e Arquitetura do MVP (SaaS Agendamento)

Este documento contém os dados de implementação estruturados para o SaaS de Agendamento Inteligente com CRM, Automações e Integração WhatsApp.

## 1. Dúvidas e Decisões de Negócio

### Fluxo do Cliente Final (Agendamento sem atrito)
Para barbearias, clínicas, etc., **a conversão é tudo**. Quanto menos passos, melhor.
- **Não vamos exigir email nem senha do cliente final.**
- **Como será:** O cliente acessa o link, escolhe o serviço, profissional, data/hora e preenche apenas **Nome e Celular**.
- **Autenticação OTP:** Para evitar spam/fakes, disparamos um código de 6 dígitos via SMS ou WhatsApp para o celular dele. Ele digita o código e o agendamento é confirmado. A conta dele agora está vinculada a esse telefone.
- **Retorno:** Nas próximas vezes, se ele quiser ver o histórico ou desmarcar, ele digita o celular, recebe o código (OTP) e entra na sua "área do cliente". Sem complicação.

### Integração Global com Google Calendar
- **Para o Profissional (Barbeiro, Esteticista, etc.):** Dentro da plataforma (no painel do funcionário), haverá um botão "Sincronizar com Google Calendar". Usaremos OAuth 2.0. O sistema guarda o *Refresh Token* do barbeiro e, sempre que cair um agendamento no sistema, enviamos via API diretamente para a agenda Google dele.
- **Para o Cliente Final:** Não faz sentido pedir permissão OAuth para o cliente final. O que faremos é: após a tela de sucesso do agendamento, exibimos um botão **"Adicionar ao meu Calendário"**. Esse botão apenas gera um link formatado (ex: `https://calendar.google.com/calendar/render?action=TEMPLATE...`), e ao clicar, o próprio Google abre com os dados preenchidos para ele salvar. Rápido e prático.

### Autenticação (Supabase Auth vs Auth.js)
**Vamos usar o Supabase Auth.** Como você já sugeriu o Supabase para o banco de dados (PostgreSQL), usar o Supabase Auth faz **total sentido**. Ele é mais robusto, lida nativamente com o envio de OTP via SMS/Email (se integrarmos um provedor de SMS como Twilio), possui provedores OAuth nativos (Login com Google para os funcionários) e já nos dá RLS (Row Level Security) nativo no banco para segurança do multi-tenant.

### Automações de WhatsApp Inclusas no MVP
Para o MVP, a automação será focada no ciclo de vida essencial do atendimento para reduzir faltas (No-Show):
1. **Confirmação Imediata:** Assim que marcar, envia: *"Olá [Nome], seu agendamento para [Serviço] no dia [Data] às [Hora] foi confirmado!"*
2. **Lembrete (24h ou 2h antes):** O sistema roda um Job automático e envia: *"Olá [Nome], passando para lembrar do seu horário de [Serviço] amanhã às [Hora]. Pode confirmar sua presença?"*
3. **Cancelamento:** Se o profissional cancelar no painel, avisa: *"Infelizmente seu agendamento de [Data] foi cancelado. Acesse [Link] para remarcar."*
*(Fluxos de aniversário, pós-venda, etc., ficarão para a V2).*

## 2. Escopo do MVP Atualizado

- **Autenticação:** Supabase Auth (Email/Senha ou Google para donos/profissionais; Celular + OTP para clientes).
- **Dashboard (Painel do Profissional/Dono):** 
  - Visão geral rápida: Faturamento previsto do dia, Quantidade de Atendimentos.
  - Calendário visual interativo (visão diária/semanal).
  - Lista de próximos agendamentos.
- **Gestão:** Cadastro de Colaboradores, Serviços, Configurações de Empresa.
- **Agenda Core:** Sistema de marcação (interface pública para cliente), cancelamento, aprovação.
- **Integração WhatsApp:** API Cloud Meta integrada com filas (Trigger.dev) para confirmação/lembrete.

## 3. Infraestrutura e Alocação (Onde tudo vai ficar)

A infraestrutura foi pensada para ser escalável (aguentar milhares de acessos) mas com um custo **extremamente baixo** inicial.

| Parte do Sistema | Tecnologia | Onde será Hospedado |
| :--- | :--- | :--- |
| **Frontend & Backend (API Routes)** | Next.js 15 (App Router) | **Vercel** (Deploy contínuo, CDN global) |
| **Banco de Dados (PostgreSQL)** | Prisma ORM + PostgreSQL | **Supabase** |
| **Autenticação** | Supabase Auth | **Supabase** |
| **Jobs / Automações em Backgroud** | Trigger.dev (ou Inngest) | **Trigger.dev Cloud** (Lida com atrasos, filas e cron jobs sem travar o app Vercel) |
| **Mensageria WhatsApp** | Meta Cloud API Oficial | Direto com a Meta (Facebook), pagando apenas as taxas padrão da Meta (algumas mensagens de serviço são gratuitas até um limite) |
| **Disparo de SMS (OTP Clientes)** | Twilio ou Zenvia | Integrado ao Supabase Auth |
