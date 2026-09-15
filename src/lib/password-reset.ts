import crypto from "crypto";

function resetSecret() {
  return process.env.PASSWORD_RESET_SECRET || process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
}

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  const secret = resetSecret();
  if (!secret) throw new Error("PASSWORD_RESET_SECRET ou AUTH_SESSION_SECRET deve ser configurado.");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Recuperação de senha não está configurada.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Redefina sua senha", html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}">Redefinir senha</a></p><p>Este link expira em 30 minutos. Se você não solicitou esta alteração, ignore este e-mail.</p>` }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o e-mail de recuperação.");
}
