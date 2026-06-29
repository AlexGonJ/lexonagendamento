"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { getCurrentSession } from "./auth";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function getActiveTenantId() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  return session.tenantId;
}

export async function getEmployees() {
  const tenantId = await getActiveTenantId();
  return await prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { services: true },
  });
}

export async function getEmployee(id: string) {
  return await prisma.employee.findUnique({
    where: { id },
    include: { services: true },
  });
}

async function uploadAvatar(imageFile: File, tenantId: string): Promise<string> {
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${tenantId}/avatars/avatar_${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("public-images")
    .upload(fileName, buffer, {
      contentType: imageFile.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Erro no upload do avatar:", uploadError);
    throw new Error("Erro ao fazer upload da foto.");
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("public-images")
    .getPublicUrl(fileName, {
      transform: { width: 250, height: 250, resize: "cover", quality: 80 },
    });

  return publicUrlData.publicUrl;
}

export async function createEmployee(formData: FormData) {
  const tenantId = await getActiveTenantId();

  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const isAdmin = formData.get("isAdmin") === "on";
  const imageFile = formData.get("imageFile") as File;
  const phone = formData.get("phone") as string | null;
  const commissionRateStr = formData.get("commissionRate") as string | null;
  const commissionRate = commissionRateStr ? parseFloat(commissionRateStr) : 50.0;

  if (!name || !role) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  // Se email foi preenchido, senha é obrigatória
  if (email && !password) {
    throw new Error("Informe uma senha para o usuário com email.");
  }

  // Verificar se email já existe
  if (email) {
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) throw new Error("Este email já está em uso.");
  }

  let finalAvatarUrl = null;

  if (imageFile && imageFile.size > 0) {
    finalAvatarUrl = await uploadAvatar(imageFile, tenantId);
  }

  await prisma.employee.create({
    data: {
      name,
      role,
      email: email || null,
      passwordHash: password ? hashPassword(password) : null,
      isAdmin,
      avatarUrl: finalAvatarUrl,
      phone: phone || null,
      commissionRate,
      tenantId,
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/brutusbarbearia/book");
}

export async function updateEmployee(id: string, formData: FormData) {
  const tenantId = await getActiveTenantId();

  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const email = formData.get("email") as string | null;
  const newPassword = formData.get("password") as string | null;
  const isAdmin = formData.get("isAdmin") === "on";
  const imageFile = formData.get("imageFile") as File;
  const phone = formData.get("phone") as string | null;
  const commissionRateStr = formData.get("commissionRate") as string | null;
  const commissionRate = commissionRateStr ? parseFloat(commissionRateStr) : 50.0;

  if (!name || !role) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  // Verificar se email já está em uso por outro funcionário
  if (email) {
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      throw new Error("Este email já está em uso por outro profissional.");
    }
  }

  // Buscar dados atuais para manter a senha se não for alterada
  const current = await prisma.employee.findUnique({ where: { id } });
  if (!current) throw new Error("Profissional não encontrado.");

  let finalAvatarUrl = current.avatarUrl;

  if (imageFile && imageFile.size > 0) {
    finalAvatarUrl = await uploadAvatar(imageFile, tenantId);
  }

  await prisma.employee.update({
    where: { id },
    data: {
      name,
      role,
      email: email || null,
      passwordHash: newPassword ? hashPassword(newPassword) : current.passwordHash,
      isAdmin,
      avatarUrl: finalAvatarUrl,
      phone: phone || null,
      commissionRate,
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}/edit`);
  revalidatePath("/brutusbarbearia/book");
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({
    where: { id },
  });
  revalidatePath("/admin/employees");
  revalidatePath("/brutusbarbearia/book");
}
