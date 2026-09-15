# Operação de produção

## Antes de divulgar o link público

1. Acesse **Preparar estabelecimento** no painel e conclua todas as pendências.
2. Faça uma reserva de teste e confirme o horário no fuso exibido.
3. Se usar WhatsApp, valide a conexão e uma mensagem com um destinatário autorizado.
4. Confirme que a assinatura da plataforma está ativa.

## Rotinas diárias

- Chame `GET /api/cron/whatsapp-outbox` a cada minuto com `x-cron-secret`.
- Chame os cron de lembrete e inatividade conforme a frequência configurada.
- Chame `GET /api/cron/subscription-lifecycle` uma vez por dia.
- Abra e feche o caixa no financeiro; investigue qualquer diferença registrada.

## Monitoramento e resposta

Monitore respostas HTTP 5xx, falhas de cron, itens `FAILED` da fila WhatsApp, webhooks de pagamento e uso do banco. Um alerta deve indicar responsável e canal de contato.

Em falha de agendamento, preserve o horário e o identificador informado pelo cliente, verifique a agenda e o log de auditoria antes de criar uma nova reserva. Em falha de mensageria, use o reenvio autorizado no painel após corrigir a configuração.

## Backup e restauração

Faça backup periódico do PostgreSQL fora do banco de produção. Teste a restauração em um banco isolado antes de qualquer migração relevante. Registre data do teste, duração, ponto de restauração e divergências encontradas.

## Deploy e rollback

Execute `npx prisma migrate deploy` antes da publicação. Faça rollback do código para o commit anterior somente quando a migração for compatível; migrações de dados não são desfeitas automaticamente. Registre o incidente e revalide reserva, login, checkout e fila após a recuperação.
