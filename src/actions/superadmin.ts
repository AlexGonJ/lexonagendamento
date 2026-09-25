"use server";
import prisma from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { createSignedToken, verifySignedToken } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { recordAuditEvent } from "@/lib/audit";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";

// --- Auth -------------------------------------------------------------------

export async function superAdminLogin(formData: FormData) {
  const secret = formData.get("secret") as string;
  if (!secret) return { success: false, error: "Informe a senha de acesso." };
  const validSecret = process.env.SUPER_ADMIN_SECRET;
  if (!validSecret) return { success: false, error: "Super admin nao configurado no servidor." };

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const rateLimit = await assertRateLimit(`login:super-admin:${ip}`, {
    limit: 5,
    windowMs: 5 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde 30 minutos e tente novamente." };
  }

  const supplied = Buffer.from(secret);
  const expected = Buffer.from(validSecret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { success: false, error: "Senha incorreta." };
  }
  const totpSecret = process.env.SUPER_ADMIN_TOTP_SECRET;
  if (!totpSecret && process.env.NODE_ENV === "production") return { success: false, error: "MFA do superadministrador não está configurado." };
  if (totpSecret && !verifyTotp(String(formData.get("totpCode") || ""), totpSecret)) return { success: false, error: "Código de autenticação inválido." };
  const cookieStore = await cookies();
  const token = await createSignedToken("super-admin", "allowed", 60 * 60 * 8);
  cookieStore.set(
    "super_admin_token",
    token,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    }
  );
  return { success: true };
}

export async function superAdminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("super_admin_token");
  redirect("/super-admin/login");
}

export async function checkSuperAdminAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_token");
    if (!token?.value) return false;
    const verified = await verifySignedToken<string>(token.value, "super-admin");
    return verified === "allowed";
  } catch {
    return false;
  }
}

async function requireSuperAdminAuth() {
  const authorized = await checkSuperAdminAuth();
  if (!authorized) {
    throw new Error("Não autorizado.");
  }
}

// --- Dashboard Stats ---------------------------------------------------------

export async function getSuperAdminStats() {
  await requireSuperAdminAuth();
  const [totalTenants, activeTenants, totalPlans, recentTenants, planDistribution] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          tenantPlans: {
            where: { status: "ACTIVE" },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.plan.findMany({
        where: { isActive: true },
        include: { tenantPlans: { where: { status: "ACTIVE" } } },
      }),
    ]);
  return {
    totalTenants,
    activeTenants,
    inactiveTenants: totalTenants - activeTenants,
    totalPlans,
    recentTenants,
    planDistribution: planDistribution.map((p) => ({
      planName: p.name,
      count: p.tenantPlans.length,
    })),
  };
}

// --- Tenants -----------------------------------------------------------------

export async function getTenants() {
  await requireSuperAdminAuth();
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tenantPlans: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { employees: true, services: true, bookings: true } },
    },
  });
}

export async function getTenantById(id: string) {
  await requireSuperAdminAuth();
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      tenantPlans: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      employees: { orderBy: { createdAt: "desc" } },
      _count: { select: { employees: true, services: true, bookings: true } },
    },
  });
}

export async function createTenantEmployee(
  tenantId: string,
  data: { name: string; role: string; email: string; password?: string; isAdmin: boolean }
) {
  let stage = "autorização";
  try {
    await requireSuperAdminAuth();
    const { name, role, password, isAdmin } = data;
    const email = data.email.trim().toLowerCase();
    if (!name || !role || !email) {
      return { success: false, error: "Nome, cargo e e-mail são obrigatórios." };
    }
    if (!password || password.length < 8) {
      return { success: false, error: "A senha de acesso deve ter pelo menos 8 caracteres." };
    }

    // Verificar se o email já está em uso
    stage = "verificação do e-mail";
    const existing = await prisma.employee.findUnique({
      where: { email },
    });
    if (existing) {
      return { success: false, error: "Este e-mail já está sendo usado por outro funcionário." };
    }

    stage = "preparação da senha";
    const passwordHash = await hashPassword(password);

    stage = "gravação do funcionário";
    await prisma.employee.create({
      data: {
        name,
        role,
        email,
        passwordHash,
        isAdmin,
        tenantId,
      },
    });

    stage = "auditoria";
    await recordAuditEvent({
      tenantId,
      actorRole: "SUPER_ADMIN",
      action: "EMPLOYEE_CREATED",
      entityType: "EMPLOYEE",
      metadata: { isAdmin },
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar funcionário:", error);
    // Keep database details in the server log, but return actionable messages
    // for common constraint failures instead of hiding them behind one generic error.
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = String((error as { code?: unknown }).code);
      if (code === "P2002") {
        return { success: false, error: "Este e-mail já está cadastrado. Confira o endereço e tente novamente." };
      }
      if (code === "P2003" || code === "P2025") {
        return { success: false, error: "A loja ou o registro relacionado não foi encontrado. Atualize a página e tente novamente." };
      }
    }
    const errorType = error instanceof Error ? error.name : "Erro desconhecido";
    const errorCode = typeof error === "object" && error !== null && "code" in error
      ? `, código ${(error as { code?: unknown }).code}`
      : "";
    return { success: false, error: `Falha na ${stage} (${errorType}${errorCode}). Atualize a página e tente novamente.` };
  }
}


export async function createTenant(formData: FormData) {
  await requireSuperAdminAuth();
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const planId = formData.get("planId") as string;
  const featuresRaw = formData.get("features") as string;
  if (!name || !slug) return { success: false, error: "Nome e slug sao obrigatorios." };
  if (!/^[a-z0-9-]+$/.test(slug)) return { success: false, error: "Slug invalido. Use apenas letras minusculas, numeros e hifens." };
  try {
    const features = featuresRaw ? featuresRaw.split(",").filter(Boolean) : [];
    if (features.includes("inventory_advanced") && !features.includes("inventory")) {
      return { success: false, error: "Alertas avançados exigem a feature Controle de estoque." };
    }
    const tenant = await prisma.tenant.create({ data: { name, slug, description: description || null, features, isActive: true } });
    if (planId) {
      await prisma.tenantPlan.create({ data: { tenantId: tenant.id, planId, status: "ACTIVE" } });
    }
    await recordAuditEvent({
      tenantId: tenant.id,
      actorRole: "SUPER_ADMIN",
      action: "TENANT_CREATED",
      entityType: "TENANT",
      entityId: tenant.id,
      metadata: { slug: tenant.slug, planAssigned: Boolean(planId) },
    });
    return { success: true, tenantId: tenant.id };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, error: "Ja existe uma loja com esse slug." };
    }
    return { success: false, error: "Erro ao criar loja." };
  }
}

export async function toggleTenantStatus(id: string, isActive: boolean) {
  try {
    await requireSuperAdminAuth();
    await prisma.tenant.update({ where: { id }, data: { isActive } });
    await recordAuditEvent({
      tenantId: id,
      actorRole: "SUPER_ADMIN",
      action: "TENANT_STATUS_UPDATED",
      entityType: "TENANT",
      entityId: id,
      metadata: { isActive },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar status." };
  }
}

export async function updateTenantFeatures(id: string, features: string[]) {
  try {
    await requireSuperAdminAuth();
    if (features.includes("inventory_advanced") && !features.includes("inventory")) {
      return { success: false, error: "Alertas avançados exigem a feature Controle de estoque." };
    }
    await prisma.tenant.update({ where: { id }, data: { features } });
    await recordAuditEvent({
      tenantId: id,
      actorRole: "SUPER_ADMIN",
      action: "TENANT_FEATURES_UPDATED",
      entityType: "TENANT",
      entityId: id,
      metadata: { featureCount: features.length },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar features." };
  }
}

export async function updateTenantTheme(id: string, themeBgColor: string | null, themeButtonColor: string | null) {
  try {
    await requireSuperAdminAuth();
    await prisma.tenant.update({
      where: { id },
      data: { themeBgColor, themeButtonColor },
    });
    await recordAuditEvent({
      tenantId: id,
      actorRole: "SUPER_ADMIN",
      action: "TENANT_THEME_UPDATED",
      entityType: "TENANT",
      entityId: id,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar as cores do tema." };
  }
}

export async function assignPlanToTenant(tenantId: string, planId: string) {
  try {
    await requireSuperAdminAuth();
    await prisma.tenantPlan.updateMany({ where: { tenantId, status: "ACTIVE" }, data: { status: "CANCELLED", endDate: new Date() } });
    const tenantPlan = await prisma.tenantPlan.create({
      data: { tenantId, planId, status: "ACTIVE" },
      include: { plan: true },
    });
    await prisma.tenant.update({ where: { id: tenantId }, data: { features: tenantPlan.plan.features } });
    await recordAuditEvent({
      tenantId,
      actorRole: "SUPER_ADMIN",
      action: "TENANT_PLAN_ASSIGNED",
      entityType: "TENANT_PLAN",
      entityId: tenantPlan.id,
      metadata: { planId },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atribuir plano." };
  }
}

// --- Plans -------------------------------------------------------------------

// Note: AVAILABLE_FEATURES is defined in src/lib/features.ts (not here, since
// "use server" files can only export async functions, not plain objects).


export async function getPlans() {
  await requireSuperAdminAuth();
  return prisma.plan.findMany({
    orderBy: { price: "asc" },
    include: { _count: { select: { tenantPlans: { where: { status: "ACTIVE" } } } } },
  });
}

export async function createPlan(formData: FormData) {
  await requireSuperAdminAuth();
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const maxEmployees = parseInt(formData.get("maxEmployees") as string, 10);
  const maxBookingsRaw = String(formData.get("maxBookingsPerMonth") || "");
  const maxBookingsPerMonth = maxBookingsRaw ? parseInt(maxBookingsRaw, 10) : null;
  const featuresRaw = formData.get("features") as string;
  if (!name || isNaN(price) || isNaN(maxEmployees) || (maxBookingsRaw && (maxBookingsPerMonth === null || !Number.isInteger(maxBookingsPerMonth) || maxBookingsPerMonth < 1))) return { success: false, error: "Preencha todos os campos." };
  try {
    const features = featuresRaw ? featuresRaw.split(",").filter(Boolean) : [];
    if (features.includes("inventory_advanced") && !features.includes("inventory")) {
      return { success: false, error: "Alertas avançados exigem a feature Controle de estoque." };
    }
    await prisma.plan.create({ data: { name, price, maxEmployees, maxBookingsPerMonth, features } });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao criar plano." };
  }
}

export async function updatePlan(id: string, data: { name?: string; price?: number; maxEmployees?: number; maxBookingsPerMonth?: number | null; features?: string[]; isActive?: boolean }) {
  try {
    await requireSuperAdminAuth();
    if (data.features?.includes("inventory_advanced") && !data.features.includes("inventory")) {
      return { success: false, error: "Alertas avançados exigem a feature Controle de estoque." };
    }
    await prisma.$transaction(async (tx) => {
      const currentPlan = await tx.plan.findUnique({ where: { id }, select: { features: true } });
      if (!currentPlan) throw new Error("Plano não encontrado.");

      const updatedPlan = await tx.plan.update({ where: { id }, data });
      const inventoryFlags = ["inventory", "inventory_advanced"];
      const inventoryFeatureChanged = data.features !== undefined
        && inventoryFlags.some((feature) => currentPlan.features.includes(feature) !== updatedPlan.features.includes(feature));
      if (!inventoryFeatureChanged) return;

      const activeAssignments = await tx.tenantPlan.findMany({
        where: { planId: id, status: "ACTIVE" },
        select: { tenantId: true },
      });
      const tenantIds = [...new Set(activeAssignments.map((assignment) => assignment.tenantId))];
      for (const tenantId of tenantIds) {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { features: true } });
        if (!tenant) continue;
        const nextFeatures = new Set(tenant.features);
        for (const feature of inventoryFlags) {
          if (updatedPlan.features.includes(feature)) nextFeatures.add(feature);
          else nextFeatures.delete(feature);
        }
        if (!nextFeatures.has("inventory")) nextFeatures.delete("inventory_advanced");
        await tx.tenant.update({ where: { id: tenantId }, data: { features: [...nextFeatures] } });
      }
    });
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar plano." };
  }
}
