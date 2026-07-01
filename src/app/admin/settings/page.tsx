"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getTenantSettings, updateTenantSettings } from "@/actions/tenant";

export default function TenantSettingsPage() {
  const [isPending, startTransition] = useTransition();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const tenant = await getTenantSettings();
        setName(tenant.name);
        setDescription(tenant.description || "");
        setLogoUrl(tenant.logoUrl);
        setCoverUrl(tenant.coverUrl);
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Erro ao carregar configurações.";
        setMessage({ type: "error", text: errMessage });
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    
    if (logoFile) {
      formData.append("logoFile", logoFile);
    }
    if (coverFile) {
      formData.append("coverFile", coverFile);
    }

    startTransition(async () => {
      try {
        const res = await updateTenantSettings(formData);
        if (res.success) {
          setMessage({ type: "success", text: "Configurações atualizadas com sucesso!" });
          // Atualiza as URLs reais
          const updated = await getTenantSettings();
          setLogoUrl(updated.logoUrl);
          setCoverUrl(updated.coverUrl);
          // Limpa os arquivos temporários de preview
          setLogoFile(null);
          setCoverFile(null);
          setLogoPreview(null);
          setCoverPreview(null);
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "Ocorreu um erro ao salvar.";
        setMessage({ type: "error", text: errMessage });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 font-medium animate-pulse">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-xs p-6 md:p-8">
      <div className="border-b border-gray-100 pb-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Estabelecimento</h1>
        <p className="text-sm text-gray-500 mt-1">Altere os dados básicos e personalize as fotos que aparecem na página inicial.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 border text-sm font-medium ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Estabelecimento</label>
          <input 
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900"
            placeholder="Ex: Brutus Barbearia"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição (Slogan)</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all text-gray-900"
            placeholder="Ex: A melhor barbearia da região. Profissionais qualificados e ambiente climatizado."
          />
        </div>

        {/* Logo upload */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-t border-gray-100 pt-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Foto de Logotipo</label>
            <p className="text-xs text-gray-500">Aparecerá circular na página inicial.</p>
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Preview Logo" className="w-full h-full object-cover" />
              ) : logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs">Sem Foto</span>
              )}
            </div>
            <div className="w-full">
              <input 
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: PNG, JPG, WEBP. Redimensionado automaticamente.</p>
            </div>
          </div>
        </div>

        {/* Cover upload */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border-t border-gray-100 pt-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Foto de Capa (Banner)</label>
            <p className="text-xs text-gray-500">Imagem de fundo exibida no topo da página inicial.</p>
          </div>
          <div className="md:col-span-2 flex flex-col gap-4 w-full">
            <div className="w-full h-32 md:h-40 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden relative">
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Preview Capa" className="w-full h-full object-cover" />
              ) : coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Sem Foto de Capa</span>
              )}
            </div>
            <div className="w-full">
              <input 
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: PNG, JPG, WEBP.</p>
            </div>
          </div>
        </div>

        {/* Salvar */}
        <div className="border-t border-gray-100 pt-6 flex justify-end">
          <button 
            type="submit"
            disabled={isPending}
            className={`px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer ${
              isPending ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isPending ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </div>
  );
}
