"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailVerificationTokens } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { createVerificationToken } from "@/lib/auth/verify";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailTemplate } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";

export type VerifyState = { error?: string; sent?: boolean } | undefined;

/**
 * Sends a verification email. Used at sign-up and by the "resend" button.
 *
 * Failures are swallowed at sign-up so a mail outage never blocks account
 * creation — the banner and resend button remain available either way.
 */
export async function sendVerificationEmail(opts: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<boolean> {
  try {
    const token = await createVerificationToken(opts.userId, opts.email);
    const message = verifyEmailTemplate({
      name: opts.fullName,
      url: `${appUrl()}/verify-email?token=${token}`,
    });
    const result = await sendEmail({
      to: opts.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return result.ok;
  } catch (error) {
    console.error("verification email failed", error);
    return false;
  }
}

export async function resendVerificationAction(
  _prev: VerifyState,
  _formData: FormData,
): Promise<VerifyState> {
  const user = await requireUser();

  if (user.emailVerifiedAt) {
    return { error: "Your email is already confirmed." };
  }

  // One send per two minutes, to keep a repeated click from flooding an inbox.
  const recent = await db()
    .select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, user.id),
        gt(emailVerificationTokens.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
      ),
    )
    .limit(1);

  if (recent.length > 0) {
    return {
      error: "We sent a link in the last couple of minutes. Check your inbox and junk folder.",
    };
  }

  await sendVerificationEmail({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
  });

  revalidatePath("/app");
  return { sent: true };
}
