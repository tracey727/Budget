"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, purgeExpiredSessions } from "@/lib/auth/session";
import { seedStarterData } from "@/lib/data/seed";
import { AU_STATES } from "@/lib/dates";

export type AuthState = { error?: string } | undefined;

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "That password is too long."),
  state: z.enum(AU_STATES).optional(),
  plan: z.string().optional(),
});

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    state: formData.get("state") || undefined,
    plan: formData.get("plan") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { fullName, email, password, state, plan } = parsed.data;

  const existing = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { error: "An account with that email already exists. Try logging in." };
  }

  const passwordHash = await hashPassword(password);

  const inserted = await db()
    .insert(users)
    .values({ email, passwordHash, fullName, state: state ?? null })
    .returning({ id: users.id });

  const userId = inserted[0]?.id;
  if (!userId) return { error: "We could not create your account. Please try again." };

  // Give new users a working set of Australian categories and an account so
  // the dashboard is useful on first load rather than empty.
  await seedStarterData(userId);
  await createSession(userId);

  // A plan chosen on the pricing page carries through sign-up into checkout.
  redirect(plan ? `/api/billing/checkout?plan=${encodeURIComponent(plan)}` : "/app");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const { email, password } = parsed.data;

  const rows = await db()
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const row = rows[0];

  // Always run a verification so a missing account and a wrong password take
  // a similar amount of time, and report the same message either way.
  const ok = row
    ? await verifyPassword(password, row.passwordHash)
    : await verifyPassword(password, "pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

  if (!row || !ok) {
    return { error: "Email or password is incorrect." };
  }

  await purgeExpiredSessions().catch(() => undefined);
  await createSession(row.id);

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/app");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
