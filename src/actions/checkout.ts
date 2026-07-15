"use server";

import prisma from "@/lib/prisma";
import crypto from "crypto";
import { cookies } from "next/headers";
import { createSignedToken } from "@/lib/session";
import { SessionData } from "@/actions/auth";

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

    // 3. Find or create the corresponding Plan in the database
    let plan = await prisma.plan.findFirst({
      where: {
        name: {
          contains: planId,
          mode: "insensitive",
        },
      },
    });

    // Fallback: If no plan is found, find the first active one, or create a default one
    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: { isActive: true },
      });
    }

    if (!plan) {
      // Create a default Plan so the DB works
      const defaultFeatures = ["booking", "crm", "payment_gateway"];
      plan = await prisma.plan.create({
        data: {
          name: planId.charAt(0).toUpperCase() + planId.slice(1),
          price: planId === "starter" ? 73.0 : planId === "profissional" ? 149.0 : 299.0,
          maxEmployees: planId === "starter" ? 1 : planId === "profissional" ? 3 : 99,
          features: defaultFeatures,
          isActive: true,
        },
      });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

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

      return { tenant: newTenant, employee: newEmployee };
    });

    // 5. Auto login by setting the cookie
    const sessionData: SessionData = {
      userId: result.employee.id,
      name: result.employee.name,
      email: result.employee.email || "",
      isAdmin: result.employee.isAdmin,
      tenantId: result.employee.tenantId,
    };

    const cookieStore = await cookies();
    cookieStore.set(
      "session_token",
      createSignedToken("employee-session", sessionData, 60 * 60 * 24),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 dia
        path: "/",
      }
    );

    // 6. Determine Mercado Pago redirect URL
    const planUrls: Record<string, { monthly: string; annual: string }> = {
      starter: {
        monthly: process.env.NEXT_PUBLIC_MERCADOPAGO_STARTER_MONTHLY_URL || "",
        annual: process.env.NEXT_PUBLIC_MERCADOPAGO_STARTER_ANNUAL_URL || "",
      },
      profissional: {
        monthly: process.env.NEXT_PUBLIC_MERCADOPAGO_PROFISSIONAL_MONTHLY_URL || "",
        annual: process.env.NEXT_PUBLIC_MERCADOPAGO_PROFISSIONAL_ANNUAL_URL || "",
      },
      escala: {
        monthly: process.env.NEXT_PUBLIC_MERCADOPAGO_ESCALA_MONTHLY_URL || "",
        annual: process.env.NEXT_PUBLIC_MERCADOPAGO_ESCALA_ANNUAL_URL || "",
      },
    };

    let paymentUrl = planUrls[planId.toLowerCase()]?.[billingPeriod] || "";
    
    // Add external_reference to static Mercado Pago links if they allow URL params (usually standard links do)
    // or let it redirect back.
    if (paymentUrl && paymentUrl !== "#") {
      try {
        const urlObj = new URL(paymentUrl);
        urlObj.searchParams.set("external_reference", result.tenant.id);
        paymentUrl = urlObj.toString();
      } catch (e) {
        // Fallback: simple string append if URL parsing fails
        paymentUrl = paymentUrl + (paymentUrl.includes("?") ? "&" : "?") + "external_reference=" + result.tenant.id;
      }
    }

    return {
      success: true,
      tenantId: result.tenant.id,
      paymentUrl: paymentUrl || null,
      message: "Conta criada com sucesso! Faça o pagamento para ativar sua loja.",
    };
  } catch (error) {
    console.error("Erro ao registrar loja:", error);
    return { success: false, error: "Erro interno no servidor ao cadastrar." };
  }
}
