/**
 * Email verification token behaviour, exercised against an in-memory stand-in
 * for the database so the security properties can be tested without Postgres.
 *
 * Mirrors src/lib/auth/verify.ts: hashed storage, single use, expiry, newest
 * token wins, and rejection when the account's email has since changed.
 */

type Row = {
  id: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
};

let tokens: Row[] = [];
let accounts = new Map<string, { email: string; verifiedAt: Date | null }>();

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

async function createVerificationToken(userId: string, email: string) {
  tokens = tokens.filter((t) => t.userId !== userId);
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  tokens.push({
    id: await hashToken(token),
    userId,
    email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
  });
  return token;
}

type Outcome =
  | { status: "verified"; email: string }
  | { status: "invalid" };

async function consumeVerificationToken(token: string): Promise<Outcome> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { status: "invalid" };
  const id = await hashToken(token);
  const row = tokens.find(
    (t) => t.id === id && t.usedAt === null && t.expiresAt > new Date(),
  );
  if (!row) return { status: "invalid" };
  row.usedAt = new Date();

  // Only verifies when the account still has the address the token was for.
  const account = accounts.get(row.userId);
  if (!account || account.email !== row.email) return { status: "invalid" };
  account.verifiedAt = new Date();
  return { status: "verified", email: row.email };
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

  function reset() {
    tokens = [];
    accounts = new Map([
      [USER, { email: "a@example.com", verifiedAt: null }],
      [OTHER, { email: "b@example.com", verifiedAt: null }],
    ]);
  }

  // Format and hashed storage
  reset();
  const token = await createVerificationToken(USER, "a@example.com");
  check("token is 64 hex chars", /^[0-9a-f]{64}$/.test(token), true);
  check("raw token not stored", tokens.some((t) => t.id === token), false);
  check("hash stored", tokens[0].id, await hashToken(token));

  // Happy path
  check("valid token verifies", await consumeVerificationToken(token), {
    status: "verified",
    email: "a@example.com",
  });
  check("account marked verified", accounts.get(USER)!.verifiedAt !== null, true);

  // Single use
  check("second use rejected", await consumeVerificationToken(token), { status: "invalid" });

  // Newest token wins
  reset();
  const first = await createVerificationToken(USER, "a@example.com");
  const second = await createVerificationToken(USER, "a@example.com");
  check("older token invalidated", await consumeVerificationToken(first), { status: "invalid" });
  check("newest token works", (await consumeVerificationToken(second)).status, "verified");
  check("one row per user", tokens.filter((t) => t.userId === USER).length, 1);

  // Expiry
  reset();
  const expiring = await createVerificationToken(USER, "a@example.com");
  tokens[0].expiresAt = new Date(Date.now() - 1000);
  check("expired token rejected", await consumeVerificationToken(expiring), { status: "invalid" });
  check("account stays unverified", accounts.get(USER)!.verifiedAt, null);

  // Address changed after the link was sent
  reset();
  const stale = await createVerificationToken(USER, "a@example.com");
  accounts.get(USER)!.email = "changed@example.com";
  check("token for old address rejected", await consumeVerificationToken(stale), { status: "invalid" });
  check("changed address not verified", accounts.get(USER)!.verifiedAt, null);

  // Malformed input
  reset();
  check("empty rejected", await consumeVerificationToken(""), { status: "invalid" });
  check("short rejected", await consumeVerificationToken("abc"), { status: "invalid" });
  check("non-hex rejected", await consumeVerificationToken("z".repeat(64)), { status: "invalid" });
  check("uppercase rejected", await consumeVerificationToken("A".repeat(64)), { status: "invalid" });

  // Cross-user isolation
  reset();
  const ta = await createVerificationToken(USER, "a@example.com");
  const tb = await createVerificationToken(OTHER, "b@example.com");
  check("tokens differ", ta === tb, false);
  check("A verifies A", (await consumeVerificationToken(ta)).status, "verified");
  check("B still unverified", accounts.get(OTHER)!.verifiedAt, null);
  check("B verifies B", (await consumeVerificationToken(tb)).status, "verified");

  // Randomness
  reset();
  const seen = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    seen.add(await createVerificationToken(`user-${i}`, `u${i}@example.com`));
  }
  check("200 tokens distinct", seen.size, 200);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();

export {};
