import crypto from "crypto";

const STEP_SECONDS = 30;

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/[\s=-]/g, "");
  if (!normalized || /[^A-Z2-7]/.test(normalized)) return null;
  let bits = "";
  for (const character of normalized) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function codeForCounter(secret: Buffer, counter: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(value % 1_000_000).padStart(6, "0");
}

export function verifyTotp(code: string, base32Secret: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = decodeBase32(base32Secret);
  if (!secret) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  const received = Buffer.from(code);
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(codeForCounter(secret, counter + offset));
    if (received.length === expected.length && crypto.timingSafeEqual(received, expected)) return true;
  }
  return false;
}
