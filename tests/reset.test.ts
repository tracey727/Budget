/**
 * Password reset token behaviour, exercised against an in-memory stand-in for
 * the database so the security properties can be tested without Postgres.
 *
 * These mirror the real queries in src/lib/auth/reset.ts: hashed storage,
 * single use, expiry, and invalidation of earlier tokens.
 */

type Row = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

let store: Row[] = [];

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

async function createResetToken(userId: string): Promise<string> {
  store = store.filter((r) => r.userId !== userId);
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  store.push({
    id: await hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  });
  return token;
}

async function resolveResetToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const id = await hashToken(token);
  const row = store.find(
    (r) => r.id === id && r.usedAt === null && r.expiresAt > new Date(),
  );
  return row?.userId ?? null;
}

async function consumeResetToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  const id = await hashToken(token);
  const row = store.find(
    (r) => r.id === id && r.usedAt === null && r.expiresAt > new Date(),
  );
  if (!row) return false;
  row.usedAt = new Date();
  return true;
}

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) pass += 1;
  else {
    fail += 1;
    console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`);
  }
}

async function main() {
  const USER = "11111111-1111-1111-1111-111111111111";
  const OTHER = "22222222-2222-2222-2222-222222222222";

  // Token format and storage
  store = [];
  const token = await createResetToken(USER);
  check("token is 64 hex chars", /^[0-9a-f]{64}$/.test(token), true);
  check("raw token is not stored", store.some((r) => r.id === token), false);
  check("hash is stored", store[0].id, await hashToken(token));

  // Valid token resolves
  check("valid token resolves to user", await resolveResetToken(token), USER);

  // Single use
  check("first consume succeeds", await consumeResetToken(token), true);
  check("second consume fails", await consumeResetToken(token), false);
  check("consumed token no longer resolves", await resolveResetToken(token), null);

  // Issuing a new token invalidates the previous one
  store = [];
  const first = await createResetToken(USER);
  const second = await createResetToken(USER);
  check("old token invalidated by new request", await resolveResetToken(first), null);
  check("new token still valid", await resolveResetToken(second), USER);
  check("only one row per user", store.filter((r) => r.userId === USER).length, 1);

  // Expiry
  store = [];
  const expiring = await createResetToken(USER);
  store[0].expiresAt = new Date(Date.now() - 1000);
  check("expired token rejected", await resolveResetToken(expiring), null);
  check("expired token cannot be consumed", await consumeResetToken(expiring), false);

  // Malformed input
  check("empty token rejected", await resolveResetToken(""), null);
  check("short token rejected", await resolveResetToken("abc"), null);
  check("non-hex token rejected", await resolveResetToken("z".repeat(64)), null);
  check("uppercase hex rejected", await resolveResetToken("A".repeat(64)), null);
  check("sql-ish token rejected", await resolveResetToken("' OR 1=1 --"), null);

  // Tokens are per user and unguessable
  store = [];
  const a = await createResetToken(USER);
  const b = await createResetToken(OTHER);
  check("tokens differ between users", a === b, false);
  check("user A token maps to user A", await resolveResetToken(a), USER);
  check("user B token maps to user B", await resolveResetToken(b), OTHER);

  // Randomness: no collisions across many issues
  store = [];
  const seen = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    seen.add(await createResetToken(`user-${i}`));
  }
  check("200 tokens are all distinct", seen.size, 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
