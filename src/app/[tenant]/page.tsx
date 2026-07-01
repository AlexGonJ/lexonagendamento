import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCurrentClientSession } from '@/actions/auth';

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const resolvedParams = await params;
  const tenantSlug = resolvedParams.tenant;

  // Busca os dados do tenant e seus serviços direto do Prisma
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      services: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tenant) {
    notFound();
  }

  const clientSession = await getCurrentClientSession();

  // Fallbacks para as imagens e textos caso não estejam configurados
  const coverUrl = tenant.coverUrl || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
  const logoUrl = tenant.logoUrl || 'https://images.unsplash.com/photo-1599305090598-fe179d501227?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
  const description = tenant.description || 'A melhor barbearia da região. Profissionais qualificados e ambiente climatizado para o seu conforto.';

  return (
    <main className="min-h-screen bg-background relative pb-24">
      {/* Imagem de Capa */}
      <div 
        className="w-full h-64 md:h-80 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${coverUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        {/* Barra superior/Botão da conta do cliente */}
        <div className="absolute top-4 right-4 z-20">
          <Link
            href={`/${tenantSlug}/perfil`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-slate-900/80 backdrop-blur border border-white/10 shadow hover:bg-slate-900 transition-all"
          >
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {clientSession ? `Olá, ${clientSession.name.split(' ')[0]}` : 'Meus Agendamentos'}
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Info do Estabelecimento */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={logoUrl} 
            alt={tenant.name} 
            className="w-32 h-32 rounded-full border-4 border-background shadow-lg object-cover"
          />
          <div className="mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">{tenant.name}</h1>
            <p className="text-gray-400 mt-2 max-w-xl">{description}</p>
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
            {tenant.services.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Nenhum serviço cadastrado ainda.</p>
            ) : (
              tenant.services.map((service) => (
                <div 
                  key={service.id} 
                  className="glass-panel p-4 flex justify-between items-center hover:border-primary/50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={service.imageUrl || 'https://placehold.co/150x150/cccccc/ffffff?text=Sem+Foto'} 
                      alt={service.name} 
                      className="w-16 h-16 rounded-xl object-cover shadow-sm" 
                    />
                    <div>
                      <h3 className="font-semibold text-lg text-white">{service.name}</h3>
                      <p className="text-gray-400 text-sm">{service.duration} min</p>
                      {service.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-1">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-primary font-bold text-xl whitespace-nowrap">
                    R$ {service.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              ))
            )}
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
