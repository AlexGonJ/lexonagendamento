"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

async function getDefaultTenant() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("Estabelecimento não encontrado.");
  return tenant.id;
}

export async function getEmployees() {
  const tenantId = await getDefaultTenant();
  return await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { services: true }
  });
}

export async function createEmployee(formData: FormData) {
  const tenantId = await getDefaultTenant();
  
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const imageFile = formData.get("imageFile") as File;

  if (!name || !role) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  let finalAvatarUrl = null;

  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the original file directly - sharp has binary platform issues on Vercel
    // Supabase Image Transform API handles resizing at serve time
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${tenantId}/avatars/avatar_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Erro no upload do avatar:", uploadError);
      throw new Error("Erro ao fazer upload da foto.");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public-images')
      .getPublicUrl(fileName, {
        transform: { width: 250, height: 250, resize: 'cover', quality: 80 }
      });

    finalAvatarUrl = publicUrlData.publicUrl;
  }

  await prisma.employee.create({
    data: {
      name,
      role,
      avatarUrl: finalAvatarUrl,
      tenantId,
    }
  });

  revalidatePath("/admin/employees");
  revalidatePath("/brutusbarbearia/book"); 
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({
    where: { id }
  });
  revalidatePath("/admin/employees");
  revalidatePath("/brutusbarbearia/book");
}
