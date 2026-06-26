import { getServices, deleteService } from "@/actions/services";
import { getEmployees } from "@/actions/employees";
import CreateServiceForm from "./components/CreateServiceForm";
import EditServiceButton from "./components/EditServiceButton";

export const dynamic = 'force-dynamic';

export default async function AdminServices() {
  const [services, employees] = await Promise.all([
    getServices(),
    getEmployees()
  ]);

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
            
            <CreateServiceForm employees={employees} />
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
                          <div className="flex items-center justify-center">
                            <EditServiceButton service={service} employees={employees} />
                            <form action={async () => {
                              "use server";
                              await deleteService(service.id);
                            }}>
                              <button type="submit" className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">
                                Excluir
                              </button>
                            </form>
                          </div>
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
