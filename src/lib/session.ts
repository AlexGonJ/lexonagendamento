import crypto from "crypto";

function getAuthSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-session-secret"
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSignedToken(
  purpose: string,
  payload: unknown,
  maxAgeSeconds: number
) {
  const secret = getAuthSecret();
  const body = {
    p: purpose,
    exp: Date.now() + maxAgeSeconds * 1000,
    data: payload,
  };
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = sign(encodedBody, secret);
  return `v1.${encodedBody}.${signature}`;
}

export function verifySignedToken<T>(
  token: string,
  purpose: string
): T | null {
  try {
    const secret = getAuthSecret();
    const [version, encodedBody, signature] = token.split(".");
    if (version !== "v1" || !encodedBody || !signature) return null;

    const expectedSignature = sign(encodedBody, secret);
    const expected = Buffer.from(expectedSignature, "utf8");
    const actual = Buffer.from(signature, "utf8");
    if (
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const body = JSON.parse(base64UrlDecode(encodedBody)) as {
      p?: string;
      exp?: number;
      data?: T;
    };

    if (body.p !== purpose) return null;
    if (typeof body.exp !== "number" || Date.now() > body.exp) return null;
    return (body.data ?? null) as T | null;
  } catch {
    return null;
  }
}
