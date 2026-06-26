"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import sharp from "sharp";
import crypto from "crypto";

// Função utilitária para pegar o tenant padrão (já que não temos login de multi-empresa ainda no MVP)
async function getDefaultTenant() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Brutus Barbearia",
        slug: "brutusbarbearia",
        description: "A melhor barbearia da região.",
      }
    });
  }
  return tenant.id;
}

export async function getServices() {
  const tenantId = await getDefaultTenant();
  return await prisma.service.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createService(formData: FormData) {
  const tenantId = await getDefaultTenant();
  
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const duration = parseInt(formData.get("duration") as string);
  const category = formData.get("category") as string;
  
  const imageFile = formData.get("imageFile") as File;

  if (!name || !price || !duration || !category) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  let finalImageUrl = null;

  // Se o usuário selecionou uma imagem
  if (imageFile && imageFile.size > 0) {
    // 1. Lemos o buffer do arquivo
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Processamos com Sharp: Redimensiona para 500x500 (max) e converte para webp (qualidade 80)
    const processedImageBuffer = await sharp(buffer)
      .resize(500, 500, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Geramos um nome único para o arquivo
    const fileName = `${tenantId}/${crypto.randomUUID()}.webp`;

    // 4. Fazemos upload para o Supabase Storage no bucket "public-images"
    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(fileName, processedImageBuffer, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      console.error("Erro no upload do storage:", uploadError);
      throw new Error("Erro ao fazer upload da imagem.");
    }

    // 5. Pegamos a URL Pública do arquivo recém upado
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  // 6. Salvamos o serviço no Prisma
  await prisma.service.create({
    data: {
      name,
      description,
      price,
      duration,
      category,
      imageUrl: finalImageUrl,
      tenantId,
    }
  });

  // Revalida a página para exibir o novo serviço imediatamente
  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book"); 
}

export async function deleteService(id: string) {
  // Opcional: Aqui poderíamos deletar a imagem do Storage também, mas por enquanto vamos só deletar o registro.
  await prisma.service.delete({
    where: { id }
  });
  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book");
}
