import { requireUser } from "@/lib/auth/require";
import { listAlerts, unreadAlertCount } from "@/lib/alerts";
import { markAlertsReadAction } from "@/lib/actions/alerts";
import { AlertFeed } from "@/components/app/AlertFeed";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await requireUser();
  const [alerts, unread] = await Promise.all([
    listAlerts(user.id, 60),
    unreadAlertCount(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="gm-display text-3xl font-semibold">Updates</h1>
          <p className="gm-muted mt-1 text-sm">
            {unread > 0
              ? `${unread} new since you last looked.`
              : "Everything here has been seen."}
          </p>
        </div>

        {unread > 0 && (
          <form action={markAlertsReadAction}>
            <SubmitButton className="gm-btn-secondary" pendingLabel="Marking…">
              Mark all as read
            </SubmitButton>
          </form>
        )}
      </div>

      <section className="gm-card">
        <AlertFeed alerts={alerts} />
      </section>
    </div>
  );
}
