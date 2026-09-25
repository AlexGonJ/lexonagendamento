import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | LexonAgenda",
  description: "Estrutura em elaboração para a Política de Privacidade da Lexon Agenda",
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="min-h-screen bg-slate-950 pt-32 pb-16 px-6 lg:px-8 text-slate-300">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3">Documento em elaboração</p>
        <h1 className="text-3xl font-bold text-white mb-6">Política de Privacidade</h1>
        <p className="mb-8 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 leading-relaxed">
          Esta página já está publicada como espaço reservado. A política final depende do inventário dos dados e integrações realmente utilizados pela Lexon e pelos estabelecimentos. O conteúdo abaixo é um roteiro de elaboração, não uma política vigente.
        </p>

        <div className="space-y-7 leading-relaxed">
          <section><h2 className="text-xl font-semibold text-white mb-2">Controladores e dados tratados</h2><p>Identificar a Lexon e os estabelecimentos em seus respectivos papéis, e mapear dados de cadastro, autenticação, agenda, clientes, pagamentos, suporte, cookies e telemetria.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Finalidades e bases legais</h2><p>Relacionar cada categoria de dado à finalidade, base legal aplicável, necessidade e prazo de retenção, incluindo comunicações operacionais e marketing quando houver.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Compartilhamento e transferências</h2><p>Inventariar provedores de hospedagem, banco de dados, autenticação, pagamento, análise e WhatsApp, indicando papéis, dados envolvidos e eventuais transferências internacionais.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Segurança, retenção e direitos</h2><p>Descrever medidas e limites reais, períodos de retenção, exclusão e exportação, canal para solicitações de titulares e forma de verificar e responder aos pedidos.</p></section>
          <section><h2 className="text-xl font-semibold text-white mb-2">Cookies e contato</h2><p>Documentar cookies e pixels, escolha/consentimento aplicável, contato do encarregado quando definido e canal para dúvidas. Durante a elaboração, fale com a Lexon pelo <a className="text-blue-400 hover:underline" href="https://wa.me/5538999023012" target="_blank" rel="noopener noreferrer">WhatsApp (38) 99902-3012</a>.</p></section>
        </div>
      </div>
    </main>
  );
}
