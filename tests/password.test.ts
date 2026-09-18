/**
 * Password hashing.
 *
 * The case that matters most here is the boring one: a hash made with a
 * different iteration count must still verify. The count is stored alongside
 * the hash for exactly that reason, and it is what lets the cost be tuned —
 * up or down — without locking a single person out of their account.
 */

import { hashPassword, verifyPassword } from "../src/lib/auth/password";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

const PASSWORD = "correct horse battery staple";

/** Produces a hash at an explicit cost, mirroring the stored format exactly. */
async function hashAt(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  const b64 = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  return `pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

async function main() {
  const hash = await hashPassword(PASSWORD);

  check("a hash names its algorithm and cost", hash.split("$").slice(0, 2), ["pbkdf2-sha256", "100000"]);
  check("the right password verifies", await verifyPassword(PASSWORD, hash), true);
  check("a wrong password does not", await verifyPassword("not the password", hash), false);
  check("an empty password does not", await verifyPassword("", hash), false);

  // Two hashes of the same password must differ: the salt is per-hash.
  const second = await hashPassword(PASSWORD);
  check("the same password hashes differently each time", hash === second, false);
  check("and both still verify", await verifyPassword(PASSWORD, second), true);

  /* ------------------------- the compatibility guarantee ------------------- */

  // 600,000 is what this codebase used before the Worker CPU cost forced it
  // down. Every account created then must keep working.
  check("a genuine 600k hash still verifies", await verifyPassword(PASSWORD, await hashAt(PASSWORD, 600_000)), true);
  check("a genuine 310k hash still verifies", await verifyPassword(PASSWORD, await hashAt(PASSWORD, 310_000)), true);
  check(
    "a wrong password fails against a legacy hash too",
    await verifyPassword("wrong", await hashAt(PASSWORD, 600_000)),
    false,
  );

  // Proof that the stored count is actually used rather than ignored: relabel a
  // 100k digest as 600k and it must stop verifying.
  const relabelled = (await hashAt(PASSWORD, 100_000)).replace("$100000$", "$600000$");
  check("a relabelled cost breaks verification", await verifyPassword(PASSWORD, relabelled), false);

  /* ----------------------------- malformed input --------------------------- */

  check("a hash with too few parts is refused", await verifyPassword(PASSWORD, "pbkdf2-sha256$100000$onlythree"), false);
  check("an unknown algorithm is refused", await verifyPassword(PASSWORD, "scrypt$100000$c2FsdA==$aGFzaA=="), false);
  check("a zero iteration count is refused", await verifyPassword(PASSWORD, "pbkdf2-sha256$0$c2FsdA==$aGFzaA=="), false);
  check("a non-numeric count is refused", await verifyPassword(PASSWORD, "pbkdf2-sha256$many$c2FsdA==$aGFzaA=="), false);
  check("rubbish is refused", await verifyPassword(PASSWORD, "not a hash at all"), false);
  check("an empty stored hash is refused", await verifyPassword(PASSWORD, ""), false);

  console.log(`\npassword: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
