"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateEmployee } from "@/actions/employees";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  phone?: string | null;
  commissionRate?: number;
}

interface EditEmployeeFormProps {
  employee: Employee;
}

export default function EditEmployeeForm({ employee }: EditEmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(employee.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateEmployee(employee.id, formData);
        setSuccess(true);
        setTimeout(() => router.push("/admin/employees"), 1500);
      } catch (err: any) {
        setError(err.message || "Erro ao salvar alterações.");
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/employees"
          className="text-gray-500 hover:text-gray-700 transition-colors"
          title="Voltar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Profissional</h1>
          <p className="text-sm text-gray-500">Atualize os dados de {employee.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5" encType="multipart/form-data">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
          <div className="relative">
            <img
              src={preview || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random&size=200`}
              alt={employee.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow hover:bg-blue-700 transition-colors"
              title="Trocar foto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            name="imageFile"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-xs text-gray-400">Clique no ícone para trocar a foto</p>
        </div>

        {/* Dados Pessoais */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados do Profissional</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={employee.name}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade / Cargo *</label>
              <input
                type="text"
                name="role"
                required
                defaultValue={employee.role}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Celular (com DDD)</label>
              <input
                type="text"
                name="phone"
                defaultValue={employee.phone || ""}
                placeholder="Ex: 11999999999"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Comissão (%) *</label>
              <input
                type="number"
                name="commissionRate"
                min="0"
                max="100"
                step="0.1"
                required
                defaultValue={employee.commissionRate ?? 50.0}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Acesso ao Sistema */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acesso ao Sistema</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (para login)</label>
              <input
                type="email"
                name="email"
                defaultValue={employee.email || ""}
                placeholder="Ex: marcos@barbearia.com"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <input
                type="password"
                name="password"
                placeholder="Deixe em branco para manter a senha atual"
                minLength={6}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Preencha apenas se quiser alterar a senha.</p>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                name="isAdmin"
                id="isAdmin-edit"
                defaultChecked={employee.isAdmin}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label htmlFor="isAdmin-edit" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Administrador do painel
                </label>
                <p className="text-xs text-gray-400">Permite acesso total ao painel administrativo.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Dados salvos com sucesso! Redirecionando...
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/employees"
            className="flex-1 text-center py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
