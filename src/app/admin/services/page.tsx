import { getServices, createService, deleteService } from "@/actions/services";

export default async function AdminServices() {
  // Busca os serviços direto do banco via Prisma
  const services = await getServices();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Serviços</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna da Esquerda: Formulário de Novo Serviço */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Serviço</h2>
            
            <form action={createService} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="Ex: Corte Degradê"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  name="description" 
                  placeholder="Ex: Corte com máquina e tesoura"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    name="price"
                    step="0.01" 
                    required 
                    placeholder="50.00"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (Min)</label>
                  <input 
                    type="number" 
                    name="duration" 
                    required 
                    placeholder="45"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select 
                  name="category"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Cabelo">Cabelo</option>
                  <option value="Barba">Barba</option>
                  <option value="Combo">Combo</option>
                  <option value="Estética">Estética</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Serviço (Opcional)</label>
                <input 
                  type="file" 
                  name="imageFile" 
                  accept="image/*"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">A imagem será cortada automaticamente e otimizada (WebP).</p>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
              >
                Salvar Serviço
              </button>
            </form>
          </div>
        </div>

        {/* Coluna da Direita: Lista de Serviços */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-700">Serviço</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Categoria</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Preço</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Duração</th>
                    <th className="p-4 text-sm font-semibold text-gray-700 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhum serviço cadastrado ainda. Use o formulário ao lado.
                      </td>
                    </tr>
                  ) : (
                    services.map((service) => (
                      <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 flex items-center gap-4">
                          <img 
                            src={service.imageUrl || 'https://placehold.co/150x150/cccccc/ffffff?text=Sem+Foto'} 
                            alt={service.name} 
                            className="w-12 h-12 rounded-lg object-cover bg-gray-200 border border-gray-200"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-gray-500 max-w-[200px] truncate">{service.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-700">{service.category}</td>
                        <td className="p-4 text-sm font-medium text-green-600">
                          R$ {service.price.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm text-gray-700">{service.duration} min</td>
                        <td className="p-4 text-center">
                          <form action={async () => {
                            "use server";
                            await deleteService(service.id);
                          }}>
                            <button type="submit" className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">
                              Excluir
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
