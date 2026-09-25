import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | LexonAgenda",
  description: "Estrutura em elaboração para os Termos de Uso da Lexon Agenda",
};

export default function TermosDeUso() {
  return (
    <main className="min-h-screen bg-slate-950 pt-32 pb-16 px-6 lg:px-8 text-slate-300">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">Documento em elaboração</p>
        <h1 className="text-3xl font-bold text-white mb-6">Termos de Uso</h1>
        <p className="mb-8 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 leading-relaxed">
          Esta página já está publicada como espaço reservado. Os termos contratuais ainda precisam ser escritos, revisados e aprovados pela Lexon antes de serem apresentados como vigentes. O texto abaixo é um roteiro de elaboração, não um contrato.
        </p>
        <p className="mb-8 text-xs text-slate-500">Versão do rascunho: 2026-09-25-draft</p>

        <div className="space-y-7 leading-relaxed">
          <section><h2 className="text-xl font-semibold text-white mb-2">Identificação das partes</h2><p>Inserir a razão social, CNPJ, endereço e canais oficiais da Lexon, além da definição de quem pode contratar em nome do estabelecimento.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Serviço e responsabilidades</h2><p>Descrever as funções da plataforma, requisitos, disponibilidade, suporte, responsabilidades da Lexon e do estabelecimento e regras para usuários e clientes finais.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Planos, teste e cobrança</h2><p>Documentar planos, período grátis, preços, ciclo de cobrança, meios de pagamento, add-ons do WhatsApp, tarifas cobradas por terceiros, renovação, inadimplência, cancelamento e reembolso.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Conta, conteúdo e encerramento</h2><p>Definir criação e segurança de contas, uso aceitável, propriedade intelectual, tratamento dos dados ao encerrar a conta, suspensão e mudanças do serviço ou destes termos.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Contato</h2><p>Para suporte durante a elaboração, fale com a Lexon pelo <a className="text-blue-400 hover:underline" href="https://wa.me/5538999023012" target="_blank" rel="noopener noreferrer">WhatsApp (38) 99902-3012</a>.</p></section>
        </div>
      </div>
    </main>
  );
}
