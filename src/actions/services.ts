"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { getCurrentSession } from "./auth";

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  return session.tenantId;
}

async function requireAdminSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  if (!session.isAdmin) throw new Error("Apenas administradores podem executar esta ação.");
  return session;
}

async function assertServiceBelongsToTenant(serviceId: string, tenantId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId },
    select: { id: true },
  });

  if (!service) {
    throw new Error("Serviço não encontrado para este estabelecimento.");
  }
}

async function assertEmployeeIdsBelongToTenant(employeeIds: string[], tenantId: string) {
  if (employeeIds.length === 0) return;

  const employees = await prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      tenantId,
    },
    select: { id: true },
  });

  if (employees.length !== employeeIds.length) {
    throw new Error("Um ou mais profissionais selecionados não pertencem a este estabelecimento.");
  }
}

export async function getServices() {
  const tenantId = await getActiveTenantId();
  return await prisma.service.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { employees: true }
  });
}

export async function createService(formData: FormData) {
  await requireAdminSession();
  const tenantId = await getActiveTenantId();
  
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

    // Upload the original file directly - sharp has binary platform issues on Vercel
    // Supabase Image Transform API handles resizing at serve time
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${tenantId}/service_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
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
  await assertEmployeeIdsBelongToTenant(employeeIds, tenantId);

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
  await requireAdminSession();
  const tenantId = await getActiveTenantId();
  
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

    // Upload the original file directly - sharp has binary platform issues on Vercel
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${tenantId}/service_${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('public-images')
      .upload(fileName, buffer, {
        contentType: imageFile.type,
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
  await assertServiceBelongsToTenant(id, tenantId);
  await assertEmployeeIdsBelongToTenant(employeeIds, tenantId);

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
  await requireAdminSession();
  const tenantId = await getActiveTenantId();
  await assertServiceBelongsToTenant(id, tenantId);
  await prisma.service.delete({
    where: { id }
  });
  revalidatePath("/admin/services");
  revalidatePath("/brutusbarbearia/book");
}
