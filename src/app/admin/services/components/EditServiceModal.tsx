"use client";

import { useState } from 'react';
import { updateService } from '@/actions/services';

export default function EditServiceModal({ 
  service, 
  employees, 
  onClose 
}: { 
  service: any, 
  employees: any[],
  onClose: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(
    service.employees?.map((e: any) => e.id) || []
  );

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    formData.append("employeeIds", JSON.stringify(selectedEmployees));
    
    try {
      await updateService(service.id, formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar serviço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Editar Serviço</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
            <input 
              type="text" 
              name="name" 
              required 
              defaultValue={service.name}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
            <input 
              type="text" 
              name="description" 
              defaultValue={service.description || ''}
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
                defaultValue={service.price}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (Min)</label>
              <input 
                type="number" 
                name="duration" 
                required 
                defaultValue={service.duration}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select 
              name="category"
              defaultValue={service.category}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Cabelo">Cabelo</option>
              <option value="Barba">Barba</option>
              <option value="Combo">Combo</option>
              <option value="Estética">Estética</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Serviço (Nova foto substitui a atual)</label>
            <input 
              type="file" 
              name="imageFile" 
              accept="image/*"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profissionais que realizam o serviço</label>
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50/50">
              {employees.length === 0 ? (
                <p className="text-xs text-gray-500">Nenhum profissional cadastrado.</p>
              ) : (
                employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                    <input 
                      type="checkbox" 
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-800">{emp.name}</span>
                    <span className="text-xs text-gray-500">({emp.role})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
