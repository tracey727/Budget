import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankConnections } from "@/lib/db/schema";
import { requireUserApi } from "@/lib/auth/require";
import { providerFor } from "@/lib/bank/provider";
import { syncConnection } from "@/lib/bank/sync";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Where the provider sends a person once they have finished at their bank.
 *
 * The outcome is never taken from the query string — a redirect a person's
 * browser made is not evidence of consent. The provider is asked directly what
 * state the connection is in, and only then is the link marked active.
 */
export async function GET(request: Request) {
  const user = await requireUserApi();
  if (!user) {
    return NextResponse.redirect(`${appUrl()}/login?next=/app/bank`);
  }

  const back = (params: Record<string, string>) =>
    NextResponse.redirect(
      `${appUrl()}/app/bank?${new URLSearchParams(params).toString()}`,
    );

  // The newest link the person started is the one they just came back from.
  const pending = await db()
    .select()
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, user.id),
        eq(bankConnections.status, "pending"),
      ),
    )
    .orderBy(bankConnections.createdAt)
    .limit(10);

  const connection = pending[pending.length - 1];
  if (!connection) return back({ error: "no-pending" });

  const url = new URL(request.url);
  if (url.searchParams.get("error") || url.searchParams.get("cancelled")) {
    await db()
      .update(bankConnections)
      .set({
        status: "revoked",
        lastError: "The connection was cancelled before it finished.",
        updatedAt: new Date(),
      })
      .where(eq(bankConnections.id, connection.id));
    return back({ error: "cancelled" });
  }

  const provider = providerFor(connection.provider);

  try {
    const { ref, state } = await provider.finaliseConsent({
      providerConnectionId: connection.providerConnectionId,
      providerUserId: connection.providerUserId,
    });

    if (state.status === "pending") {
      // The bank is still working through it; the scheduled sync will finish
      // the job once the provider reports the connection active.
      return back({ pending: "1" });
    }

    await db()
      .update(bankConnections)
      .set({
        providerConnectionId: ref.providerConnectionId,
        providerUserId: ref.providerUserId,
        status: state.status,
        institutionId: state.institutionId ?? connection.institutionId,
        institutionName: state.institutionName ?? connection.institutionName,
        consentExpiresAt: state.consentExpiresAt ?? connection.consentExpiresAt,
        lastError: state.error,
        updatedAt: new Date(),
      })
      .where(eq(bankConnections.id, connection.id));

    if (state.status !== "active") return back({ error: state.status });

    const refreshed = await db()
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.id, connection.id))
      .limit(1);

    const result = refreshed[0]
      ? await syncConnection(refreshed[0], "connect")
      : null;

    return back({
      connected: "1",
      imported: String(result?.added ?? 0),
      pendingCount: String(result?.cleared ?? 0),
    });
  } catch {
    await db()
      .update(bankConnections)
      .set({
        status: "error",
        lastError: "The connection could not be confirmed with your bank.",
        updatedAt: new Date(),
      })
      .where(eq(bankConnections.id, connection.id));
    return back({ error: "failed" });
  }
}
