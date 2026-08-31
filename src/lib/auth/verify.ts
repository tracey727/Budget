import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toHex(digest);
}

export async function createVerificationToken(
  userId: string,
  email: string,
): Promise<string> {
  // Replace any outstanding token, so only the newest link works.
  await db()
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);

  await db().insert(emailVerificationTokens).values({
    id: await hashToken(token),
    userId,
    email,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return token;
}

export type VerifyOutcome =
  | { status: "verified"; email: string }
  | { status: "already-verified" }
  | { status: "invalid" };

/**
 * Consumes a verification token and marks the address verified.
 *
 * The token records the address it was issued for. If the user has since
 * changed their email, the token no longer matches and is rejected — so an old
 * link cannot verify a new, unproven address.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<VerifyOutcome> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { status: "invalid" };

  const id = await hashToken(token);

  const claimed = await db()
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailVerificationTokens.id, id),
        isNull(emailVerificationTokens.usedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      ),
    )
    .returning({
      userId: emailVerificationTokens.userId,
      email: emailVerificationTokens.email,
    });

  const row = claimed[0];
  if (!row) return { status: "invalid" };

  const updated = await db()
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, row.userId), eq(users.email, row.email)))
    .returning({ id: users.id });

  // The address changed between issuing and clicking; nothing was verified.
  if (updated.length === 0) return { status: "invalid" };

  return { status: "verified", email: row.email };
}

export async function purgeStaleVerificationTokens(): Promise<void> {
  await db()
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()));
}
