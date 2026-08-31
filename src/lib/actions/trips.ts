"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput } from "@/lib/money";
import type { FormState } from "./transactions";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const tripSchema = z
  .object({
    name: z.string().trim().min(1, "Name the trip.").max(80),
    destination: z.string().trim().max(120).optional(),
    startsOn: z.union([isoDate, z.literal("")]).optional(),
    endsOn: z.union([isoDate, z.literal("")]).optional(),
    budgetAmount: z.string().optional(),
    plannedKm: z.string().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) =>
      !data.startsOn || !data.endsOn || data.startsOn === "" || data.endsOn === ""
        ? true
        : data.startsOn <= data.endsOn,
    { message: "The end date cannot be before the start date.", path: ["endsOn"] },
  );

export async function createTripAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  // Starter gets one live trip so the feature is discoverable; paid plans are
  // unlimited. Enforced here rather than only in the UI.
  if (Number.isFinite(user.limits.trips)) {
    const rows = await db()
      .select({ count: sql<string>`count(*)` })
      .from(trips)
      .where(and(eq(trips.userId, user.id), eq(trips.archived, false)));
    if (Number(rows[0]?.count ?? 0) >= user.limits.trips) {
      return {
        error: `The Starter plan covers ${user.limits.trips} trip at a time. Archive it, or upgrade for unlimited trips.`,
      };
    }
  }

  const parsed = tripSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    destination: String(formData.get("destination") ?? ""),
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? ""),
    budgetAmount: String(formData.get("budgetAmount") ?? ""),
    plannedKm: String(formData.get("plannedKm") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const data = parsed.data;

  const budgetCents = data.budgetAmount
    ? parseAmountInput(data.budgetAmount)
    : null;
  if (data.budgetAmount && budgetCents === null) {
    return { error: "Enter a trip budget like 4500.00, or leave it blank." };
  }

  const km = data.plannedKm ? Number.parseInt(data.plannedKm, 10) : null;
  if (data.plannedKm && (!Number.isFinite(km) || (km ?? 0) < 0)) {
    return { error: "Enter planned kilometres as a whole number, or leave it blank." };
  }

  await db().insert(trips).values({
    userId: user.id,
    name: data.name,
    destination: data.destination || null,
    startsOn: data.startsOn || null,
    endsOn: data.endsOn || null,
    budgetAmount: budgetCents === null ? null : centsToDecimalString(budgetCents),
    plannedKm: km,
    notes: data.notes || null,
  });

  revalidatePath("/app/trips");
  revalidatePath("/app");
  return { ok: true };
}

export async function archiveTripAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .update(trips)
    .set({ archived: true })
    .where(and(eq(trips.id, id), eq(trips.userId, user.id)));

  revalidatePath("/app/trips");
  revalidatePath("/app");
}
