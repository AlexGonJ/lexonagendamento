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

// ── Customer/Client Authentication ──────────────────────────────────────────

export interface ClientSessionData {
  clientId: string;
  name: string;
  phone: string;
  email?: string | null;
}

export async function getCurrentClientSession(): Promise<ClientSessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("client_token");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return JSON.parse(sessionCookie.value) as ClientSessionData;
  } catch {
    return null;
  }
}

export async function sendClientOtp(phone: string) {
  try {
    if (!phone) return { success: false, error: "Telefone é obrigatório." };

    // Limpar formatação do telefone para consistência
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, error: "Número de telefone inválido." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt,
      },
    });

    console.log(`[WHATSAPP OTP] Código enviado para ${cleanPhone}: ${code}`);
    return {
      success: true,
      message: "Código enviado via WhatsApp.",
      code: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  } catch (error: any) {
    console.error("Erro ao enviar OTP:", error);
    return { success: false, error: "Erro ao enviar código de verificação." };
  }
}

export async function verifyClientOtp(phone: string, code: string, name?: string) {
  try {
    if (!phone || !code) {
      return { success: false, error: "Telefone e código são obrigatórios." };
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const verification = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!verification) {
      return { success: false, error: "Código inválido ou expirado." };
    }

    // Excluir código utilizado
    await prisma.otpVerification.delete({
      where: { id: verification.id },
    });

    let client = await prisma.client.findUnique({
      where: { phone: cleanPhone },
    });

    if (!client) {
      if (!name) {
        return { success: false, needsName: true, message: "Primeiro acesso! Por favor, informe seu nome." };
      }
      client = await prisma.client.create({
        data: {
          phone: cleanPhone,
          name,
        },
      });
    } else if (name) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { name },
      });
    }

    // Salvar sessão do cliente
    const sessionData: ClientSessionData = {
      clientId: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
    };

    const cookieStore = await cookies();
    cookieStore.set("client_token", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return { success: true, client };
  } catch (error: any) {
    console.error("Erro ao verificar OTP:", error);
    return { success: false, error: "Erro ao verificar código de segurança." };
  }
}

export async function loginClientOAuth(data: {
  email?: string;
  googleId?: string;
  appleId?: string;
  name?: string;
  phone?: string; // Telefone opcional para o vínculo
}) {
  try {
    const { email, googleId, appleId, name, phone } = data;
    if (!email && !googleId && !appleId) {
      return { success: false, error: "Identificadores OAuth ausentes." };
    }

    let client = null;
    if (googleId) {
      client = await prisma.client.findUnique({ where: { googleId } });
    } else if (appleId) {
      client = await prisma.client.findUnique({ where: { appleId } });
    }

    if (!client && email) {
      client = await prisma.client.findUnique({ where: { email } });
      if (client) {
        client = await prisma.client.update({
          where: { id: client.id },
          data: {
            googleId: googleId || client.googleId,
            appleId: appleId || client.appleId,
          },
        });
      }
    }

    // Se já temos o cliente e ele tem um telefone associado
    if (client && client.phone) {
      const sessionData: ClientSessionData = {
        clientId: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
      };

      const cookieStore = await cookies();
      cookieStore.set("client_token", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      return { success: true, linked: true, client };
    }

    // Se for solicitado o vínculo direto (quando o telefone é fornecido junto com a verificação OTP)
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      
      // Buscar se já existe outro cliente com este telefone
      let existingClientByPhone = await prisma.client.findUnique({
        where: { phone: cleanPhone }
      });

      if (existingClientByPhone) {
        // Atualizar cliente existente vinculando a conta social
        client = await prisma.client.update({
          where: { id: existingClientByPhone.id },
          data: {
            googleId: googleId || existingClientByPhone.googleId,
            appleId: appleId || existingClientByPhone.appleId,
            email: email || existingClientByPhone.email,
            name: name || existingClientByPhone.name,
          }
        });
      } else {
        // Criar novo cliente
        client = await prisma.client.create({
          data: {
            phone: cleanPhone,
            name: name || "Cliente Social",
            email,
            googleId,
            appleId
          }
        });
      }

      // Criar a sessão
      const sessionData: ClientSessionData = {
        clientId: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
      };

      const cookieStore = await cookies();
      cookieStore.set("client_token", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });

      return { success: true, linked: true, client };
    }

    // Caso contrário, precisa vincular um telefone antes
    return {
      success: true,
      linked: false,
      oauthData: { email, googleId, appleId, name },
    };
  } catch (error: any) {
    console.error("Erro no login social do cliente:", error);
    return { success: false, error: "Erro interno no servidor ao tentar logar com rede social." };
  }
}

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete("client_token");
}

