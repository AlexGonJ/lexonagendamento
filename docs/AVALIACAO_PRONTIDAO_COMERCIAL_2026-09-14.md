# Avaliação de prontidão comercial — Lexon Agenda

Data: 14/09/2026. Escopo: versão local do repositório saas-agendamento.

## Parecer

**Não recomendo vender esta versão como um SaaS pronto para operação com dados reais.** Há uma base funcional relevante, mas falhas de autenticação, exposição de dados, isolamento entre empresas, agenda e cobrança impedem a liberação comercial responsável. O próximo marco deve ser corrigir os bloqueadores e executar um piloto acompanhado.

O produto tem potencial para atender pequenos salões e barbearias com agenda, serviços, equipe, clientes e WhatsApp. Não precisa implementar todas as funções dos grandes concorrentes para começar a vender. Precisa executar de forma confiável as funções que anuncia.

| Área | Avaliação |
| --- | --- |
| Abrangência funcional | MVP com vários módulos implementados |
| Segurança | Reprovada para lançamento; falhas críticas no código |
| Integridade da agenda | Parcial; proteção no fluxo avulso, mas exceções perigosas |
| Financeiro e cobrança | Insuficientes para operação autônoma |
| Usabilidade | Interface pública organizada, com falhas de acesso e acessibilidade |
| Confiabilidade operacional | Não demonstrada por testes e evidências operacionais |
| Venda imediata | Não recomendada |

## Método e limites

- Revisão de schema, migrações, autenticação, Server Actions, endpoints públicos, pagamentos, WhatsApp, agenda, financeiro e componentes de interface.
- Consulta ao guia de segurança instalado do Next.js: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`. Ações de servidor utilizadas pelo cliente exigem autorização própria; proteção de layout não substitui essa verificação. Objetos enviados a componentes de cliente devem conter somente campos públicos.
- Build de produção concluída com sucesso, incluindo TypeScript.
- `npm run lint`: **15 erros e 7 avisos**, código de saída 1.
- `npm audit --omit=dev --json`: **5 pacotes com alertas: 1 crítico, 3 altos e 1 moderado**. São alertas da árvore de dependências, não cinco explorações comprovadas nesta aplicação.
- Inspeção visual local do login e do checkout; checkout inspecionado em largura aproximada de 390 px. Nenhum pagamento, envio de WhatsApp ou criação/cancelamento de registro real foi executado.
- A tentativa inicial de abrir `/brutusbarbearia/book` falhou por restrição de conexão do processo local com o Supabase. Após executar o servidor com acesso à rede autorizado, a página abriu: serviço, profissional e data puderam ser selecionados no celular. A data consultada retornou ausência de horários. Não foi concluída reserva. A falha inicial não foi atribuída ao ambiente publicado.
- Não houve teste completo autenticado de administrador/cliente, teste de carga, restauração de backup, validação de políticas RLS do banco ou auditoria de infraestrutura de produção. Achados abaixo são identificados por leitura do código, salvo indicação de verificação visual ou ferramenta.
- Nenhuma correção no código funcional foi realizada nesta avaliação.

## 1. Segurança: bloqueadores

### S1 — Crítico: endpoint público retorna hashes de senha dos funcionários

**Evidência:** `src/app/api/[tenant]/employees/route.ts:19` consulta funcionários sem `select` e devolve os registros completos na linha 24. O model Employee contém `passwordHash`, `calendarToken`, email e outros campos internos.

O mesmo padrão aparece em `src/app/[tenant]/book/page.tsx:14`: funcionários completos, inclusive dentro de serviços, são enviados ao componente cliente BookingFlow nas linhas 36–37. Não precisam aparecer visualmente para serem transmitidos ao navegador. A resposta do POST de agendamento também inclui o funcionário completo.

**Impacto:** visitantes podem receber hashes de senha e tokens de calendário quando preenchidos. Com o armazenamento atual por SHA-256 simples, a exposição dos hashes fica especialmente grave.

**Correção:** definir projeções explícitas dos campos públicos, reutilizar essas projeções em APIs e componentes e testar ausência de segredos em JSON/HTML/RSC. Se essa versão já esteve pública com dados reais, tratar a exposição como potencial e planejar redefinição das senhas e rotação dos tokens afetados após corrigir as saídas.

### S2 — Crítico: login social permite autenticação por identidade fornecida pelo navegador

**Evidência:** `src/actions/auth.ts:337`, `loginClientOAuth`, aceita email, googleId, appleId e telefone; procura ou altera o cliente e emite sessão sem exigir token OAuth validado ou prova de OTP na própria ação.

O componente chama `verifyGoogleIdToken` antes, mas essa sequência no navegador pode ser ignorada. `src/app/api/auth/oauth/sync/route.ts` também permite associar identificadores e retornar dados de clientes sem autenticação. O endpoint de vínculo verifica OTP, mas aceita a identidade social declarada sem validar token e não aplica a limitação de tentativas usada em outros caminhos.

**Impacto:** assumir identidade de clientes, acessar informações e operar reservas em nome deles.

**Correção:** receber e validar a credencial do provedor dentro da operação que cria a sessão; verificar audiência, emissor, expiração e identidade; exigir prova do telefone para vinculá-lo. Unificar ações e APIs para evitar caminhos alternativos inseguros. `verifyGoogleIdToken` atualmente consulta tokeninfo, mas não compara a audiência com o client ID da aplicação.

### S3 — Alto: cancelamento ignora a empresa do funcionário

**Evidência:** `src/actions/booking.ts:587`, `cancelBooking`; nas linhas 603–614, qualquer sessão de funcionário dispensa a validação de titularidade feita para clientes. Não há verificação de `booking.tenantId === employeeSession.tenantId` nem do profissional responsável.

**Impacto:** funcionário autenticado pode cancelar reserva de outra empresa se obtiver seu identificador. A função `updateBookingStatus` tem verificações melhores, mas não protege este caminho alternativo.

**Correção:** centralizar a autorização de reservas e reutilizá-la em cancelar, editar e excluir; testar com duas empresas e perfis distintos.

### S4 — Alto: permissões de planos e automações incompletas

- `src/actions/plans.ts:113`: `createSubscription` verifica sessão, mas não administrador; busca plano por ID sem restringir empresa e aceita serviço/profissional de entrada sem conferir pertencimento. Isso permite associações cruzadas e alterações comerciais por colaborador.
- `src/actions/whatsapp.ts:192` e `:282`: fornecer `manualTenantId` dispensa autenticação em ações exportadas usadas pela interface. O segredo validado na rota cron não protege a chamada direta da ação. Há risco de disparos fora do contexto autorizado, quando a automação correspondente estiver habilitada.
- `getWhatsappSettings` e `getTenantSettings` retornam configurações sensíveis a qualquer sessão de funcionário; o token de WhatsApp deve ficar restrito e não precisa retornar integralmente ao navegador.
- `getActiveSubscription` permite consulta por telefone sem verificar sessão do cliente.

**Correção:** verificar papel, empresa e titularidade em cada operação; mover os executores internos de jobs para módulos exclusivamente de servidor e manter entradas públicas com autorização explícita.

### S5 — Alto: senhas e sessões precisam de endurecimento

- `src/actions/auth.ts:10`, cadastro e edição de funcionário usam SHA-256 simples, sem salt individual e sem custo de derivação.
- `src/lib/session.ts:1` possui segredo fixo de fallback, inclusive se nenhuma variável existir em produção. A implantação deve falhar nessas condições.
- `getCurrentSession` confia no conteúdo assinado sem revalidar o funcionário e suas permissões no banco. O proxy renova a sessão com os mesmos dados. Remover um usuário, trocar sua senha ou retirar seu papel não revoga automaticamente a sessão existente.
- O login do superadministrador não tem limitação de tentativas no código e usa um segredo compartilhado.

**Correção:** adotar hash adequado, como Argon2id, com migração das senhas; segredo obrigatório; revogação/versionamento de sessão; limitação de tentativas e MFA para administração da plataforma.

Referência: [OWASP — Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### S6 — Dependências com avisos de segurança

O audit retornou `next` como crítico; `nanoid`, `postcss` e `sharp` como altos; `baseline-browser-mapping` como moderado. A versão declarada de Next é 16.2.9. O registro sugeriu atualização para Next 16.3.5 no resultado desta consulta.

**Ação:** atualizar versões e lockfile em uma mudança controlada, consultar os avisos específicos e repetir build e testes. A classificação do pacote não demonstra que todos os avisos sejam exploráveis na infraestrutura real; alguns dependem de Windows, otimização de imagens, servidor customizado ou configuração específica.

## 2. Agenda e confiabilidade dos dados

### R1 — Horários gravados e comunicados em fusos diferentes

`src/actions/booking.ts:80` grava a escolha como UTC, acrescentando `Z`. Na linha 191, a mensagem converte esse instante para America/Sao_Paulo.

**Exemplo:** selecionar 10:00 resulta em 10:00 UTC; a mensagem formatada em São Paulo informa 07:00. A disponibilidade trabalha com horas UTC, e o job usa o instante real, tornando o lembrete também inconsistente.

**Correção:** definir o fuso do estabelecimento, converter hora local para UTC ao persistir e converter para local ao exibir. Aplicar a mesma regra a filtros diários, relatórios e recorrências.

### R2 — É possível reservar no passado

`src/actions/availability.ts:96` mantém `isPast = false`. A criação valida formato e disponibilidade, mas não rejeita data/hora passada. A seleção de datas futuras no navegador não é uma validação de servidor.

**Correção:** validar instante futuro, antecedência mínima e horizonte máximo no servidor.

### R3 — Recorrências não respeitam a proteção contra choque de horários

Há um ponto positivo: as reservas avulsas usam transação e trava PostgreSQL por funcionário/dia, com verificação de disponibilidade.

Entretanto, `src/actions/plans.ts:160` cria reservas recorrentes diretamente, sem conferir conflito, expediente ou serviço atendido. Também não executa a criação inteira em uma transação. Pode haver duas reservas simultâneas ou um plano parcialmente criado.

**Correção:** usar um serviço único de reserva em todos os caminhos e garantir operação atômica para o conjunto de recorrências.

### R4 — Créditos dos planos podem divergir

- O consumo em `src/actions/booking.ts:141` não verifica `startDate`/`endDate` da assinatura. A consulta feita pela interface não substitui isso.
- A trava é por profissional/dia, não por assinatura: duas reservas em profissionais ou dias diferentes podem consumir o último crédito simultaneamente.
- Cancelar/excluir devolve crédito antes da alteração da reserva, fora de uma transação que garanta devolução única.
- `updateBookingStatus` recebe qualquer string e pode reativar uma reserva cancelada sem consumir novamente crédito ou conferir conflito.

**Correção:** débito condicional atômico, validação de vigência na reserva, transições de status permitidas e devolução idempotente — repetir a mesma solicitação não deve gerar novos créditos.

### R5 — Financeiro não preserva histórico nem distingue reserva de recebimento

`src/actions/financial.ts:79` e `:90` calculam receitas e comissões com preço e percentual atuais. Alterar o preço do serviço ou a comissão altera relatórios de atendimentos antigos. O dashboard usa outra regra e soma o preço dos serviços inclusive em reservas vinculadas a planos; o financeiro separa planos e avulsos.

O status CONFIRMED serve de base para faturamento, mas não comprova realização nem pagamento. O schema não registra recebimento, forma de pagamento ou conciliação.

**Correção:** salvar preço, duração e comissão acordados na reserva/atendimento; registrar eventos financeiros; separar agendado, concluído, faltou, cancelado e pago. Usar Decimal ou centavos inteiros para dinheiro e reconciliar os relatórios.

### R6 — Exclusões destroem histórico

As relações Booking → Service e Booking → Employee no schema usam `onDelete: Cascade`, e as ações excluem serviços/profissionais fisicamente. Excluir um profissional ou serviço pode remover as reservas associadas e mudar o histórico do negócio.

**Correção:** desativação/arquivamento e preservação dos dados históricos; exclusões administrativas com política explícita.

## 3. Cobrança e entrega do produto

### C1 — Webhook não oferece processamento confiável

`src/app/api/webhooks/mercadopago/route.ts` consulta a API do Mercado Pago antes de ativar: isso é positivo e impede confiar apenas no status enviado no corpo.

Porém:

- Não verifica a assinatura do webhook.
- Não registra ID único de evento/pagamento para impedir reprocessamento.
- Cada repetição pode cancelar o plano ativo e criar outro.
- Cancela plano anterior, cria novo plano e ativa empresa sem transação única.
- Devolve HTTP 200 até quando a consulta externa ou o processamento interno falha, sem fila persistente para recuperação.
- Ignora cancelamento, pausa, estorno e outros estados que não sejam sucesso.
- Associa plano por descrição ou aproximação de preço; não por pedido persistido com plano, moeda e ciclo contratados.

**Correção:** pedido/assinatura com IDs do provedor, validação do evento, idempotência, transação e reprocessamento. Tratar todo o ciclo de cobrança e uma política explícita para inadimplência.

### C2 — Checkout tem hipóteses não comprovadas

`src/actions/checkout.ts` acrescenta `external_reference` a links estáticos e supõe que o provedor preservará a referência. Isso precisa de validação real em sandbox. O ciclo mensal/anual não é persistido no TenantPlan. O plano pode cair em fallback para outro plano ativo ou ser criado automaticamente.

Se a URL de pagamento não existir, a interface encaminha para o painel após criar uma empresa inativa. Falta um fluxo claro de pagamento pendente, nova tentativa e ativação confirmada.

### C3 — Funcionalidades anunciadas não estão integralmente implementadas

- Checkout anuncia Google Calendar; existem campos e um identificador de feature, mas não localizei o fluxo de autorização e sincronização real.
- Domínio próprio aparece como benefício; não localizei roteamento por host ou configuração correspondente no produto.
- Limites de profissionais e 200 agendamentos/mês são anunciados, mas não localizei aplicação desses limites nas ações de criação.
- O painel não aplica uma política centralizada de empresa ativa/assinatura vigente nas ações revisadas.

**Ação:** implementar o benefício e seus limites ou retirá-lo da oferta até estar disponível. Domínio próprio eventualmente configurado manualmente fora do repositório precisa de comprovação operacional.

## 4. WhatsApp e usabilidade

### U1 — OTP informa sucesso mesmo sem envio

`src/actions/auth.ts:129` cria o código e retorna “Código enviado via WhatsApp” mesmo sem empresa habilitada, com simulador ou após falha de envio. O retorno `success: false` do provedor não é tratado como falha de autenticação. O código também é escrito nos logs em produção.

**Impacto:** o cliente espera um código que não chegará e não consegue agendar.

**Correção:** garantir um canal de autenticação operacional; diferenciar simulação de envio; tratar falha; limitar reenvios; remover códigos dos logs; gerar OTP com aleatoriedade criptográfica.

### U2 — Primeiro acesso pode consumir OTP antes de pedir nome

`verifyClientOtp` apaga o código antes de verificar se um cliente novo informou nome. Se retornar `needsName`, a tentativa seguinte com o mesmo código falha.

**Correção:** coletar dados obrigatórios antes de consumir o OTP ou usar uma prova temporária de verificação que permita concluir o cadastro.

### U3 — Entrega de mensagens não é comprovada

O envio é síncrono, não há fila durável e os POSTs de WhatsApp não têm timeout explícito. O job marca envio depois da chamada, permitindo duplicação em execuções concorrentes. Não há webhook de entrega identificado. No modo Meta, o mesmo campo é usado como nome do template e texto com placeholders, o que precisa ser separado para templates parametrizados.

**Correção:** fila/outbox persistente, timeout, tentativas com controle, identificação de mensagem, status de entrega e logs sem segredos. Confirmar agendamento não deve depender de esperar indefinidamente pelo provedor.

### U4 — Interface: avaliação observada

- Login visualmente organizado; falta recuperação autônoma de senha e acesso acionável ao suporte.
- Checkout cabe na tela móvel inspecionada, sem transbordamento horizontal observado.
- Os quatro inputs do checkout não têm label associado nem aria-label na inspeção do DOM. O texto visual não basta para leitores de tela.
- Em celular, o botão “Criar Estabelecimento & Pagar” aparece antes do resumo, preço e período. Recomendo colocar resumo e valor total antes da confirmação.
- O agendamento público permite avançar de serviço para profissional e data no celular e mostra mensagem para data sem horários. Os preços aparecem como `R$ 50.00`, com ponto decimal; padronizar para o formato brasileiro. A etapa final é chamada “Pagamento”, embora a criação de reserva avulsa revisada não processe pagamento: ajustar o nome ao comportamento entregue.
- Há estados de carregamento e mensagens em componentes, mas também dependência de alertas nativos e ausência de recuperação adequada em alguns fluxos.
- Não encontrei páginas `error.tsx`/`loading.tsx` para tratar falhas de forma consistente. O erro de banco apareceu como tela técnica genérica.
- O componente DevToolsProtection existe, mas **não encontrei uso dele**. Portanto seus bloqueios não foram classificados como defeito ativo da interface; não deve ser ativado como suposta proteção de segurança.

Não foi feita certificação de acessibilidade, medição de Core Web Vitals nem validação visual de todas as telas autenticadas.

## 5. Comparação com o setor

O código e as páginas comerciais apontam salões e barbearias como público principal. Como referências de oferta, consultei [Trinks para barbearias](https://negocios.trinks.com/negocios/barbearias/) e [Salonipy para o Brasil](https://salonipy.com/salon-software-brazil). Essas páginas anunciam agenda integrada a gestão de equipe, comissões, estoque e funções de caixa/comanda; Trinks também apresenta clube de assinaturas e emissão fiscal. Isso é comparação de funções anunciadas, não auditoria dos concorrentes.

| Função | Situação no Lexon | Prioridade |
| --- | --- | --- |
| Agenda pública, serviços e profissionais | Implementados, com bloqueadores descritos | Corrigir antes de vender |
| CRM e histórico | Base implementada; preservar integridade e permissões | Antes de vender |
| Lembretes WhatsApp | Integração parcial, entrega e OTP frágeis | Antes de anunciar como operacional |
| Clube de assinaturas | Existe; créditos e recorrências precisam correção | Antes de vender esse módulo |
| Agenda da recepção e encaixes | Não localizei criação administrativa dedicada | Alta para uso diário |
| Reagendamento, feriados, férias e bloqueios pontuais | Não localizei fluxo/modelo completos; há expediente semanal | Alta |
| Realizado, faltou, pago, comanda e fechamento de caixa | Ausentes ou insuficientes | Alta para vender gestão financeira |
| Recuperação de senha e onboarding guiado | Não localizados como fluxos completos | Alta |
| Exportação de dados e relatórios consistentes | Não localizei exportação completa | Alta |
| Lista de espera, sinal/Pix e política de cancelamento | Não localizados como fluxos completos | Próxima etapa conforme público |
| Estoque, venda de produtos, emissão fiscal | Não localizados | Expansão para competir em gestão completa |
| Google Calendar e domínio próprio | Anunciados, implementação não demonstrada | Implementar ou retirar da oferta |

**Posicionamento recomendado:** começar como agenda confiável com gestão básica para pequenos estabelecimentos. Estoque, fiscal, aplicativo nativo e grandes automações podem esperar, desde que não sejam prometidos.

## 6. Operação e privacidade a comprovar

- Backups automáticos e teste documentado de restauração, com tolerância à perda de dados e tempo de recuperação definidos.
- Monitoramento de disponibilidade, erros, falhas de cobrança e mensagens; alertas com responsável.
- Ambiente de homologação separado, migrações reproduzíveis e procedimento de reversão de implantação.
- Testes automáticos dos fluxos críticos; não localizei suíte ou comando de testes no repositório. Não há pipeline `.github` identificado.
- Índices para agenda por empresa/profissional/data, paginação e consultas limitadas. O schema não define índices compostos para essas consultas; não foi inspecionado se existem índices manuais no banco.
- Trilha de auditoria para alterações de agenda, planos e permissões.
- Processo de suporte, exportação, correção e exclusão de dados. Há páginas de termos e privacidade, mas elas não comprovam execução desses processos.
- O Meta Pixel está no layout global, sem controle de preferência identificado, incluindo áreas de operação. Revisar escopo e mecanismo de preferências de rastreamento. Esta avaliação não certifica conformidade jurídica.

## 7. Sequência recomendada e critérios de liberação

### Etapa 1 — Fechar exposição e autenticação

Corrigir S1–S6; centralizar autorização e projeções públicas; revisar segredos e sessões; atualizar dependências. **Aceite:** visitante não recebe hash/token; identidade social sem prova é rejeitada; empresa A não opera registros de B; colaborador não executa ações administrativas; sessão revogada deixa de funcionar.

### Etapa 2 — Garantir integridade da agenda

Corrigir fuso, passado, recorrências, créditos, status e exclusões. **Aceite:** duas solicitações concorrentes para o mesmo horário geram uma reserva; último crédito não é gasto duas vezes; cancelamento repetido devolve uma vez; recorrência não sobrepõe agenda; alteração de preço não reescreve histórico.

### Etapa 3 — Concluir cobrança e WhatsApp

Validar checkout em sandbox, eventos repetidos, falhas temporárias, renovação, cancelamento e estorno. Comprovar entrega de OTP, confirmação e lembrete com fuso correto. **Aceite:** evento duplicado não duplica plano; falha recuperável não desaparece; assinatura e recursos correspondem ao pedido; falha de WhatsApp não bloqueia indefinidamente a reserva.

### Etapa 4 — Usabilidade e operação

Recuperação de senha, rótulos acessíveis, resumo antes de pagar, onboarding de serviço/profissional/expediente, agenda administrativa, estados de erro, exportação, monitoramento e restauração de backup.

### Etapa 5 — Piloto acompanhado

Executar um piloto com poucos estabelecimentos e escopo explícito após os bloqueadores. Acompanhar reservas perdidas/duplicadas, erros de acesso, entrega de mensagens e consistência financeira. Liberar venda mais ampla somente com as jornadas críticas aprovadas e suporte operacional definido.

**Conclusão:** ampliar o catálogo de funções agora tem prioridade menor que corrigir segurança e integridade. A base pode evoluir para um produto comercial, mas compilar e ter muitas telas ainda não demonstra que consegue sustentar a rotina de um estabelecimento.
