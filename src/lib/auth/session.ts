import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "gm_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie carries the raw token; the database only ever stores its hash. */
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toHex(digest);
}

function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  const id = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db().insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export type SessionUser = Omit<User, "passwordHash">;

/** Resolves the signed-in user, or null. Safe to call from any server context. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = await hashToken(token);

  const rows = await db()
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db().delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  // Strip the hash so it can never reach a client component.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = row.user;
  return safe;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const id = await hashToken(token);
    await db().delete(sessions).where(eq(sessions.id, id));
  }
  store.delete(SESSION_COOKIE);
}

/** Housekeeping — called opportunistically on sign-in. */
export async function purgeExpiredSessions(): Promise<void> {
  await db().delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
