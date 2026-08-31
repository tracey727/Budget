import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, sessions, users } from "@/lib/db/schema";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Only the hash is stored; the raw token lives solely in the emailed link. */
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toHex(digest);
}

export async function createResetToken(userId: string): Promise<string> {
  // Any earlier outstanding token for this user stops working, so a reset
  // link cannot be resurrected after a newer one is requested.
  await db()
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);

  await db().insert(passwordResetTokens).values({
    id: await hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return token;
}

/** Returns the user id when the token is valid, unused and unexpired. */
export async function resolveResetToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const rows = await db()
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, await hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0]?.userId ?? null;
}

/**
 * Consumes the token and sets the new password.
 *
 * The token is marked used in a conditional update, so two concurrent
 * submissions of the same link cannot both succeed. Every existing session is
 * destroyed, which signs out anyone who had access with the old password —
 * the point of a reset after a suspected compromise.
 */
export async function consumeResetToken(
  token: string,
  newPasswordHash: string,
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;

  const id = await hashToken(token);

  const consumed = await db()
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.id, id),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: passwordResetTokens.userId });

  const userId = consumed[0]?.userId;
  if (!userId) return false;

  await db()
    .update(users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db().delete(sessions).where(eq(sessions.userId, userId));

  return true;
}

/** Housekeeping: drop tokens that are expired, or used and a week old. */
export async function purgeStaleResetTokens(): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await db()
    .delete(passwordResetTokens)
    .where(
      or(
        lt(passwordResetTokens.expiresAt, new Date()),
        lt(passwordResetTokens.createdAt, weekAgo),
      ),
    );
}
