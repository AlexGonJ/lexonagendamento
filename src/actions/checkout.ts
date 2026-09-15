"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSignedToken } from "@/lib/session";
import { SessionData } from "@/actions/auth";
import { hashPassword } from "@/lib/password";
import { getMercadoPagoCheckoutUrl } from "@/lib/checkout-url";

export async function registerTenant(data: {
  name: string;
  slug: string;
  email: string;
  password?: string;
  planId: string;
  billingPeriod: "monthly" | "annual";
}) {
  const { name, slug, email, password, planId, billingPeriod } = data;

  if (!name || !slug || !email || !password) {
    return { success: false, error: "Todos os campos são obrigatórios." };
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleanSlug) {
    return { success: false, error: "URL da loja inválida." };
  }

  try {
    // 1. Check if slug is in use
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingTenant) {
      return { success: false, error: "Este endereço de URL da loja já está em uso." };
    }

    // 2. Check if email is in use
    const existingEmployee = await prisma.employee.findUnique({
      where: { email },
    });
    if (existingEmployee) {
      return { success: false, error: "Este e-mail comercial já está cadastrado no sistema." };
    }

    // The checkout must reference an existing, active plan. Falling back to a
    // different plan would allow a payment to activate the wrong entitlement.
    const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) return { success: false, error: "O plano selecionado não está disponível." };

    const passwordHash = await hashPassword(password);

    // 4. Create Tenant, Employee and TenantPlan in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug: cleanSlug,
          isActive: false, // Inactive initially until paid
          features: plan.features,
        },
      });

      const newEmployee = await tx.employee.create({
        data: {
          name: `Admin ${name}`,
          role: "Administrador",
          email,
          passwordHash,
          isAdmin: true,
          tenantId: newTenant.id,
        },
      });

      await tx.tenantPlan.create({
        data: {
          tenantId: newTenant.id,
          planId: plan.id,
          status: "PENDING", // Pending payment
          startDate: new Date(),
        },
      });

      const order = await tx.checkoutOrder.create({
        data: {
          tenantId: newTenant.id,
          planId: plan.id,
          billingPeriod,
          amount: plan.price,
        },
      });
      return { tenant: newTenant, employee: newEmployee, order };
    });

    // 5. Auto login by setting the cookie
    const sessionData: SessionData = {
      userId: result.employee.id,
      name: result.employee.name,
      email: result.employee.email || "",
      isAdmin: result.employee.isAdmin,
      tenantId: result.employee.tenantId,
      sessionVersion: result.employee.sessionVersion,
    };

    const cookieStore = await cookies();
    const token = await createSignedToken("employee-session", sessionData, 60 * 60 * 24);
    cookieStore.set(
      "session_token",
      token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 dia
        path: "/",
      }
    );

    const paymentUrl = getMercadoPagoCheckoutUrl(plan.id, billingPeriod, result.order.id);

    return {
      success: true,
      tenantId: result.tenant.id,
      orderId: result.order.id,
      paymentUrl: paymentUrl || null,
      message: paymentUrl ? "Conta criada. Você será direcionado ao pagamento para ativar sua loja." : "Conta criada e pagamento pendente. Configure o checkout do plano ou entre em contato com o suporte.",
    };
  } catch (error) {
    console.error("Erro ao registrar loja:", error);
    return { success: false, error: "Erro interno no servidor ao cadastrar." };
  }
}
