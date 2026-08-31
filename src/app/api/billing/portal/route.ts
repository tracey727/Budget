import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require";
import { createPortalSession } from "@/lib/stripe/billing";
import { appUrl, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUserApi();
  if (!user) return NextResponse.redirect(new URL("/login", appUrl()));

  if (!stripeConfigured() || !user.stripeCustomerId) {
    return NextResponse.redirect(new URL("/app/billing?error=no-subscription", appUrl()));
  }

  try {
    const url = await createPortalSession(user.stripeCustomerId);
    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    console.error("portal failed", error);
    return NextResponse.redirect(new URL("/app/billing?error=portal-failed", appUrl()));
  }
}
