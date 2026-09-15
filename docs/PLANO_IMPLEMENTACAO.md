# Plano de implementação — Lexon Agenda

Data: 14/09/2026. Base: [avaliação técnica](./AVALIACAO_PRONTIDAO_COMERCIAL_2026-09-14.md).

## Objetivo e escopo

Preparar o produto para venda a pequenos salões e barbearias, com agenda confiável, gestão de equipe e clientes, planos, financeiro básico e mensagens operacionais. Este documento é um plano; as correções ainda não foram implementadas.

**Marco de lançamento:** fases 0–6 concluídas e piloto da fase 7 aprovado. Funcionalidades avançadas da fase 8 não bloqueiam a primeira venda se estiverem fora da oferta.

Prioridades:

- **P0:** exposição de dados, autenticação, acesso entre empresas e perda/corrupção de dados.
- **P1:** funções necessárias à operação diária e à entrega comercial anunciada.
- **P2:** expansão comercial após a estabilização.

Premissas: manter Next.js, Prisma e PostgreSQL; manter Mercado Pago para a assinatura do estabelecimento; inicialmente atender um estabelecimento por contexto de acesso. Não misturar essa cobrança com pagamentos dos consumidores pelos serviços. Ler os guias da versão instalada do Next.js antes de cada alteração relevante e após atualizações.

## Sequência e esforço preliminar

Estimativas em dias úteis de engenharia de uma pessoa familiarizada com o projeto, incluindo testes direcionados. São faixas de planejamento, não prazos garantidos; revisar após a fase 0. Aprovações externas, configuração de contas, migração de dados reais e piloto não estão incluídos no esforço.

| Fase | Entrega | Dependência | Esforço |
| --- | --- | --- | --- |
| 0 | Homologação e base de validação | Nenhuma | 2–3 dias |
| 1 | Segurança e isolamento | 0 | 5–8 dias |
| 2 | Integridade da agenda e créditos | 1 | 6–10 dias |
| 3 | Cobrança SaaS e limites dos planos | 1; validar com 2 | 5–8 dias |
| 4 | Autenticação por OTP e WhatsApp confiável | 1 e 2 | 4–7 dias |
| 5 | Operação diária e financeiro básico | 2; integrar com 3 e 4 | 8–12 dias |
| 6 | Usabilidade e preparação operacional | 1–5 | 4–6 dias |
| 7 | Piloto acompanhado | 0–6 aprovadas | 2–4 semanas de observação |
| 8 | Diferenciais e gestão avançada | Evidências do piloto | Estimar por módulo |

Total preliminar das fases 0–6: **34–54 dias úteis**, aproximadamente 7–11 semanas com uma pessoa dedicada, mais piloto. Incidentes ou histórico inconsistente podem ampliar esse intervalo. Testes e observabilidade começam na fase 0 e acompanham todas as entregas.

## Fase 0 — Preparar implementação e homologação

### Tarefas

- [ ] Registrar estado inicial, revisar mudanças locais e dividir entregas em alterações pequenas e revisáveis.
- [ ] Criar ambiente de homologação com banco separado e dados fictícios: duas empresas, administradores, colaboradores, clientes, planos e agendas.
- [ ] Inventariar variáveis e documentar exemplo sem segredos; identificar quais integrações estão realmente configuradas.
- [ ] Definir procedimento de backup e restauração antes de migrações.
- [ ] Configurar testes unitários para regras de negócio, testes de integração com PostgreSQL real e testes de interface para jornadas críticas.
- [ ] Criar pipeline com lint, TypeScript, testes e build. Corrigir os erros atuais de lint, sem silenciar regras indiscriminadamente.
- [ ] Preparar respostas simuladas de Mercado Pago/WhatsApp para testes de falha sem cobranças ou mensagens reais.
- [ ] Confirmar se a versão vulnerável já foi publicada e se contém dados reais; em caso positivo, priorizar contenção e tratamento da exposição identificada.

### Aceite

Instalação reproduzível a partir do lockfile, pipeline executável e testes isolados da produção. Nenhuma suíte deve usar seed destrutivo contra banco real.

## Fase 1 — Fechar falhas de segurança — P0

### SEC-01: eliminar exposição de campos internos

- [ ] Criar projeções explícitas de dados públicos de profissional e serviço.
- [ ] Aplicar a APIs, página pública, portal do cliente, respostas de reserva e ações administrativas.
- [ ] Impedir retorno de passwordHash, calendarToken e tokens de WhatsApp ao navegador.
- [ ] Restringir configurações e logs sensíveis a administradores; exibir apenas estado de configuração de credenciais.

Arquivos principais: `src/app/api/[tenant]/employees/route.ts`, `src/app/[tenant]/book/page.tsx`, `src/app/[tenant]/perfil/page.tsx`, `src/actions/employees.ts`, `src/actions/tenant.ts`, `src/actions/whatsapp.ts`.

### SEC-02: autenticação social e OTP

- [ ] Unificar validação do token social e emissão de sessão na mesma operação de servidor.
- [ ] Validar assinatura/credencial, audiência, emissor, expiração e informações de identidade aplicáveis.
- [ ] Exigir prova de posse do telefone para vínculo; não confiar em email/ID/telefone declarados pelo navegador.
- [ ] Remover caminhos alternativos inseguros de sync/link/login e desabilitar simulações em produção.
- [ ] Aplicar limites de tentativas e proteção contra repetição em todas as entradas equivalentes.

### SEC-03: autorização centralizada

- [ ] Criar funções de autorização reutilizáveis para sessão, administrador, empresa e titularidade da reserva.
- [ ] Corrigir cancelamento cruzado, assinaturas com referências de outra empresa e ações administrativas acessíveis a colaboradores.
- [ ] Separar executores internos de jobs das Server Actions; passar tenantId não deve dispensar autorização.
- [ ] Verificar autenticação nas ações e endpoints, não somente em layouts ou menus.
- [ ] Garantir que cada referência relacionada pertença à mesma empresa; avaliar chaves compostas quando compatíveis com o modelo.

### SEC-04: senha, sessão e administração

- [ ] Migrar SHA-256 para Argon2id com salt e parâmetros adequados; suportar conversão no próximo login válido ou redefinição obrigatória conforme risco de exposição.
- [ ] Exigir segredo de sessão forte na inicialização em produção; remover fallback fixo.
- [ ] Implementar revogação/versionamento de sessão após troca de senha, remoção de usuário e alteração de papel.
- [ ] Aplicar limitação de tentativas e autenticação individual com MFA ao superadministrador.
- [ ] Validar uploads no servidor: tamanho, tipo real, formatos permitidos e nomes gerados.
- [ ] Restringir destinos configuráveis da Evolution para evitar requisições a redes internas; validar redirecionamentos e protocolos.
- [ ] Atualizar dependências com base em avisos vigentes e repetir verificações; configurar cabeçalhos de proteção compatíveis com as integrações.
- [ ] Tornar rate limiting atômico, normalizar chaves e definir limpeza dos registros expirados.

### Aceite e testes

Visitante não recebe campos secretos em JSON ou RSC; login com identidade sem prova é rejeitado; funcionário A não acessa/cancela registros de B; colaborador não modifica planos; sessão revogada falha; jobs não podem ser disparados sem autorização. Atualização de dependências aprovada sem vulnerabilidade crítica/alta aplicável pendente. Se houve exposição real, executar rotação/redefinição das credenciais afetadas com procedimento documentado.

## Fase 2 — Agenda e integridade dos dados — P0

### AGD-01: tempo e regras de reserva

- [ ] Adicionar fuso IANA no estabelecimento, inicialmente America/Sao_Paulo.
- [ ] Interpretar seleção do usuário no fuso do estabelecimento e persistir instante UTC.
- [ ] Usar a mesma conversão em disponibilidade, relatórios, portal, notificações e recorrências.
- [ ] Rejeitar horários passados, entradas inválidas e reservas fora da antecedência/horizonte permitidos.
- [ ] Criar um serviço único de reserva para API, Server Action, recepção e recorrências.
- [ ] Revalidar disponibilidade dentro da transação e padronizar trava de profissional/data; tratar tentativas concorrentes e novas tentativas de forma previsível.

### AGD-02: status, créditos e recorrências

- [ ] Definir estados permitidos de atendimento: agendado/confirmado, concluído, faltou e cancelado; pagamento terá estado separado.
- [ ] Validar transições, permissões e consequências sobre créditos.
- [ ] Fazer débito condicional atômico do saldo e validar vigência na data do atendimento.
- [ ] Registrar movimentos de crédito com chave única por evento; cancelamento repetido não pode devolver novamente.
- [ ] Criar recorrências com verificação de conflito e transação; apresentar os conflitos antes de confirmar o conjunto.
- [ ] Reagendar mantendo o vínculo e o crédito, validando o novo horário de forma atômica.

### AGD-03: preservar histórico

- [ ] Salvar preço, duração e comissão aplicáveis ao atendimento em campos históricos.
- [ ] Arquivar profissional/serviço em vez de apagar reservas em cascata.
- [ ] Registrar quem criou, alterou ou cancelou, quando e por qual motivo.
- [ ] Adicionar índices para consultas de agenda por empresa, profissional e data, confirmados por planos de execução.

### Migração importante

Não deslocar todos os horários antigos em três horas automaticamente. Identificar como cada caminho gravou os dados, comparar amostras com o horário esperado e executar migração ensaiada. Preço/comissão antigos não podem ser reconstruídos com precisão sem fonte histórica: registrar estimativa ou dado indisponível, sem apresentar valores atuais como fatos históricos.

### Aceite e testes

Duas requisições simultâneas para o mesmo horário geram uma reserva; último crédito não é consumido duas vezes em dias/profissionais diferentes; cancelamento repetido devolve uma vez; recorrências respeitam expediente; 10h escolhido aparece como 10h em todas as telas e mensagens; editar preço ou arquivar profissional não altera histórico. Testar limites de dia/mês e datas em fusos diferentes.

## Fase 3 — Cobrança do estabelecimento e planos — P1

### Tarefas

- [ ] Persistir pedido de assinatura com empresa, plano, ciclo, moeda, valor e identificadores do provedor.
- [ ] Criar checkout pelo fluxo oficialmente suportado do Mercado Pago; comprovar vínculo do pagamento com o pedido em sandbox.
- [ ] Eliminar escolha de plano por aproximação de valor/descrição e criação automática de plano por fallback.
- [ ] Validar autenticidade de webhook; registrar evento antes do processamento e deduplicar por identificador.
- [ ] Ativar pedido/plano/empresa em transação; reprocessar falhas temporárias sem duplicar efeitos.
- [ ] Tratar renovação, pendência, cancelamento, pausa, falha de pagamento e estorno segundo os eventos do produto contratado no provedor.
- [ ] Definir política de carência e acesso após inadimplência; preservar consulta/exportação conforme política do produto.
- [ ] Criar tela de assinatura com estado atual, histórico, pagamento pendente e nova tentativa.
- [ ] Aplicar limites e benefícios do plano no servidor, incluindo concorrência na criação de profissionais e contagem de reservas.
- [ ] Separar cancelamento da renovação de término do acesso já pago.
- [ ] Retirar temporariamente promessas de Calendar/domínio próprio até a entrega da fase 8, ou antecipar esses itens caso devam integrar a oferta inicial.

### Aceite e testes

Evento duplicado não cria outro plano; evento fora de ordem não reativa assinatura indevidamente; falha após registro é recuperável; valor/ciclo/plano correspondem ao pedido; pagamentos recusados não ativam; limites não são contornados pela API; tela explica corretamente a situação da assinatura. Nenhuma cobrança real nos testes automatizados.

## Fase 4 — OTP e WhatsApp operacional — P1

### Tarefas

- [ ] Definir canal de autenticação disponível para todas as empresas: não depender silenciosamente de uma integração opcional desligada.
- [ ] Gerar OTP com aleatoriedade criptográfica, armazenar hash e consumir com operação atômica.
- [ ] Corrigir cadastro inicial: não consumir prova de verificação antes de coletar dados necessários.
- [ ] Remover OTP e segredos dos logs; diferenciar simulação, falha, aceitação pelo provedor e entrega.
- [ ] Criar outbox persistente para confirmação, cancelamento e lembrete, gravada na transação do evento de negócio.
- [ ] Implementar executor com timeout, tentativas espaçadas, deduplicação e recuperação de trabalhos interrompidos.
- [ ] Separar nome do template Meta de parâmetros; validar configuração conforme o provedor.
- [ ] Registrar ID da mensagem e processar callbacks de entrega quando disponíveis.
- [ ] Garantir que múltiplas execuções do cron não reservem o mesmo trabalho simultaneamente; documentar limites de entrega exatamente uma vez do provedor.
- [ ] Escopar reativação de clientes por empresa, com preferência de comunicação e opção de parar mensagens promocionais.
- [ ] Criar painel de conexão/falhas com instruções úteis e reenvio autorizado.

### Aceite e testes

Falha de envio não informa “código enviado”; cadastro novo conclui com a mesma prova válida; OTP expirado/reutilizado falha; reserva é salva mesmo se o provedor ficar indisponível; mensagens usam fuso correto; reiniciar executor não perde trabalhos. Validar configuração real em homologação com destinatários de teste autorizados.

## Fase 5 — Funções de operação diária — P1

### OPS-01: agenda administrativa e recepção

- [ ] Adicionar perfil de recepção com matriz explícita de permissões, além de administrador e profissional.
- [ ] Permitir cadastrar cliente e reservar pelo painel, com as mesmas regras de disponibilidade.
- [ ] Reagendar, cancelar com motivo, concluir e marcar falta.
- [ ] Configurar bloqueios pontuais, intervalos, férias, feriados, antecedência mínima e prazo de cancelamento.
- [ ] Permitir encaixe apenas por papel autorizado e com conflito explicitamente informado; não habilitar sobreposição silenciosa.
- [ ] Exibir agenda diária/semanal filtrada por profissional com busca e estados claros.

### OPS-02: financeiro básico consistente

- [ ] Registrar recebimentos manuais: valor, método, data, atendimento/plano e responsável.
- [ ] Separar receita prevista, recebida e estornada; unificar fórmulas do dashboard e financeiro.
- [ ] Evitar dupla contagem de assinatura e serviço consumido por crédito.
- [ ] Criar caixa diário com abertura, entradas/saídas, fechamento e registro de diferença.
- [ ] Calcular comissão por regra documentada e valores históricos; registrar repasse sem confundir comissão devida com paga.
- [ ] Converter dinheiro para centavos inteiros ou Decimal com regra uniforme de arredondamento.
- [ ] Permitir exportar agenda, clientes e financeiro em CSV, com autorização e proteção contra fórmulas em planilhas.

### OPS-03: acesso e onboarding

- [ ] Recuperação de senha com token de uso único, expiração, limitação de tentativas e resposta que não revele existência da conta.
- [ ] Guiar configuração inicial: estabelecimento → serviço → profissional → expediente → canal de mensagem → revisão do link público.
- [ ] Mostrar pendências que impedem receber reservas antes de divulgar o link.
- [ ] Disponibilizar contato acionável com suporte e ajuda contextual.

### Aceite e testes

Recepção opera um dia completo sem acessar configurações financeiras restritas; profissional vê apenas o escopo permitido; férias bloqueiam novas reservas; reagendamento preserva créditos; fechamento é conciliável; exportações pertencem apenas à empresa autenticada; primeiro estabelecimento chega ao estado apto a receber reservas sem assistência técnica.

## Fase 6 — Usabilidade, desempenho e operação — P1

### Tarefas

- [ ] Associar labels aos campos, corrigir nomes acessíveis, navegação por teclado, foco e contraste das jornadas principais.
- [ ] Colocar plano, ciclo e total antes da confirmação de checkout no celular.
- [ ] Padronizar moeda/data e nomear etapa final de acordo com o comportamento real: revisão/confirmação quando não houver cobrança.
- [ ] Implementar estados de carregamento, vazio, erro e repetição segura; preservar formulário em falhas recuperáveis.
- [ ] Revisar telas em 360/390/768 px e desktop; testar seleção de data, modais e navegação pelo teclado.
- [ ] Medir desempenho com volume representativo, paginar listagens e corrigir consultas repetidas ou sem limite.
- [ ] Implementar monitoramento de erros, disponibilidade, filas, pagamentos e banco com alertas e responsáveis.
- [ ] Executar restauração em ambiente isolado; registrar tempo de recuperação e possível perda de dados.
- [ ] Documentar implantação, migrações, rollback e atendimento de incidentes.
- [ ] Revisar rastreamento global, preferências de comunicação e processo de acesso/correção/exportação/exclusão de dados; restringir Pixel ao escopo comercial apropriado.
- [ ] Garantir coerência entre oferta, termos, privacidade e funções entregues; validar requisitos jurídicos aplicáveis separadamente.

### Aceite

Jornadas principais funcionam no celular e teclado; nenhum dado sensível nos logs; alertas testados; backup restaurado; desempenho medido sob a carga alvo acordada. Metas operacionais e limites de capacidade documentados antes de assumir compromissos comerciais.

## Fase 7 — Piloto e decisão de venda

Piloto proposto: 2–3 estabelecimentos, por 2–4 semanas, com onboarding acompanhado e canal de suporte definido. Iniciar somente após os testes de segurança e integridade passarem.

### Acompanhar

- Taxa de conclusão e abandono do agendamento.
- Conflitos, duplicidades e reservas perdidas.
- Falhas de login/OTP e entrega de mensagens.
- Consistência de créditos, recebimentos, comissões e assinatura SaaS.
- Erros por jornada, tempo de resposta e solicitações de suporte.

### Critérios para liberar venda

- [ ] Nenhuma falha P0/P1 pendente nas jornadas ofertadas.
- [ ] Testes críticos passam no pipeline e no ambiente de homologação.
- [ ] Nenhuma inconsistência de reserva/crédito/financeiro sem explicação e correção.
- [ ] Ciclo de cobrança e reprocessamento comprovados em sandbox.
- [ ] Restauração de backup e alertas comprovados.
- [ ] Oferta comercial corresponde à versão publicada.
- [ ] Capacidade de suporte e condições de operação definidas.

Se uma função não alcançar aceite, removê-la do escopo e da oferta inicial somente se as demais jornadas não dependerem dela. Falhas de segurança e integridade não podem ser adiadas dessa maneira.

## Fase 8 — Evolução após lançamento — P2

Ordem sugerida, a ajustar com necessidades e dados do piloto:

| Módulo | Entrega | Dependências e aceite |
| --- | --- | --- |
| Lista de espera | Registrar interesse e oferecer vaga liberada | Agenda e fila; evitar oferecer/confimar a mesma vaga simultaneamente |
| Sinal/Pix de reserva | Cobrança antecipada e política de devolução | Modelo financeiro e conta recebedora definidos; expiração, confirmação tardia e estorno testados |
| Google Calendar | Conexão, sincronização e conflitos | Definir direção da sincronização; tokens protegidos, revogação e reconciliação |
| Domínio próprio | Cadastro, verificação de domínio e HTTPS | Roteamento por host, prova de propriedade, cookies e isolamento testados |
| Comandas completas | Vários serviços/produtos, descontos e pagamentos parciais | Financeiro consistente; totais, arredondamentos e estornos conciliáveis |
| Estoque e produtos | Entradas, vendas, baixas e alertas | Comandas; movimentação auditável e concorrência controlada |
| Fidelidade e campanhas | Benefícios e reativação segmentada | Preferências, regras de créditos e mensageria comprovadas |
| Emissão fiscal | Integração com provedor fiscal | Requisitos locais levantados e homologação específica |
| Multiunidade | Gestão consolidada e acesso entre unidades | Modelagem explícita de organização/unidade e autorização |

Aplicativo nativo e automações com IA não são requisitos da primeira versão comercial. Avaliar demanda após o produto web estabilizar.

## Alterações propostas no modelo de dados

Nomes abaixo são conceituais; confirmar desenho final antes da migração.

| Área | Mudanças |
| --- | --- |
| Empresa e acesso | Fuso, papel, versão/revogação de sessão, estado comercial |
| Serviço/profissional | Arquivamento e restrições para preservar referências históricas |
| Reserva | Valores históricos, estados controlados, chave de idempotência e trilha de alterações |
| Disponibilidade | Bloqueios por data, períodos de ausência e regras de antecedência |
| Créditos | Movimentação auditável com evento único e saldo atualizado atomicamente |
| Cobrança SaaS | Pedido, assinatura externa, ciclo, valor, moeda, evento recebido/processado |
| Mensagens | Outbox, tentativas, próxima execução, ID externo e estado de entrega |
| Financeiro | Recebimento, estorno, sessão de caixa e repasse de comissão |
| Autenticação | Tokens de recuperação/OTP com hash, expiração e consumo único |
| Auditoria | Ator, empresa, ação, alvo, data e metadados mínimos sem segredos |

Estratégia: adicionar campos/tabelas compatíveis → preencher e validar dados existentes → publicar código compatível → ativar restrições → remover campos antigos em alteração posterior. Migrações de horário e valores exigem revisão própria. Rollback do código não desfaz automaticamente migração de dados.

## Matriz mínima de testes

| Grupo | Casos obrigatórios |
| --- | --- |
| Segurança | Projeções públicas, login social sem prova, vínculo fraudulento, duas empresas, permissões, sessão revogada, abuso de tentativas |
| Agenda | Choque simultâneo, sobreposição parcial, passado, virada do dia, ausência, recorrência e reagendamento |
| Créditos | Último crédito simultâneo, vigência, cancelamento repetido, falha parcial e nova tentativa |
| Cobrança | Evento duplicado/fora de ordem, assinatura inválida, valor incompatível, falha do provedor e recuperação |
| WhatsApp | OTP inválido/expirado/reutilizado, envio indisponível, job simultâneo, reinício e callback duplicado |
| Financeiro | Mudança de preço/comissão, avulso versus plano, pagamentos parciais quando ofertados, estorno e caixa |
| Interface | Primeiro acesso, reserva, cancelamento, recepção, assinatura e acessibilidade móvel/teclado |
| Operação | Banco temporariamente indisponível, rollback ensaiado, backup restaurado e alerta acionado |

## Regras de execução

1. Cada entrega deve incluir implementação, migração quando necessária, teste relevante, documentação de configuração e evidência de aceite.
2. Reaproveitar regras de domínio no servidor entre interface, API, jobs e recorrências.
3. Não aplicar mudanças destrutivas em dados reais sem backup, ensaio e revisão do impacto.
4. Não considerar build bem-sucedida como comprovação de jornada de negócio.
5. Atualizar este checklist ao concluir cada item e registrar limitações conhecidas.

**Primeira entrega recomendada:** fase 0, seguida imediatamente por SEC-01, SEC-02 e SEC-03. A sequência resolve primeiro exposição de credenciais, autenticação indevida e acesso entre empresas.
