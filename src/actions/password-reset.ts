"use server";

import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { assertRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, hashPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";

const GENERIC_MESSAGE = "Se houver uma conta com este e-mail, você receberá as instruções de recuperação.";

function appUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL deve ser configurada para recuperação de senha.");
  const url = new URL(value);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("APP_URL deve usar HTTPS em produção.");
  return url;
}

export async function requestPasswordReset(emailValue: string) {
  const email = emailValue.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: "Informe um e-mail válido." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const rateLimit = await assertRateLimit(`password-reset:${ip}:${email}`, { limit: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return { success: true, message: GENERIC_MESSAGE };
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee?.passwordHash) return { success: true, message: GENERIC_MESSAGE };
  try {
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.passwordResetToken.deleteMany({ where: { employeeId: employee.id, usedAt: null } });
    const reset = await prisma.passwordResetToken.create({ data: { employeeId: employee.id, tokenHash, expiresAt } });
    const url = appUrl();
    url.pathname = "/reset-password";
    url.searchParams.set("token", token);
    try { await sendPasswordResetEmail(email, url.toString()); } catch (error) { await prisma.passwordResetToken.delete({ where: { id: reset.id } }); throw error; }
    return { success: true, message: GENERIC_MESSAGE };
  } catch (error) {
    console.error("Falha ao solicitar recuperação de senha:", error);
    return { success: false, error: "A recuperação de senha não está disponível no momento." };
  }
}

export async function resetPassword(token: string, password: string) {
  if (!token || !password) return { success: false, error: "Link ou senha inválidos." };
  try {
    const tokenHash = hashPasswordResetToken(token);
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return { success: false, error: "Este link expirou ou já foi utilizado." };
    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.employee.update({ where: { id: reset.employeeId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { employeeId: reset.employeeId, usedAt: null, id: { not: reset.id } } }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("Falha ao redefinir senha:", error);
    return { success: false, error: "Não foi possível redefinir sua senha." };
  }
}
