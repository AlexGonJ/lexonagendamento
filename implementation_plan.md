# Plano de Implementação - Exibição de Horários Indisponíveis na UI

Este plano detalha a conferência das regras de agendamento e a alteração da interface de usuário (UI) para que todos os horários do profissional no dia sejam exibidos, destacando os indisponíveis de forma visual (mais claros/faded) e impedindo o clique neles.

---

## 1. Conferência do Sistema de Agendamento

**Pergunta do Usuário:** *"Quando os horários estão sendo marcados pelos clientes eles estão sendo retirados da disponibilidade de marcação?"*

**Análise:**
Sim. Atualmente, os horários marcados são retirados da disponibilidade. No arquivo `src/actions/availability.ts`, a função `getAvailableSlots` realiza o seguinte fluxo:
1. Carrega os agendamentos já marcados para o dia (`client.booking.findMany`) cujo status não seja `CANCELLED`.
2. Mapeia esses agendamentos para blocos de minutos ocupados (`occupiedBlocks`).
3. Ao gerar os slots possíveis de 15 em 15 minutos baseados na jornada de trabalho do funcionário, a função faz uma validação de conflito de intervalo (`hasConflict`).
4. Somente os horários **sem conflito** e **que não estão no passado** são adicionados à lista `availableSlots` e retornados ao frontend. Portanto, qualquer horário marcado por um cliente deixa de ser exibido como disponível no fluxo.

---

## 2. Mudança Proposta

Para permitir que a interface exiba todos os horários (disponíveis e indisponíveis diferenciados), precisamos de uma nova função na API que retorne a lista completa de slots gerados para o dia junto com o status de disponibilidade (disponível ou ocupado/passado).

### Ações Propostas:
1. **Nova Ação Server-side (`getSlotsWithAvailability`):**
   Criar esta nova função em `src/actions/availability.ts` para gerar todos os horários possíveis do dia de trabalho do funcionário, mas incluindo uma propriedade `available: boolean`.
   
2. **Compatibilidade de API:**
   Refatorar a função existente `getAvailableSlots` para utilizar `getSlotsWithAvailability` e apenas filtrar os disponíveis, mantendo a compatibilidade com a verificação de segurança no momento da reserva realizada em `src/actions/booking.ts` e no endpoint de API `src/app/api/[tenant]/book/route.ts`.

3. **Modificação na UI (`BookingFlow.tsx`):**
   - Alterar o componente `src/components/BookingFlow.tsx` para importar `getSlotsWithAvailability` no lugar de `getAvailableSlots`.
   - Modificar o estado `availableTimes` de `string[]` para `timeSlots` com estrutura `{ time: string; available: boolean }[]`.
   - Na etapa de renderização (Passo 3), iterar sobre todos os horários da lista. Os indisponíveis (`available === false`) serão renderizados com estilos que indicam indisponibilidade (opacidade reduzida, cor cinza suave, sem efeitos hover de destaque) e com o atributo `disabled` para evitar a seleção e clique.

---

## Proposed Changes

### [Backend] Abstração de Disponibilidade

#### [MODIFY] [availability.ts](file:///c:/Users/Alex/Desktop/Projetos/saas-agendamento/src/actions/availability.ts)
- Adicionar a função `getSlotsWithAvailability` retornando `{ time: string; available: boolean }[]`.
- Ajustar `getAvailableSlots` para consumir `getSlotsWithAvailability` filtrando apenas os ativos, preservando a assinatura original.

### [Frontend] Fluxo de Agendamento

#### [MODIFY] [BookingFlow.tsx](file:///c:/Users/Alex/Desktop/Projetos/saas-agendamento/src/components/BookingFlow.tsx)
- Atualizar a importação de `getAvailableSlots` para `getSlotsWithAvailability`.
- Ajustar o estado e o efeito que busca os horários.
- Modificar o mapping do grid de horários no Passo 3. Aplicar classes de estilização condicional (ex: `disabled:opacity-40 cursor-not-allowed` ou similar) e a propriedade `disabled={!slot.available}` nos botões de horários indisponíveis.

---

## Verification Plan

### Automated Tests
- Executar o comando de build para garantir que não existam erros de compilação ou de tipos no TypeScript:
  ```powershell
  npm run build
  ```

### Manual Verification
- Verificar se a interface renderiza todos os horários do profissional selecionado.
- Verificar se os horários já reservados aparecem de forma mais clara (faded) e não são selecionáveis/clicáveis.
- Verificar se os horários livres aparecem de forma vibrante e continuam permitindo o agendamento com sucesso.
