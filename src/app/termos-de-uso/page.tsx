import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | LexonAgenda",
  description: "Termos de uso da plataforma LexonAgenda",
};

export default function TermosDeUso() {
  return (
    <main className="min-h-screen bg-slate-950 pt-32 pb-16 px-6 lg:px-8 text-slate-300">
      <div className="max-w-3xl mx-auto prose prose-invert prose-slate prose-a:text-blue-400">
        <h1 className="text-3xl font-bold text-white mb-8">Termos de Uso</h1>
        <p className="mb-4">Última atualização: 28 de julho de 2026</p>
        
        <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Aceitação dos Termos</h2>
        <p className="mb-4">
          Ao acessar e usar a plataforma LexonAgenda, você concorda em cumprir e ficar vinculado a estes Termos de Uso.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Uso da Plataforma</h2>
        <p className="mb-4">
          Você se compromete a usar a plataforma apenas para fins legais e de maneira que não infrinja os direitos de terceiros, nem restrinja ou iniba o uso da plataforma por outras pessoas.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Contas de Usuário</h2>
        <p className="mb-4">
          Para utilizar alguns recursos da plataforma, pode ser necessário criar uma conta. Você é responsável por manter a confidencialidade das informações da sua conta e senha.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Limitação de Responsabilidade</h2>
        <p className="mb-4">
          A LexonAgenda não será responsável por quaisquer danos indiretos, incidentais, especiais ou consequentes resultantes do uso ou da incapacidade de usar a plataforma.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Modificações dos Termos</h2>
        <p className="mb-4">
          Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso contínuo da plataforma após tais alterações constitui sua aceitação dos novos termos.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Contato</h2>
        <p className="mb-4">
          Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco através do WhatsApp: <a href="https://wa.me/5538999023012" className="text-blue-400 hover:underline">(38) 99902-3012</a>.
        </p>
      </div>
    </main>
  );
}
