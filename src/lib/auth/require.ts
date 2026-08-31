import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import { effectivePlan, limitsFor, type PlanKey, type PlanLimits } from "@/lib/plans";

export type Viewer = SessionUser & {
  /** Plan actually in force right now, after checking subscription status. */
  activePlan: PlanKey;
  limits: PlanLimits;
};

/** Guards a server component or action; redirects to login when signed out. */
export async function requireUser(nextPath?: string): Promise<Viewer> {
  const user = await getSessionUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }

  const activePlan = effectivePlan(user.plan, user.planStatus);
  return { ...user, activePlan, limits: limitsFor(activePlan) };
}

/** Throws for API routes rather than redirecting. */
export async function requireUserApi(): Promise<Viewer | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const activePlan = effectivePlan(user.plan, user.planStatus);
  return { ...user, activePlan, limits: limitsFor(activePlan) };
}
