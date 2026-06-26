import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[100px] z-0"></div>

      {/* Conteúdo Principal (Glassmorphism) */}
      <div className="glass-panel p-12 max-w-2xl w-full text-center z-10 flex flex-col items-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          SaaS de <span className="text-gradient-gold">Agendamento</span>
        </h1>
        
        <p className="text-lg text-gray-300 max-w-lg">
          Plataforma premium para gestão de barbearias e salões. Design de alta conversão focado na melhor experiência para o cliente.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/brutusbarbearia"
            className="px-8 py-3 bg-primary text-background font-semibold rounded-full hover:bg-primary-hover transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          >
            Ver Exemplo: Brutus Barbearia
          </Link>
        </div>
      </div>
    </main>
  );
}
