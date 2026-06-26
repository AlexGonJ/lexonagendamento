"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function getTenantSettings() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Não autorizado.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
  });

  if (!tenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  return tenant;
}

export async function updateTenantSettings(formData: FormData) {
  const session = await getCurrentSession();
  if (!session || !session.isAdmin) {
    throw new Error("Não autorizado.");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const logoFile = formData.get("logoFile") as File | null;
  const coverFile = formData.get("coverFile") as File | null;

  if (!name) {
    throw new Error("O nome do estabelecimento é obrigatório.");
  }

  const tenantId = session.tenantId;

  // Busca dados atuais do tenant
  const currentTenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!currentTenant) {
    throw new Error("Estabelecimento não encontrado.");
  }

  let logoUrl = currentTenant.logoUrl;
  let coverUrl = currentTenant.coverUrl;

  // Upload de Logo
  if (logoFile && logoFile.size > 0) {
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const logoPath = `${tenantId}/settings/logo_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(logoPath, buffer, {
        contentType: logoFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload do logo:", uploadError);
      throw new Error("Erro ao fazer upload do logo.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(logoPath, {
        transform: { width: 300, height: 300, resize: 'cover', quality: 85 }
      });

    logoUrl = publicUrlData.publicUrl;
  }

  // Upload de Capa/Banner
  if (coverFile && coverFile.size > 0) {
    const arrayBuffer = await coverFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const coverPath = `${tenantId}/settings/cover_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(coverPath, buffer, {
        contentType: coverFile.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload da capa:", uploadError);
      throw new Error("Erro ao fazer upload da imagem de capa.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(coverPath, {
        transform: { width: 1200, height: 600, resize: 'cover', quality: 80 }
      });

    coverUrl = publicUrlData.publicUrl;
  }

  // Atualiza tenant no banco
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      description,
      logoUrl,
      coverUrl,
    }
  });

  // Revalida a página inicial do tenant e os agendamentos
  revalidatePath(`/${updatedTenant.slug}`);
  revalidatePath(`/${updatedTenant.slug}/book`);
  revalidatePath(`/admin`);

  return { success: true };
}
