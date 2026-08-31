import { NextResponse, type NextRequest } from "next/server";
import { requireUserApi } from "@/lib/auth/require";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { purchasablePrices } from "@/lib/plans";
import { appUrl, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const VALID_LOOKUP_KEYS = new Set(purchasablePrices().map((p) => p.lookupKey));

export async function GET(request: NextRequest) {
  const user = await requireUserApi();
  const plan = request.nextUrl.searchParams.get("plan") ?? "";

  if (!user) {
    const next = `/api/billing/checkout?plan=${encodeURIComponent(plan)}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, appUrl()),
    );
  }

  // Only keys from our own catalogue are accepted, so a crafted URL cannot
  // point checkout at an arbitrary Stripe price.
  if (!VALID_LOOKUP_KEYS.has(plan)) {
    return NextResponse.redirect(new URL("/pricing?error=unknown-plan", appUrl()));
  }

  if (!stripeConfigured()) {
    return NextResponse.redirect(
      new URL("/app/billing?error=billing-unavailable", appUrl()),
    );
  }

  // A confirmed address is required before money changes hands: it is the
  // only way to reach the customer about renewals, receipts and failed
  // payments, and it keeps throwaway addresses out of the billing system.
  if (!user.emailVerifiedAt) {
    return NextResponse.redirect(
      new URL("/app/billing?error=email-unverified", appUrl()),
    );
  }

  try {
    const url = await createCheckoutSession({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        stripeCustomerId: user.stripeCustomerId,
      },
      lookupKey: plan,
    });
    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    console.error("checkout failed", error);
    return NextResponse.redirect(
      new URL("/app/billing?error=checkout-failed", appUrl()),
    );
  }
}
