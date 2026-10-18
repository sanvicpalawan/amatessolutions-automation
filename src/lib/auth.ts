import "server-only";

import { timingSafeEqual, createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";

const COOKIE_NAME = "amates_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.DATABASE_URL ?? "amates-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

function createToken(userId: number, email: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  // `|` separator: emails contain dots, so dots are not safe delimiters here.
  const payload = `${userId}|${email}|${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export type SessionUser = { id: number; email: string };

function parseToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (sign(payload) !== signature) return null;
  const [rawId, email, rawExpires] = payload.split("|");
  const expires = Number(rawExpires);
  if (!rawId || !email || !Number.isFinite(expires) || expires < Date.now()) return null;
  return { id: Number(rawId), email };
}

/**
 * `Secure` must only be set when the browser is actually on HTTPS — otherwise
 * (e.g. a plain-HTTP deployment or a local preview) the browser silently drops
 * the cookie and the admin session appears to "not stick" after login.
 */
async function cookieIsSecure(): Promise<boolean> {
  if (process.env.ADMIN_COOKIE_SECURE) {
    return process.env.ADMIN_COOKIE_SECURE !== "false";
  }
  if (process.env.NODE_ENV !== "production") return false;
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-proto");
    if (forwarded) return forwarded.split(",")[0].trim() === "https";
  } catch {
    // headers() unavailable in this context — fall through to the safe default.
  }
  return false;
}

async function startSession(userId: number, email: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(userId, email), {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieIsSecure(),
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return parseToken(store.get(COOKIE_NAME)?.value);
}

/** Guard for protected API routes. Returns null when authorised. */
export async function requireApiSession(request: Request): Promise<Response | null> {
  const session = await getSessionUser();
  if (session) return null;

  // Machine-to-machine access for the protected quote endpoint.
  const headerKey = request.headers.get("x-api-key");
  const serviceKey = process.env.AGENT_API_KEY;
  if (serviceKey && headerKey && headerKey === serviceKey) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/* ------------------------------------------------------------------ *
 * Passkey authentication (build phase)
 * ------------------------------------------------------------------ */

const PASSKEY_MAX_ATTEMPTS = 5;
const PASSKEY_LOCKOUT_MS = 15 * 60 * 1000;
const PASSKEY_SETTING_KEY = "admin_passkey_security";
const PASSKEY_LENGTH = 4;

type PasskeyState = { failedAttempts: number; lockedUntil: number };

/** Constant-time compare so we don't leak the passkey through timing. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a.padEnd(64, "\0"));
  const bufferB = Buffer.from(b.padEnd(64, "\0"));
  return timingSafeEqual(bufferA, bufferB) && a.length === b.length;
}

async function readPasskeyState(): Promise<PasskeyState> {
  try {
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, PASSKEY_SETTING_KEY))
      .limit(1);
    const raw = (rows[0]?.value ?? {}) as Partial<PasskeyState>;
    return {
      failedAttempts: Number(raw.failedAttempts) || 0,
      lockedUntil: Number(raw.lockedUntil) || 0,
    };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}

async function writePasskeyState(state: PasskeyState): Promise<void> {
  await db
    .insert(settings)
    .values({ key: PASSKEY_SETTING_KEY, value: state as object, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: state as object, updatedAt: new Date() },
    });
}

export type PasskeyStatus = {
  locked: boolean;
  retryAfterSeconds: number;
  attemptsLeft: number;
  length: number;
};

/** Current lockout state, for rendering the login screen. */
export async function passkeyStatus(): Promise<PasskeyStatus> {
  const state = await readPasskeyState();
  const now = Date.now();
  if (state.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      attemptsLeft: 0,
      length: PASSKEY_LENGTH,
    };
  }
  return {
    locked: false,
    retryAfterSeconds: 0,
    attemptsLeft: Math.max(0, PASSKEY_MAX_ATTEMPTS - state.failedAttempts),
    length: PASSKEY_LENGTH,
  };
}

export type PasskeyResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

/**
 * Verifies the build-phase passkey and starts a session.
 * Locks for 15 minutes after 5 wrong tries.
 *
 * NOTE: a 4-digit passkey is a build-phase convenience, not production auth.
 * Swap this for a real provider (or the scrypt user table, still in the schema)
 * before going live.
 */
export async function loginWithPasskey(passkey: string): Promise<PasskeyResult> {
  const status = await passkeyStatus();
  if (status.locked) {
    return {
      ok: false,
      error: `Too many attempts. Try again in ${Math.ceil(status.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const expected = (process.env.ADMIN_PASSKEY ?? "5309").trim();
  const submitted = (passkey ?? "").trim();

  if (submitted.length !== PASSKEY_LENGTH) {
    return { ok: false, error: `Enter the ${PASSKEY_LENGTH}-digit passkey.` };
  }

  if (safeEqual(submitted, expected)) {
    await writePasskeyState({ failedAttempts: 0, lockedUntil: 0 });
    const user: SessionUser = { id: 1, email: "owner@amatessolutions.com" };
    await startSession(user.id, user.email);
    return { ok: true, user };
  }

  const state = await readPasskeyState();
  const failedAttempts = state.failedAttempts + 1;
  const lockedUntil =
    failedAttempts >= PASSKEY_MAX_ATTEMPTS ? Date.now() + PASSKEY_LOCKOUT_MS : 0;
  await writePasskeyState({ failedAttempts, lockedUntil });

  if (lockedUntil) {
    return { ok: false, error: "Too many attempts. Locked for 15 minutes." };
  }
  return {
    ok: false,
    error: `Incorrect passkey. ${PASSKEY_MAX_ATTEMPTS - failedAttempts} attempt(s) left.`,
  };
}
