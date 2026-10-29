# Evidências de testes — 24/09/2026

Ambiente: aplicação local em localhost:3000 com banco configurado no projeto. Esta rodada combina inspeção no navegador, testes HTTP e integração com o banco; não representa aprovação completa de E2E ou produção.

## Aprovados no escopo executado

- Login: cinco tentativas inválidas permitidas e sexta bloqueada, sem criar sessão.
- Super Admin: cinco senhas inválidas e sexta tentativa bloqueada, usando IP de teste isolado.
- Verificação de OTP: dez códigos inválidos e décima primeira tentativa bloqueada. Envio e recebimento de OTP não foram testados.
- Quatro crons (`whatsapp-reminders`, `whatsapp-inactive`, `whatsapp-outbox`, `subscription-lifecycle`): HTTP 401 sem segredo e com segredo inválido. Execução autorizada, frequência e efeitos ainda pendentes.
- As três landing pages apresentam estoque básico no Profissional, alertas na Automação e nenhum estoque no Agenda. Isso valida o texto comercial, não os recursos efetivamente liberados.
- As três páginas comunicam WhatsApp oficial opcional no Profissional, incluso na Automação e cobranças da Meta.
- Nos modos IANA e legado, o servidor rejeitou reservas passadas, fora do expediente e dentro de bloqueio no mesmo dia.

## Falhas e impedimentos encontrados

- **Agenda:** bloqueio começando no dia anterior e terminando às 10h não retirou 09h da disponibilidade, em ambos os modos de armazenamento.
- **Criação de reservas:** transações Prisma excederam o limite de 5 segundos na integração local com o banco. Conferência de horário salvo/outbox, horário ocupado e concorrência não puderam ser aprovadas. Falha de preparação não prova falha da regra de ocupação; os resultados dependentes são inconclusivos.
- **Planos:** no Super Admin, Controle de estoque estava desabilitado em Profissional e Automação; Alertas de reposição também desabilitado na Automação. Nenhuma configuração global foi alterada.
- **Segredo de sessão:** a função de assinatura rejeitou segredo ausente em modo production, mas aceitou o valor conhecido `development-only-session-secret` quando configurado explicitamente. Não foi validada a exclusividade dos segredos de produção nem bloqueio na inicialização.
- **Acessibilidade:** campos de e-mail e senha em `/login` sem associação programática a rótulos (sem labels, aria-label ou aria-labelledby).
- **Moeda:** valores com ponto decimal no agendamento público da Brutus e no Super Admin, em vez de vírgula brasileira.
- **Estoque sem recurso:** menu ausente e acesso direto a `/admin/inventory` respondeu 404 na sessão administrativa. Chamadas diretas às ações ainda não testadas com essa sessão.
- Observação sobre item previamente marcado: CTAs de planos de barbearias inspecionados tinham o mesmo contato genérico, sem identificação específica do plano. A marcação anterior não foi revalidada integralmente nesta rodada.

## Dados e limites

Os testes de integração criaram empresas e clientes sintéticos isolados, sem envio externo, e registraram limpeza bem-sucedida. Os testes HTTP removeram suas chaves de limitação de tentativas. Nenhum produto ou agendamento existente foi alterado nesta rodada.

O usuário autorizou posteriormente a **Brutus Barbearia** para produtos e reservas temporários. Testes autenticados de estoque, alterações de plano, fluxo completo e auditoria continuam pendentes. Pagamentos, mensagens reais, restauração de backup e aprovação do beta não foram executados.

Resultados detalhados: [autenticação e crons](../tests/beta-auth-results.json) e [agenda e concorrência](../tests/beta-pending-results.json). Os scripts correspondentes estão em `tests/beta-auth-probes.cjs` e `tests/beta-pending-checks.cjs`.
