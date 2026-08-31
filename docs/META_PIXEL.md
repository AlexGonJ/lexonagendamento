# Rastreamento Meta Pixel

## Estratégia

O projeto usa um único Pixel Meta, inicializado em `src/components/MetaPixel.tsx`. A separação entre landing pages é feita pela URL acessada e pelos parâmetros enviados nos eventos. Essa estratégia mantém públicos, histórico e aprendizado de campanha na mesma fonte de dados.

Não crie um novo Pixel a cada nova landing page. Ao publicar uma página, crie no Gerenciador de Eventos uma conversão personalizada com a regra de URL correspondente.

## Eventos enviados

| Evento | Quando acontece | Dados relevantes |
| --- | --- | --- |
| `PageView` | A cada carregamento ou mudança de rota | URL da landing page |
| `InitiateCheckout` | Envio do formulário para criar e pagar uma assinatura | plano, valor e moeda |
| `Contact` | Abertura do redirecionamento para WhatsApp | landing, intenção e plano quando disponível |
| `CliqueWhatsApp` | Mesmo contato, como evento personalizado para análise | `landing_page`, `intent`, `plan` |
| `CliqueAssinatura` | Clique em um CTA de assinatura da landing principal | plano |

O evento `Contact` é o evento padrão indicado para otimização de campanhas de contato. `CliqueWhatsApp` complementa a análise do funil.

## Intenções de contato

Os links de WhatsApp podem informar a origem na query string. Os valores usados atualmente são:

| `intent` | Significado |
| --- | --- |
| `subscription` | Interesse em assinar um plano |
| `plan_interest` | Interesse em um plano de landing por nicho |
| `whatsapp_contact` | Contato comercial geral |
| `checkout_help` | Pessoa estava no checkout e pediu ajuda antes de concluir |

O caso `checkout_help` é um indicador de necessidade de suporte durante a tentativa de compra. Ele não prova sozinho que a compra foi abandonada: a pessoa ainda pode voltar e concluir o pagamento.

## Configuração no Gerenciador de Eventos

1. Abra **Gerenciador de Eventos → Fontes de dados** e selecione o Pixel da Lexon.
2. Em **Testar eventos**, visite cada landing, envie o formulário de checkout e clique no link de WhatsApp. Confirme o recebimento dos eventos acima.
3. Crie conversões personalizadas para cada landing usando o evento `PageView` e uma regra de URL, por exemplo URL contém `/barbearias` ou `/saloes`.
4. Crie conversões para `InitiateCheckout` e `Contact` para medir interesse e conversas.
5. Para medir pedidos de ajuda no checkout, filtre o evento personalizado `CliqueWhatsApp` por `intent = checkout_help`.

## Venda confirmada

O navegador não deve registrar `Purchase` ao clicar no botão de pagamento. O evento de venda precisa ser emitido somente após o pagamento aprovado pelo Mercado Pago.

O próximo passo recomendado é enviar `Purchase` pela Conversions API a partir de `src/app/api/webhooks/mercadopago/route.ts`, usando um token de acesso da Meta mantido apenas no servidor. Assim, uma venda aprovada fora do site também será contabilizada com mais confiabilidade.

## Privacidade

Antes de carregar o Pixel em produção, obtenha o consentimento aplicável para cookies e marketing e mantenha a política de privacidade atualizada. Não envie dados pessoais em texto puro nos parâmetros dos eventos.
