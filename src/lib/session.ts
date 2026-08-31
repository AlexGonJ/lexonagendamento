function getAuthSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-session-secret"
  );
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(base64Url: string) {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToUint8Array(str: string) {
  return new TextEncoder().encode(str);
}

function uint8ArrayToString(buffer: Uint8Array) {
  return new TextDecoder().decode(buffer);
}

async function getCryptoKey(secret: string) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string, secret: string) {
  const key = await getCryptoKey(secret);
  const data = stringToUint8Array(value);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  return base64UrlEncode(signatureBuffer);
}

export async function createSignedToken(
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
  const bodyString = JSON.stringify(body);
  const encodedBody = base64UrlEncode(stringToUint8Array(bodyString));
  const signature = await sign(encodedBody, secret);
  return `v1.${encodedBody}.${signature}`;
}

export async function verifySignedToken<T>(
  token: string,
  purpose: string
): Promise<T | null> {
  try {
    const secret = getAuthSecret();
    const [version, encodedBody, signature] = token.split(".");
    if (version !== "v1" || !encodedBody || !signature) return null;

    const key = await getCryptoKey(secret);
    const data = stringToUint8Array(encodedBody);
    const signatureBytes = base64UrlDecode(signature);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      data
    );

    if (!isValid) {
      return null;
    }

    const bodyString = uint8ArrayToString(base64UrlDecode(encodedBody));
    const body = JSON.parse(bodyString) as {
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
