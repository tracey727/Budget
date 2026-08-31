"use server";

import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  consumeResetToken,
  createResetToken,
  purgeStaleResetTokens,
  resolveResetToken,
} from "@/lib/auth/reset";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";

export type ResetState = { error?: string; sent?: boolean } | undefined;

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

/**
 * Starts a password reset.
 *
 * Always reports success, whether or not the address has an account — telling
 * an anonymous visitor which emails are registered would leak the user list.
 */
export async function requestResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const { email } = parsed.data;

  await purgeStaleResetTokens().catch(() => undefined);

  const rows = await db()
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];

  if (user) {
    // One live request per user at a time: if a token was issued in the last
    // two minutes, do not issue another. This blunts inbox flooding without
    // revealing anything to the requester.
    const recent = await db()
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          gt(passwordResetTokens.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
        ),
      )
      .limit(1);

    if (recent.length === 0) {
      const token = await createResetToken(user.id);
      const url = `${appUrl()}/reset-password?token=${token}`;
      const message = passwordResetEmail({ name: user.fullName, url });

      await sendEmail({
        to: email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    }
  }

  return { sent: true };
}

const resetSchema = z
  .object({
    token: z.string().regex(/^[0-9a-f]{64}$/, "That reset link is not valid."),
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(200, "That password is too long."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Those passwords do not match.",
    path: ["confirm"],
  });

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { token, password } = parsed.data;

  // Re-check before hashing so an expired link fails fast.
  if (!(await resolveResetToken(token))) {
    return {
      error:
        "That reset link has expired or has already been used. Request a new one.",
    };
  }

  const ok = await consumeResetToken(token, await hashPassword(password));
  if (!ok) {
    return {
      error:
        "That reset link has expired or has already been used. Request a new one.",
    };
  }

  redirect("/login?reset=1");
}
