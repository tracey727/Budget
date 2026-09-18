/**
 * Comparing a secret without leaking it.
 *
 * A naive `===` on a signature or a shared secret returns as soon as two bytes
 * differ, and the time that takes is enough to recover the value one byte at a
 * time. This always walks the whole string.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
