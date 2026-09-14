"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require";
import { markAlertsRead } from "@/lib/alerts";

/** Marks one alert read, or all of them when no id is given. */
export async function markAlertsReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const single = z.string().uuid().safeParse(id).success ? id : undefined;

  await markAlertsRead(user.id, single);

  revalidatePath("/app");
  revalidatePath("/app/alerts");
}
