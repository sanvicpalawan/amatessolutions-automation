/**
 * Secret storage at rest — BACKEND ONLY.
 *
 * Provider API keys saved through the backoffice are encrypted with
 * AES-256-GCM before they touch Postgres, keyed off `ADMIN_SESSION_SECRET`.
 * A database dump alone therefore does not expose the keys.
 *
 * Rotating `ADMIN_SESSION_SECRET` invalidates every stored secret; the admin
 * simply re-enters them. That is deliberate: fail closed, never fail open.
 */
import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const secret =
    process.env.ADMIN_SESSION_SECRET ?? process.env.DATABASE_URL ?? "amates-dev-secret";
  return createHash("sha256").update(`amates-secret-store:${secret}`).digest();
}

/** Returns `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

/** Returns null for anything that cannot be authenticated — never throws. */
export function decryptSecret(payload: string | undefined | null): string | null {
  if (!payload) return null;
  const [version, rawIv, rawTag, rawData] = payload.split(".");
  if (version !== VERSION || !rawIv || !rawTag || !rawData) return null;

  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(rawIv, "base64url"));
    decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(rawData, "base64url")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // Wrong secret, tampered ciphertext, or a rotated key.
    return null;
  }
}
