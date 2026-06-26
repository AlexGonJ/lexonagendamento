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
    orderBy: { createdAt: 'desc' },
    include: { employees: true }
  });
}

export async function createService(formData: FormData) {
  const tenantId = await getDefaultTenant();
  
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const duration = parseInt(formData.get("duration") as string);
  const category = formData.get("category") as string;
  const employeeIdsStr = formData.get("employeeIds") as string;
  
  const imageFile = formData.get("imageFile") as File;

  if (!name || !price || !duration || !category) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  let finalImageUrl = null;

  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedImageBuffer = await sharp(buffer)
      .resize(500, 500, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `${tenantId}/service_${crypto.randomUUID()}.webp`;

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

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  const employeeIds = employeeIdsStr ? JSON.parse(employeeIdsStr) : [];

  await prisma.service.create({
    data: {
      name,
      description,
      price,
      duration,
      category,
      imageUrl: finalImageUrl,
      tenantId,
      employees: {
        connect: employeeIds.map((id: string) => ({ id }))
      }
    }
  });

  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book"); 
}

export async function updateService(id: string, formData: FormData) {
  const tenantId = await getDefaultTenant();
  
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const duration = parseInt(formData.get("duration") as string);
  const category = formData.get("category") as string;
  const employeeIdsStr = formData.get("employeeIds") as string;
  
  const imageFile = formData.get("imageFile") as File;

  if (!name || !price || !duration || !category) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  let finalImageUrl = undefined;

  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedImageBuffer = await sharp(buffer)
      .resize(500, 500, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `${tenantId}/service_${crypto.randomUUID()}.webp`;

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

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(fileName);

    finalImageUrl = publicUrlData.publicUrl;
  }

  const employeeIds = employeeIdsStr ? JSON.parse(employeeIdsStr) : [];

  await prisma.service.update({
    where: { id },
    data: {
      name,
      description,
      price,
      duration,
      category,
      ...(finalImageUrl !== undefined && { imageUrl: finalImageUrl }),
      employees: {
        set: employeeIds.map((eid: string) => ({ id: eid }))
      }
    }
  });

  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book"); 
}

export async function deleteService(id: string) {
  await prisma.service.delete({
    where: { id }
  });
  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book");
}
