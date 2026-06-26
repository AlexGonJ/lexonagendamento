import { getEmployees, createEmployee, deleteEmployee } from "@/actions/employees";
import Link from "next/link";

export default async function AdminEmployees() {
  const employees = await getEmployees();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Profissionais</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna da Esquerda: Formulário de Novo Profissional */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cadastrar Profissional</h2>

            <form action={createEmployee} className="space-y-4" encType="multipart/form-data">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Marcos Silva"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade / Cargo *</label>
                <input
                  type="text"
                  name="role"
                  required
                  placeholder="Ex: Barbeiro Sênior"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <hr className="border-gray-200" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acesso ao Sistema</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (para login)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ex: marcos@barbearia.com"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Deixe em branco se o profissional não precisar de acesso.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isAdmin"
                  id="isAdmin-new"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isAdmin-new" className="text-sm font-medium text-gray-700">
                  Administrador do painel
                </label>
              </div>

              <hr className="border-gray-200" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil (Opcional)</label>
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">O rosto será focado e recortado em formato quadrado automaticamente.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
              >
                Salvar Profissional
              </button>
            </form>
          </div>
        </div>

        {/* Coluna da Direita: Lista de Profissionais */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-700">Profissional</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Cargo / Especialidade</th>
                    <th className="p-4 text-sm font-semibold text-gray-700">Acesso</th>
                    <th className="p-4 text-sm font-semibold text-gray-700 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Nenhum profissional cadastrado ainda. Use o formulário ao lado.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 flex items-center gap-4">
                          <img
                            src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`}
                            alt={emp.name}
                            className="w-12 h-12 rounded-full object-cover bg-gray-200 border border-gray-200"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            {emp.isAdmin && (
                              <span className="inline-block mt-0.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-700">{emp.role}</td>
                        <td className="p-4 text-sm text-gray-500">
                          {emp.email ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                              {emp.email}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Sem acesso</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Link
                              href={`/admin/employees/${emp.id}/edit`}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                              Editar
                            </Link>
                            <Link
                              href={`/admin/employees/${emp.id}/schedule`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            >
                              Agenda
                            </Link>
                            <form action={async () => {
                              "use server";
                              await deleteEmployee(emp.id);
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
