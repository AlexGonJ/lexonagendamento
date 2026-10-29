# Plano de testes manuais de usabilidade — Lexon Agenda

Objetivo: verificar se uma pessoa consegue descobrir, contratar e usar o sistema sem ajuda da equipe de desenvolvimento. Este roteiro complementa o [checklist técnico do beta](CHECKLIST_BETA.md); não substitui os testes de segurança, cobrança ou recuperação de dados.

## Como executar e registrar

- Ambiente/URL: Local/chrome  Versão ou commit: ____________________
- Data: 25/09/26  Executor: Alexander  Navegador e dispositivo: Chrome/dellg15
- Empresa de teste: ____________________  Plano testado: ____________________
- Use apenas empresas, números de telefone e meios de pagamento autorizados para teste. Identifique registros temporários com `TESTE BETA` e anote os IDs antes de removê-los.
- Marque `[x]` somente após observar o resultado esperado. Se falhar, mantenha `[ ]`, registre tela, URL, horário, passos para reproduzir e impacto na tabela final.
- Execute os fluxos críticos em computador e celular real; repita pelo menos o agendamento em outro navegador ou janela anônima.

## Ordem sugerida

1. **Preparação (15 min):** confirmar ambiente, contas de cliente, funcionário, administrador e Super Admin; separar duas empresas de teste e um telefone autorizado.
2. **Primeira impressão e compra (30 min):** páginas públicas, oferta, cadastro e checkout de sandbox.
3. **Operação inicial (30 min):** configurar empresa, equipe, serviços e horários.
4. **Jornada do cliente (45 min):** reservar, visualizar, reagendar e cancelar; comparar as três visões do horário.
5. **Operação diária (30 min):** agenda, estoque por plano, financeiro e permissões.
6. **Exceções e revisão (30 min):** indisponibilidade, erros de formulário, celular, teclado e mensagens; registrar bloqueadores.

## 1. Oferta e entrada no produto

- [ x] Abrir `/`, `/barbearias` e `/saloes` no celular e no computador. Identificar em até 30 segundos o que o produto faz e como iniciar.
- [ x] Conferir nas três páginas preços de R$ 59, R$ 119 e R$ 229, primeiro mês grátis, limites de 2/5/8 profissionais e recursos por plano; comparar com o Super Admin e o checkout.
- [ x] Conferir que Agenda não promete estoque; Profissional oferece estoque básico; Automação oferece alertas de reposição. Verificar no painel que a função entregue corresponde à promessa.
- [ ] Clicar no CTA de **cada plano**, em cada página. Confirmar que o destino identifica o plano escolhido e permite continuar sem dúvida. (hoje ainda esta direcionando para o whatsapp, o pagamento direto pela página ainda não está ativa)
- [ ] Entender antes da compra o que é cobrado pela plataforma e o que pode ser cobrado pela Meta/WhatsApp. (não ficou claro, fala taxa à parte, mas não indica que são taxas da meta, também deveria ter um numero pequeno com asterisco para indicar o que cada coisa é na parte de letras pequenas abaixo nas landing pages)
- [ x] Abrir termos, privacidade e suporte. Confirmar links funcionais, conteúdo legível e um canal de contato claro. (não encontrei e nem sei se eles realmente existem)
- [ ] No sandbox de pagamento, simular sucesso, recusa e abandono. Confirmar mensagens e estado da assinatura sem cobrança real. (não abriu a página de cobrança)

## 2. Primeira configuração da empresa

- [ x] Criar empresa de teste com dados fictícios e concluir o fluxo de preparação sem instruções externas.
- [x ] Cadastrar administrador, serviço com preço e duração, profissional, expediente, pausa e contato público.
- [ x] Abrir a página pública da empresa e conferir nome, serviços, profissionais, preços, contato, identidade visual e horários corretos.
- [x ] Tentar salvar formulários incompletos ou inválidos. Confirmar mensagem específica ao lado do campo e preservação dos dados já preenchidos.
- [ x] Sair e entrar novamente. Confirmar que as configurações permanecem salvas e que há caminho claro para editá-las.
- [ ] Conferir que a capacidade do plano limita a criação de profissionais com mensagem compreensível, sem dados parcialmente gravados.

## 3. Reserva do ponto de vista do cliente — bloqueador de liberação

- [x ] Em `/<empresa>/book`, escolher serviço, profissional, data e horário disponíveis sem ajuda; concluir com telefone de teste autorizado.
- [ ] Confirmar OTP recebido, validade e mensagem correta para código errado, expirado ou envio indisponível; não expor o código em URL ou tela pública.
- [ ] Depois de reservar, comparar **data, hora, serviço, profissional e preço** na confirmação, em `/<empresa>/perfil`, no painel `/admin/bookings` e na mensagem enviada. Todos devem coincidir no fuso da empresa.
- [ x] Recarregar as páginas e entrar novamente. A reserva deve continuar visível com o mesmo horário e estado.
- [x ] Tentar o mesmo horário com outro cliente; o sistema deve impedir a segunda reserva e oferecer alternativa clara.
- [x ] Tentar reservar no passado, fora do expediente, durante pausa, feriado, bloqueio iniciado no dia anterior e horário ocupado. Nenhum deve ser oferecido ou aceito.
- [ x] Fazer duas tentativas simultâneas para o mesmo profissional/horário em navegadores diferentes; apenas uma pode ser confirmada.
- [ ] Reagendar e cancelar uma reserva. Confirmar imediatamente o mesmo estado para cliente e equipe; repetir o clique e verificar que não duplica alteração ou cobrança.
- [ ] Testar a mensagem de agenda vazia, nenhum profissional disponível e falha temporária de rede. Deve haver orientação clara para tentar outra data ou voltar.

## 4. Rotina de administrador e funcionário

- [ x] O administrador encontra rapidamente agenda de hoje, próximos atendimentos e ações de cadastrar serviço/profissional.
- [ ] Criar, editar e desativar serviço; conferir efeito na página pública sem alterar preço histórico de reservas antigas.
- [ ] Configurar expediente, folga e bloqueio; conferir no agendamento público que horários não aparecem quando indisponíveis.
- [ ] Mudar o status de atendimento pela interface. Impedir status inválido e reativação que conflite com outra reserva.
- [ x] Entrar como funcionário. Conferir que vê apenas dados e ações permitidos; acesso direto a páginas administrativas deve ser recusado.
- [ ] Entrar como cliente. Conferir que enxerga apenas as próprias reservas e não consegue abrir dados administrativos.
- [ ] Com duas empresas de teste, conferir que reservas, clientes, produtos, financeiro e exportações de uma não aparecem na outra.
- [ ] Exportar clientes, agendamentos e financeiro, se disponíveis. Abrir os arquivos, validar colunas, datas, valores e ausência de dados de outra empresa.

## 5. Estoque e recursos do plano

- [ ] Sem a função, o menu de estoque não aparece e abrir `/admin/inventory` diretamente não concede acesso.
- [ ] No Profissional, cadastrar produto com nome, SKU, unidade, custo e saldo inicial; confirmar saldo e histórico. Campos de mínimo/alertas não devem ser apresentados como inclusos.
- [ ] Registrar entrada, saída e ajuste; conferir saldo final e responsável por cada movimentação.
- [ ] Tentar saída maior que o saldo; confirmar recusa clara e saldo/histórico inalterados.
- [ ] No Automação, definir mínimo acima de zero, reduzir saldo até o limite e verificar alerta; mínimo zero não deve gerar alerta indevido.
- [ ] Editar e arquivar produto de teste. Confirmar que sai da lista ativa sem apagar seu histórico.
- [ ] Conferir que mudança de recurso no Super Admin passa a valer na empresa correta e não altera outras empresas.

## 6. Cobrança, WhatsApp e confiança

- [ ] Após compra no sandbox, confirmar plano, preço, data de renovação e primeiro mês grátis no painel da empresa.
- [ ] Com pagamento pendente ou recusado, confirmar que não há ativação indevida e que o usuário entende como resolver.
- [ ] Simular renovação, cancelamento e recuperação em sandbox. Confirmar acesso coerente em cada estado.
- [ ] Com número autorizado, conferir confirmação e lembrete de reserva: destinatário, nome, serviço, data, hora e fuso.
- [ ] Se envio de WhatsApp falhar, a interface não deve afirmar que a mensagem foi entregue; a reserva não pode ser criada em duplicidade.
- [ ] Confirmar que plano Profissional comunica add-on opcional e Automação comunica o que inclui, inclusive eventuais cobranças da Meta.

## 7. Apresentação e acessibilidade

- [ ] Percorrer os fluxos principais em tela estreita (aprox. 390 px) e em computador. Não deve haver corte de botões, texto sobreposto ou rolagem horizontal que esconda ação.
- [ ] Usar apenas teclado para entrar, reservar e salvar formulários: ordem do Tab lógica, foco visível, Enter/Espaço funcionando e possibilidade de voltar.
- [ ] Conferir rótulos de todos os campos com leitor de tela ou inspeção de acessibilidade; erros devem informar qual campo corrigir.
- [ ] Verificar texto em português, formato `R$ 1.234,56`, datas `dd/mm/aaaa`, horário 24h, telefone e links clicáveis.
- [ ] Em conexão lenta e após erro do servidor, verificar indicador de progresso, botão sem cliques duplicados e recuperação sem perder todo o formulário.
- [ ] Pedir a uma pessoa sem familiaridade com o sistema que faça uma reserva e a encontre novamente. Anotar dúvidas e pontos em que precisou de ajuda.

## Critérios para liberar um piloto

- [ ] Nenhum defeito aberto permite reserva duplicada, horário incorreto, acesso a dados de outra empresa ou cobrança incorreta.
- [ ] Todos os itens da seção 3 passaram com evidências em celular e computador.
- [ ] Compra, OTP e WhatsApp foram testados no ambiente adequado com contas e números autorizados, ou estão explicitamente fora do escopo do piloto.
- [ ] Cada falha restante tem prioridade, responsável e decisão explícita de aceitar ou corrigir antes do piloto.
- [ ] Responsável pelo produto revisou este arquivo, o [checklist técnico](CHECKLIST_BETA.md) e as [evidências da rodada anterior](EVIDENCIAS_BETA_2026-09-24.md).

## Registro de execução e defeitos

| ID | Item/fluxo | Resultado (passou/falhou/não executado) | Evidência (link, captura, ID) | Defeito/impacto | Responsável | Data |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

**Decisão sobre o piloto:** [ ] Liberado  [ ] Não liberado  [ ] Liberado com restrições documentadas  
**Responsável e data:** ____________________
