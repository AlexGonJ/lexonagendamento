import crypto from "crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  if (password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("scrypt$")) {
    const [, salt, encodedKey] = storedHash.split("$");
    if (!salt || !encodedKey) return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(encodedKey, "base64url");
    const actual = await derive(password, salt);
    return {
      valid: expected.length === actual.length && crypto.timingSafeEqual(expected, actual),
      needsUpgrade: false,
    };
  }

  // Supports the legacy SHA-256 records only until each user signs in once.
  const legacy = crypto.createHash("sha256").update(password).digest("hex");
  const valid = legacy.length === storedHash.length && crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(storedHash));
  return { valid, needsUpgrade: valid };
}
