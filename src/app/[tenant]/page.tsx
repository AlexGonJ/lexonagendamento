import Link from 'next/link';

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const resolvedParams = await params;
  const tenantSlug = resolvedParams.tenant;

  // No futuro, buscaremos os dados reais via Prisma:
  // const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }})
  const mockTenant = {
    name: tenantSlug === 'brutusbarbearia' ? 'Brutus Barbearia' : 'Salão Premium',
    description: 'A melhor barbearia da região. Profissionais qualificados e ambiente climatizado para o seu conforto.',
    coverUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
  };

  return (
    <main className="min-h-screen bg-background relative pb-24">
      {/* Imagem de Capa */}
      <div 
        className="w-full h-64 md:h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${mockTenant.coverUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Info do Estabelecimento */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <img 
            src={mockTenant.logoUrl} 
            alt={mockTenant.name} 
            className="w-32 h-32 rounded-full border-4 border-background shadow-lg object-cover"
          />
          <div className="mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">{mockTenant.name}</h1>
            <p className="text-gray-400 mt-2 max-w-xl">{mockTenant.description}</p>
          </div>
        </div>

        {/* Separador Dourado */}
        <div className="w-full h-px bg-gradient-to-r from-primary to-transparent my-8 opacity-50" />

        {/* Seção de Serviços em Destaque */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-primary rounded-full block"></span>
            Nossos Serviços
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Serviço Mockado 1 */}
            <div className="glass-panel p-4 flex justify-between items-center hover:border-primary/50 transition-colors">
              <div>
                <h3 className="font-medium text-lg">Corte Degradê</h3>
                <p className="text-gray-400 text-sm">45 min</p>
              </div>
              <p className="text-primary font-bold text-xl">R$ 50,00</p>
            </div>
            {/* Serviço Mockado 2 */}
            <div className="glass-panel p-4 flex justify-between items-center hover:border-primary/50 transition-colors">
              <div>
                <h3 className="font-medium text-lg">Barba Terapia</h3>
                <p className="text-gray-400 text-sm">30 min</p>
              </div>
              <p className="text-primary font-bold text-xl">R$ 35,00</p>
            </div>
          </div>
        </section>

        {/* Botão Flutuante (Floating Action Button - FAB) */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background to-transparent flex justify-center z-50">
          <Link 
            href={`/${tenantSlug}/book`}
            className="w-full max-w-md bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-background font-bold text-lg py-4 rounded-full text-center shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all transform hover:scale-105"
          >
            Agendar Agora
          </Link>
        </div>
      </div>
    </main>
  );
}
