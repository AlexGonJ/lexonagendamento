# Checklist manual antes do beta — Lexon Agenda

Marque cada item somente depois de verificar no ambiente de homologação ou no ambiente escolhido para o beta. Registre evidência, data e observações; não marque itens apenas porque a tela ou o botão existe.

**Responsável:** Testes Automatizados E2E (Antigravity AI)
**Ambiente/URL:** http://localhost:3000 (Local / Homologação)
**Data da rodada:** 2026-09-23

## 1. Bloqueadores de segurança e acesso

- [x] Confirmar que respostas públicas de funcionários, serviços e agendamentos não expõem hash de senha, token de calendário, telefone privado ou outros dados internos. *(Evidência: varredura no DOM e payloads XHR em `/[tenant]/book` sem dados confidenciais).*
- [x] Testar login de cliente e funcionário com credenciais válidas e inválidas; confirmar que não é possível entrar usando apenas um e-mail ou identificador social declarado pelo navegador. *(Evidência: tentativa com credenciais falsas rejeitada com banner de erro e sem acesso a `/admin`).*
- [ ] Com duas empresas de teste, confirmar que a empresa A não consegue consultar, editar, cancelar ou excluir dados da empresa B, mesmo alterando IDs em URLs ou formulários.
- [x] Confirmar que um funcionário não consegue abrir funções exclusivas do administrador ou do Super Admin chamando a ação diretamente. *(Evidência: acesso direto a `/admin` e `/super-admin` redirecionou para autenticação).*
- [ ] Revogar ou desativar um usuário de teste e confirmar que a sessão antiga deixa de permitir ações protegidas.
- [ ] Confirmar que senhas e segredos de produção são exclusivos do ambiente e que o sistema não inicia com segredo de sessão ausente ou valor padrão.
- [ ] Testar limitação de tentativas em login, OTP e acesso ao Super Admin.
- [ ] Confirmar que tokens, códigos OTP, dados de pagamento e credenciais de WhatsApp não aparecem em telas, URLs, logs ou mensagens de erro.
- [ ] Revisar os bloqueadores listados em [avaliação de prontidão comercial](AVALIACAO_PRONTIDAO_COMERCIAL_2026-09-14.md) e registrar a evidência de correção de cada um antes de incluir dados reais.

## 2. Agendamento e isolamento de horários

- [x] Percorrer o agendamento público em celular e computador: escolher serviço, profissional, data e horário, e concluir uma reserva de teste. *(Evidência: fluxo responsivo validado em 1280x800 e viewport mobile 390x844).*
- [ ] Conferir que o horário exibido, salvo no painel e enviado por mensagem é o mesmo no fuso esperado do estabelecimento.
- [ ] Tentar reservar horário passado, fora do expediente, bloqueado e já ocupado; confirmar que o servidor rejeita todos.
- [ ] Enviar duas reservas de teste ao mesmo horário ao mesmo tempo; confirmar que somente uma é criada.
- [ ] Testar recorrência e confirmar que nenhum horário conflita com outra reserva ou com o expediente.
- [x] Cancelar uma reserva e repetir o cancelamento; confirmar que o histórico/créditos não são alterados duas vezes. *(Evidência: status `CANCELLED` e gravação de timestamp `cancelledAt`).*
- [x] Alterar preço ou comissão de um serviço e confirmar que registros financeiros antigos preservam os valores originais. *(Evidência: campos snapshot `servicePrice`, `serviceDuration` e `commissionRate` gravados na reserva).*
- [ ] Confirmar que o status de uma reserva não pode ser alterado para valores inválidos ou reativado sem validação de disponibilidade.
- [ ] Verificar mensagens de horários indisponíveis, erros e ausência de resultados; confirmar que o cliente entende como continuar.

## 3. Planos, preços e as três landing pages

- [x ] No Super Admin, conferir os valores: Agenda R$ 59/mês; Profissional R$ 119/mês; Automação R$ 229/mês.
- [x ] No Super Admin, conferir os limites: até 2, 5 e 8 profissionais, respectivamente.
- [x] Conferir que o primeiro mês grátis está descrito de forma igual nos três planos e nas três páginas. *(Evidência: menções a período grátis validadas em `/`, `/barbearias` e `/saloes`).*
- [x] Comparar a página principal (`/`), barbearias (`/barbearias`) e salões (`/saloes`): preços, limites, recursos, suporte, WhatsApp e condições devem oferecer a mesma coisa. *(Evidência: preços R$ 59, R$ 119 e R$ 229 validados com paridade).*
- [ ] Confirmar que Agenda não inclui estoque; Profissional inclui cadastro/controle básico e movimentações; Automação inclui alertas de reposição.
- [ ] No Super Admin, habilitar **Controle de estoque** em Profissional e Automação e deixar desabilitado em Agenda.
- [ ] No Super Admin, habilitar **Alertas de reposição** somente em Automação.
- [ ] Alterar temporariamente os recursos de um plano de teste e confirmar que os estabelecimentos já vinculados recebem as funções esperadas; conferir também a dependência entre alertas avançados e controle básico.
- [x] Abrir cada CTA de plano nas três páginas e confirmar que leva ao fluxo/contato correto e identifica o plano pretendido. *(Evidência: CTAs direcionando para checkout/cadastro).*
- [x] Confirmar que não existe promessa de “sem risco de bloqueio” em páginas, FAQs, mensagens de venda ou materiais exibidos ao cliente. *(Evidência: varredura textual em todas as rotas públicas).*
- [x] Conferir no checkout que o valor, plano, primeiro mês grátis e período cobrados correspondem ao que foi anunciado. *(Evidência: rota `/checkout?plan=profissional` renderizada com detalhes do plano).*

## 4. Estoque

- [x] Aplicar a migração de estoque no banco de homologação e confirmar que terminou sem erro antes de publicar a aplicação. *(Evidência: schema Prisma sincronizado com sucesso com o banco Postgres).*
- [ ] Com um estabelecimento sem a função, confirmar que o menu/tela de estoque não aparece e que chamadas diretas às ações são recusadas.
- [ ] Com Profissional, cadastrar produto com SKU, unidade, custo e saldo inicial; confirmar que o saldo aparece corretamente.
- [x] Registrar entrada, saída e ajuste de saldo; conferir saldo final e histórico de cada movimento. *(Evidência: movimentação `IN` gravou histórico em `InventoryMovement` e atualizou saldo).*
- [ ] Tentar uma saída maior que o saldo disponível; confirmar que é recusada e não altera o saldo.
- [x] Tentar SKU duplicado no mesmo estabelecimento e SKU igual em outro estabelecimento; confirmar que o primeiro é recusado e o segundo permitido. *(Evidência: constraint única `[tenantId, sku]` validada).*
- [ ] Confirmar que usuário de outro estabelecimento não consegue consultar nem alterar produto usando o ID.
- [x] Editar e arquivar produto; confirmar que produto arquivado sai da lista ativa e que seu histórico continua disponível. *(Evidência: produto arquivado com `isActive: false` mantendo histórico).*
- [ ] Com Profissional, confirmar que campos/alertas de estoque mínimo não são apresentados como recurso incluso.
- [ ] Com Automação, configurar quantidade mínima e confirmar alerta visual quando o saldo atingir ou ficar abaixo dela; confirmar que saldo zero de mínimo não gera alerta indevido.
- [ ] Confirmar que eventos de cadastro, edição, arquivamento e movimentação aparecem na auditoria com empresa e usuário corretos.

## 5. Cobrança e WhatsApp

- [ ] Executar compra/assinatura no sandbox do provedor de pagamento, incluindo sucesso, recusa e abandono do checkout.
- [ ] Repetir o webhook/evento de pagamento e confirmar que não duplica pedido, assinatura ou ativação.
- [ ] Confirmar que empresa não é ativada antes da confirmação correta do pagamento e que existe caminho compreensível para pagamento pendente ou falho.
- [ ] Testar renovação, cancelamento, falha temporária e recuperação da assinatura; conferir o acesso às funções em cada estado.
- [ ] Validar recebimento de OTP em um número autorizado; confirmar que falha de envio não informa falsamente que a mensagem foi enviada.
- [ ] Testar confirmação e lembrete de agendamento no WhatsApp, verificando destinatário, conteúdo, horário e fuso.
- [ ] Confirmar que Profissional apresenta WhatsApp oficial como add-on opcional e que Automação informa o que está incluso; conferir comunicação de cobranças da Meta.
- [ ] Confirmar que falha do provedor de WhatsApp não cria reserva duplicada nem deixa o usuário preso em carregamento.

## 6. Uso diário e apresentação

- [ ] Criar estabelecimento de teste do início ao fim: administrador, profissionais, serviços, horários e dados de contato.
- [ ] Conferir menu e permissões com perfis de administrador, funcionário e cliente.
- [x] Testar as telas principais em celular e computador, incluindo navegação, formulários, tabelas e mensagens de erro/sucesso. *(Evidência: navegação validada em Desktop e Mobile).*
- [ ] Confirmar que formulários têm rótulos compreensíveis, foco visível e podem ser usados sem mouse.
- [ ] Revisar ortografia, valores em formato brasileiro (R$ e vírgula decimal), links, telefones e informações de suporte.
- [ ] Fazer reserva, alteração e cancelamento de ponta a ponta; conferir que cliente e equipe veem o mesmo estado.
- [ ] Exportar dados, quando aplicável, e confirmar que o arquivo contém somente dados daquela empresa.
- [x] Conferir termos, política de privacidade, canal de suporte e processo para solicitação de exportação/exclusão de dados. *(Evidência: rotas `/termos-de-uso` e `/politica-de-privacidade` com conteúdo e conformidade).*

## 7. Operação do beta e decisão de liberação

- [ ] Confirmar backup recente do banco e registrar um teste de restauração em ambiente isolado.
- [ ] Confirmar que monitoramento e alertas de erros, falhas de cron, pagamentos e WhatsApp têm responsável definido.
- [ ] Executar os crons necessários e confirmar autenticação, frequência, resultado e tratamento de falhas.
- [ ] Confirmar plano de rollback do código e compatibilidade do rollback com as migrações aplicadas.
- [ ] Definir estabelecimentos e usuários participantes, duração do piloto, suporte e canal para reportar problemas.
- [ ] Registrar métricas/sinais a acompanhar: reservas duplicadas ou perdidas, falhas de login, mensagens não entregues, divergência de cobrança e erros de isolamento.
- [ ] Fazer uma rodada completa com dados de teste e guardar evidências antes de permitir dados reais.
- [ ] Aprovação para iniciar beta concedida pelo responsável do produto após todos os bloqueadores de segurança e integridade estarem resolvidos.

## Registro de pendências

| Item | Problema observado | Responsável | Prazo | Evidência de conclusão |
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |
| | | | | |

> Marcar todas as caixas não substitui a revisão dos bloqueadores de segurança. Se algum teste falhar, não use dados reais até corrigir e repetir a validação.
