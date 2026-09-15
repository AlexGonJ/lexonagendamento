"use server";

import prisma from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { createSignedToken, verifySignedToken } from "@/lib/session";
import { assertRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { hashPassword, verifyPassword } from "@/lib/password";

function hashOtp(phone: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET || process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("OTP_HASH_SECRET ou AUTH_SESSION_SECRET deve ser configurado em produção.");
  }

  return `hmac:${crypto
    .createHmac("sha256", secret || "development-otp-secret")
    .update(`${phone}:${code}`)
    .digest("hex")}`;
}

function otpMatches(storedCode: string, expectedHash: string, legacyCode: string) {
  if (storedCode.startsWith("hmac:")) {
    const stored = Buffer.from(storedCode);
    const expected = Buffer.from(expectedHash);
    return stored.length === expected.length && crypto.timingSafeEqual(stored, expected);
  }

  // Allows OTPs issued before this deployment to expire naturally.
  return storedCode === legacyCode;
}

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  tenantId: string;
  sessionVersion: number;
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Por favor, preencha todos os campos." };
  }

  const rateLimit = await assertRateLimit(`login:employee:${email}`, {
    limit: 5,
    windowMs: 5 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde 30 minutos e tente novamente." };
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee || !employee.passwordHash) {
      return { success: false, error: "Credenciais inválidas." };
    }

    const passwordResult = await verifyPassword(password, employee.passwordHash);
    if (!passwordResult.valid) {
      return { success: false, error: "Credenciais inválidas." };
    }

    if (passwordResult.needsUpgrade) {
      await prisma.employee.update({ where: { id: employee.id }, data: { passwordHash: await hashPassword(password) } });
    }

    // Criar dados da sessão
    const sessionData: SessionData = {
      userId: employee.id,
      name: employee.name,
      email: employee.email || "",
      isAdmin: employee.isAdmin,
      tenantId: employee.tenantId,
      sessionVersion: employee.sessionVersion,
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

    return { success: true };
  } catch (error) {
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
    const session = await verifySignedToken<SessionData>(sessionCookie.value, "employee-session");
    if (!session) return null;
    const employee = await prisma.employee.findFirst({
      where: { id: session.userId, tenantId: session.tenantId, isActive: true },
      select: { id: true, name: true, email: true, isAdmin: true, tenantId: true, sessionVersion: true },
    });
    if (!employee || employee.sessionVersion !== session.sessionVersion) return null;
    return {
      userId: employee.id,
      name: employee.name,
      email: employee.email || "",
      isAdmin: employee.isAdmin,
      tenantId: employee.tenantId,
      sessionVersion: employee.sessionVersion,
    };
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
  googleId?: string | null;
  appleId?: string | null;
}

export async function getCurrentClientSession(): Promise<ClientSessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("client_token");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return await verifySignedToken<ClientSessionData>(sessionCookie.value, "client-session");
  } catch {
    return null;
  }
}

export async function sendClientOtp(
  phone: string,
  tenantId?: string,
  captchaToken?: string
) {
  try {
    if (!phone) return { success: false, error: "Telefone é obrigatório." };

    // Limpar formatação do telefone para consistência
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, error: "Número de telefone inválido." };
    }

    const rateLimit = await assertRateLimit(`otp:send:phone:${cleanPhone}`, {
      limit: 3,
      windowMs: 60 * 1000,
      blockMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Muitas solicitações. Tente novamente em alguns minutos.",
      };
    }

    const captchaResult = await verifyTurnstileToken(captchaToken);
    if (!captchaResult.success) {
      return { success: false, error: captchaResult.error };
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashOtp(cleanPhone, code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        code: codeHash,
        expiresAt,
      },
    });

    // Se houver um tenantId e ele tiver WhatsApp habilitado, envia a mensagem de verdade
    let deliverySucceeded = false;
    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant && tenant.whatsappEnabled) {
          const result = await sendWhatsappMessage({
            tenantId,
            recipient: cleanPhone,
            type: "TEST",
            overrideMessage: `Seu código de verificação para acesso é: ${code}`,
            sensitive: true,
            data: {
              clientName: "Cliente",
              serviceName: "",
              employeeName: "",
              dateStr: "",
              timeStr: ""
            }
          });
          deliverySucceeded = result.success;
        }
      } catch (whatsappErr) {
        console.error("Falha ao enviar OTP real via WhatsApp:", whatsappErr);
      }
    }

    if (process.env.NODE_ENV === "production" && !deliverySucceeded) {
      await prisma.otpVerification.deleteMany({ where: { phone: cleanPhone, code: codeHash } });
      return { success: false, error: "Não foi possível enviar o código. Tente novamente mais tarde." };
    }
    return {
      success: true,
      message: "Código enviado via WhatsApp.",
      code: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  } catch (error) {
    console.error("Erro ao enviar OTP:", error);
    return { success: false, error: "Erro ao enviar código de verificação." };
  }
}

export async function verifyClientOtp(
  phone: string,
  code: string,
  name?: string
) {
  try {
    if (!phone || !code) {
      return { success: false, error: "Telefone e código são obrigatórios." };
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const rateLimit = await assertRateLimit(`otp:verify:phone:${cleanPhone}`, {
      limit: 10,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      };
    }

    const verificationCandidates = await prisma.otpVerification.findMany({
      where: {
        phone: cleanPhone,
        expiresAt: { gt: new Date() },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
    const expectedHash = hashOtp(cleanPhone, code);
    const verification = verificationCandidates.find((candidate) =>
      otpMatches(candidate.code, expectedHash, code)
    );

    if (!verification) {
      return { success: false, error: "Código inválido ou expirado." };
    }

    const suppliedName = name?.trim();
    let client = await prisma.client.findUnique({
      where: { phone: cleanPhone },
    });

    if (!client) {
      if (!suppliedName) {
        return { success: false, needsName: true, message: "Primeiro acesso! Por favor, informe seu nome." };
      }
    }

    const consumed = await prisma.otpVerification.deleteMany({
      where: { id: verification.id },
    });
    if (consumed.count !== 1) {
      return { success: false, error: "Código já utilizado. Solicite um novo código." };
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          phone: cleanPhone,
          name: suppliedName!,
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
      googleId: client.googleId,
      appleId: client.appleId,
    };

    const cookieStore = await cookies();
    const token = await createSignedToken("client-session", sessionData, 60 * 60 * 24 * 30);
    cookieStore.set(
      "client_token",
      token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: "/",
      }
    );

    return { success: true, client };
  } catch (error) {
    console.error("Erro ao verificar OTP:", error);
    return { success: false, error: "Erro ao verificar código de segurança." };
  }
}

type GoogleIdentityResult =
  | { success: true; email: string; googleId: string; name: string }
  | { success: false; error: string };

export async function verifyGoogleIdToken(token: string): Promise<GoogleIdentityResult> {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const rateLimit = await assertRateLimit(`oauth:verify:${ip}`, {
      limit: 10,
      windowMs: 5 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });
    
    if (!rateLimit.allowed) {
      return { success: false, error: "Muitas tentativas. Aguarde 30 minutos e tente novamente." };
    }

    return await getGoogleIdentity(token);
  } catch (error) {
    console.error("Erro ao verificar token do Google:", error);
    return { success: false, error: "Falha na validação do token do Google." };
  }
}

async function getGoogleIdentity(token: string): Promise<GoogleIdentityResult> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return { success: false, error: "Login Google não configurado." };

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return { success: false, error: "Token do Google inválido ou expirado." };

  const payload = await response.json() as { aud?: string; iss?: string; sub?: string; email?: string; email_verified?: string | boolean; name?: string; exp?: string };
  const validIssuer = payload.iss === "accounts.google.com" || payload.iss === "https://accounts.google.com";
  const validExpiry = Number(payload.exp) * 1000 > Date.now();
  if (!validIssuer || payload.aud !== clientId || !payload.sub || !payload.email || payload.email_verified !== "true" && payload.email_verified !== true || !validExpiry) {
    return { success: false, error: "A identidade Google não pôde ser validada." };
  }

  return { success: true, email: payload.email, googleId: payload.sub, name: payload.name || "Cliente" };
}

export async function loginClientOAuth(data: {
  idToken?: string;
  email?: string;
  googleId?: string;
  appleId?: string;
  name?: string;
  phone?: string; // Telefone opcional para o vínculo
}): Promise<{
  success: boolean;
  linked: boolean;
  client: ClientSessionData | null;
  oauthData: { idToken?: string; email?: string; googleId?: string; appleId?: string; name?: string } | null;
  error?: string;
}> {
  try {
    if (!data.idToken) {
      return { success: false, linked: false, client: null, oauthData: null, error: "Token Google ausente." };
    }
    const identity = await getGoogleIdentity(data.idToken);
    if (!identity.success) return { success: false, linked: false, client: null, oauthData: null, error: identity.error };

    const rateLimit = await assertRateLimit(`oauth:login:${identity.googleId}`, {
      limit: 10,
      windowMs: 5 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });
    if (!rateLimit.allowed) return { success: false, linked: false, client: null, oauthData: null, error: "Muitas tentativas. Aguarde alguns minutos." };

    let client = await prisma.client.findUnique({ where: { googleId: identity.googleId } });
    if (!client && data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, "");
      const currentSession = await getCurrentClientSession();
      if (!currentSession || currentSession.phone.replace(/\D/g, "") !== cleanPhone) {
        return { success: false, linked: false, client: null, oauthData: null, error: "Valide o telefone antes de vinculá-lo ao Google." };
      }
      client = await prisma.client.update({
        where: { id: currentSession.clientId },
        data: { googleId: identity.googleId, email: identity.email, name: identity.name || currentSession.name },
      });
    }

    if (!client) {
      return {
        success: true,
        linked: false,
        client: null,
        oauthData: { idToken: data.idToken, email: identity.email, googleId: identity.googleId, name: identity.name },
      };
    }

    const sessionData: ClientSessionData = {
      clientId: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      googleId: client.googleId,
      appleId: client.appleId,
    };
    const cookieStore = await cookies();
    cookieStore.set("client_token", await createSignedToken("client-session", sessionData, 60 * 60 * 24 * 30), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return { success: true, linked: true, client: sessionData, oauthData: null };
  } catch (error) {
    console.error("Erro no login Google do cliente:", error);
    return { success: false, linked: false, client: null, oauthData: null, error: "Não foi possível concluir o login Google." };
  }
  /* try {
    const { email, googleId, appleId, name, phone } = data;
    if (!email && !googleId && !appleId) {
      return { success: false, error: "Identificadores OAuth ausentes." };
    }

    const key = googleId || appleId || email || "unknown";
    const rateLimit = await assertRateLimit(`oauth:login:${key}`, {
      limit: 10,
      windowMs: 5 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });
    
    if (!rateLimit.allowed) {
      return { success: false, error: "Muitas tentativas. Aguarde 30 minutos e tente novamente." };
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
        googleId: client.googleId,
        appleId: client.appleId,
      };

      const cookieStore = await cookies();
      const token = await createSignedToken("client-session", sessionData, 60 * 60 * 24 * 30);
      cookieStore.set(
        "client_token",
        token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        }
      );

      return { success: true, linked: true, client };
    }

    // Se for solicitado o vínculo direto (quando o telefone é fornecido junto com a verificação OTP)
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      
      // Buscar se já existe outro cliente com este telefone
      const existingClientByPhone = await prisma.client.findUnique({
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
        googleId: client.googleId,
        appleId: client.appleId,
      };

      const cookieStore = await cookies();
      const token = await createSignedToken("client-session", sessionData, 60 * 60 * 24 * 30);
      cookieStore.set(
        "client_token",
        token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        }
      );

      return { success: true, linked: true, client };
    }

    // Caso contrário, precisa vincular um telefone antes
    return {
      success: true,
      linked: false,
      oauthData: { email, googleId, appleId, name },
    };
  } catch (error) {
    console.error("Erro no login social do cliente:", error);
    return { success: false, error: "Erro interno no servidor ao tentar logar com rede social." };
  } */
}

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete("client_token");
}
