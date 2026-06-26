"use server";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { supabaseAdmin } from "@/lib/supabase";
import sharp from "sharp";
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

  // Processar upload de Logo
  if (logoFile && logoFile.size > 0) {
    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Otimiza logotipo: Redimensiona para max 300x300 e converte para webp
    const processedLogo = await sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const logoPath = `${tenantId}/settings/logo_${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(logoPath, processedLogo, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload do logo:", uploadError);
      throw new Error("Erro ao fazer upload do logo.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(logoPath);

    logoUrl = publicUrlData.publicUrl;
  }

  // Processar upload de Capa/Banner
  if (coverFile && coverFile.size > 0) {
    const arrayBuffer = await coverFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Otimiza capa/banner: Redimensiona para 1200x600 (aspect ratio ideal para capa) e converte para webp
    const processedCover = await sharp(buffer)
      .resize(1200, 600, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const coverPath = `${tenantId}/settings/cover_${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(coverPath, processedCover, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      console.error("Erro no upload da capa:", uploadError);
      throw new Error("Erro ao fazer upload da imagem de capa.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(coverPath);

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
