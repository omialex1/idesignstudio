import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";

// Two-step login with an authenticator app (RFC 6238: 6 digits, 30 seconds,
// SHA-1, which is what Google Authenticator, Microsoft Authenticator, Authy
// and the like all use).

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of text.replace(/=+$/, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary =
    ((hmac[offset] & 127) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

// The code the app shows right now (used by tests).
export function currentCode(secret: string, now = Date.now()): string {
  return codeAt(secret, currentStep(now));
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

// Returns the time step the code belongs to (the previous, current or next
// 30 seconds, to allow for clock drift), or null when it is wrong. A step that
// is not newer than `lastStep` is refused, so one code works only once.
export function verifyTotp(
  secret: string,
  code: string,
  lastStep: number | null,
  now = Date.now(),
): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(now);
  for (const candidate of [step, step - 1, step + 1]) {
    if (lastStep !== null && candidate <= lastStep) continue;
    const expected = Buffer.from(codeAt(secret, candidate));
    const given = Buffer.from(clean);
    if (timingSafeEqual(expected, given)) return candidate;
  }
  return null;
}

export function otpauthUri(secret: string, username: string): string {
  const label = encodeURIComponent(`iDesignStudio.ro:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("iDesignStudio.ro")}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

// ---- storing the secret: AES-256-GCM, key derived from the admin secret ----

function key(purpose: string): Buffer {
  const base = process.env.ADMIN_SESSION_SECRET;
  if (!base) throw new Error("ADMIN_SESSION_SECRET is not set");
  return Buffer.from(
    hkdfSync("sha256", base, "idesignstudio-admin", purpose, 32),
  );
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("totp-secret"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64"))
    .join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key("totp-secret"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

// ---- backup codes ----

export const BACKUP_CODE_COUNT = 20;
// no 0/o/1/l/i, which are easy to mix up when read from paper
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from(
      { length: 10 },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

export function normalizeBackupCode(input: string): string {
  const clean = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean.length === 10 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : "";
}

export function hashBackupCode(code: string): string {
  return createHmac("sha256", key("backup-code")).update(code).digest("hex");
}
