type TurnstileResult =
  | { success: true }
  | { success: false; error: string };

function getTurnstileSecret() {
  return process.env.TURNSTILE_SECRET_KEY || "";
}

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = getTurnstileSecret();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "CAPTCHA não configurado no servidor." };
    }

    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Confirme a verificação anti-bot." };
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);
  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    return { success: false, error: "Falha ao validar a verificação anti-bot." };
  }

  const data = (await response.json()) as { success?: boolean };
  if (!data.success) {
    return { success: false, error: "Verificação anti-bot inválida." };
  }

  return { success: true };
}
