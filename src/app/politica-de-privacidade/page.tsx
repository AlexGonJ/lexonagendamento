import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | LexonAgenda",
  description: "Política de Privacidade da plataforma LexonAgenda",
};

export default function PoliticaDePrivacidade() {
  return (
    <main className="min-h-screen bg-slate-950 pt-32 pb-16 px-6 lg:px-8 text-slate-300">
      <div className="max-w-3xl mx-auto prose prose-invert prose-slate prose-a:text-blue-400">
        <h1 className="text-3xl font-bold text-white mb-8">Política de Privacidade</h1>
        <p className="mb-4">Última atualização: 28 de julho de 2026</p>
        
        <p className="mb-4">
          A sua privacidade é importante para nós. É política da LexonAgenda respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Coleta de Dados</h2>
        <p className="mb-4">
          Coletamos informações pessoais que você nos fornece voluntariamente ao criar uma conta, preencher formulários ou entrar em contato conosco. Essas informações podem incluir nome, e-mail, número de telefone e dados de pagamento.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Uso dos Dados</h2>
        <p className="mb-4">
          Utilizamos suas informações para:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Fornecer, operar e manter nossa plataforma;</li>
          <li>Melhorar, personalizar e expandir nossos serviços;</li>
          <li>Entender e analisar como você usa nossa plataforma;</li>
          <li>Processar transações e gerenciar sua conta;</li>
          <li>Comunicar-nos com você, incluindo atendimento ao cliente.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Compartilhamento de Dados</h2>
        <p className="mb-4">
          Não compartilhamos suas informações pessoais publicamente ou com terceiros, exceto quando exigido por lei ou para a prestação de nossos serviços (ex: gateways de pagamento).
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Segurança dos Dados</h2>
        <p className="mb-4">
          Adotamos medidas de segurança adequadas para proteger contra acesso, alteração, divulgação ou destruição não autorizada dos seus dados pessoais.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Seus Direitos (LGPD)</h2>
        <p className="mb-4">
          De acordo com a LGPD, você tem o direito de solicitar o acesso, correção, atualização ou exclusão dos seus dados pessoais. Você também pode revogar seu consentimento a qualquer momento.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Contato</h2>
        <p className="mb-4">
          Para exercer seus direitos ou tirar dúvidas sobre nossa Política de Privacidade, entre em contato conosco através do WhatsApp: <a href="https://wa.me/5538999023012" className="text-blue-400 hover:underline">(38) 99902-3012</a>.
        </p>
      </div>
    </main>
  );
}
