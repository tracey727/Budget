import { requireTenant } from "@/lib/rescue/tenant";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireTenant();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Settings</h1>
        <p className="gm-muted mt-1 text-sm">
          These thresholds are business policy, not facts about your data, so they belong to you. Each one is
          quoted back in the findings it produces.
        </p>
      </div>

      <section className="gm-card">
        <h2 className="font-semibold">Workspace</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="gm-muted text-xs uppercase tracking-wide">Name</dt>
            <dd>{context.tenant.name}</dd>
          </div>
          <div>
            <dt className="gm-muted text-xs uppercase tracking-wide">Timezone</dt>
            <dd>{context.tenant.timezone}</dd>
          </div>
          <div>
            <dt className="gm-muted text-xs uppercase tracking-wide">Currency</dt>
            <dd>{context.tenant.currency}</dd>
          </div>
        </dl>
        <p className="gm-muted mt-3 text-xs">
          Timestamps without an offset in your exports are read in the workspace timezone. V1 is locked to
          AUD.
        </p>
      </section>

      {context.can("manage_settings") ? (
        <SettingsForm settings={context.settings} />
      ) : (
        <p className="gm-alert-warn text-sm">
          Your role can see the thresholds but not change them. Owners and admins can.
        </p>
      )}
    </div>
  );
}
