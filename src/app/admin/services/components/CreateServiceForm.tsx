"use client";

import { useState } from 'react';
import { createService } from '@/actions/services';

export default function CreateServiceForm({ employees }: { employees: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

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
      await createService(formData);
      (e.target as HTMLFormElement).reset();
      setSelectedEmployees([]);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar serviço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50"
      >
        {isSubmitting ? "Salvando..." : "Salvar Serviço"}
      </button>
    </form>
  );
}
