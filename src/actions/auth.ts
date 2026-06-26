"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";
import { redirect } from "next/navigation";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  tenantId: string;
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Por favor, preencha todos os campos." };
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee || !employee.passwordHash) {
      return { success: false, error: "Credenciais inválidas." };
    }

    const hashedInput = hashPassword(password);
    if (hashedInput !== employee.passwordHash) {
      return { success: false, error: "Credenciais inválidas." };
    }

    // Criar dados da sessão
    const sessionData: SessionData = {
      userId: employee.id,
      name: employee.name,
      email: employee.email || "",
      isAdmin: employee.isAdmin,
      tenantId: employee.tenantId,
    };

    const cookieStore = await cookies();
    cookieStore.set("session_token", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 dia
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Erro no login:", error);
    return { success: false, error: "Erro interno no servidor ao tentar fazer login." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  redirect("/login");
}

export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session_token");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}
