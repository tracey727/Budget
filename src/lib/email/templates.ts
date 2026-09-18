import { BUSINESS } from "@/lib/business";

/** Escapes text before it is placed inside an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function passwordResetEmail(opts: { name: string; url: string }) {
  const name = escapeHtml(opts.name.split(" ")[0] ?? "there");
  const url = escapeHtml(opts.url);

  const text = [
    `Hi ${opts.name.split(" ")[0] ?? "there"},`,
    "",
    `Someone asked to reset the password on your ${BUSINESS.appName} account.`,
    "",
    "Open this link to choose a new password. It expires in 1 hour and can only be used once:",
    opts.url,
    "",
    "If you did not ask for this, you can ignore this email — your password will not change.",
    "",
    BUSINESS.appName,
    BUSINESS.supportEmail,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en-AU">
  <body style="margin:0;padding:24px;background:#f7f9fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1c2230;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e9f0;border-radius:12px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px;font-size:20px;font-weight:800;">${escapeHtml(BUSINESS.appName)}</p>
          <p style="margin:0 0 14px;font-size:15px;">Hi ${name},</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
            Someone asked to reset the password on your ${escapeHtml(BUSINESS.appName)} account.
          </p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;">
            Choose a new password using the button below. The link expires in
            <strong>1 hour</strong> and can only be used once.
          </p>
          <p style="margin:0 0 22px;">
            <a href="${url}"
               style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:15px;">
              Choose a new password
            </a>
          </p>
          <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#576e90;">
            If the button does not work, copy this link into your browser:<br>
            <span style="word-break:break-all;">${url}</span>
          </p>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#576e90;">
            If you did not ask for this, you can ignore this email — your password will not change.
          </p>
          <hr style="border:none;border-top:1px solid #e3e9f0;margin:22px 0 14px;">
          <p style="margin:0;font-size:12px;color:#576e90;">
            ${escapeHtml(BUSINESS.appName)} ·
            <a href="mailto:${escapeHtml(BUSINESS.supportEmail)}" style="color:#059669;">${escapeHtml(BUSINESS.supportEmail)}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `Reset your ${BUSINESS.appName} password`,
    text,
    html,
  };
}

export function verifyEmailTemplate(opts: { name: string; url: string }) {
  const name = escapeHtml(opts.name.split(" ")[0] ?? "there");
  const url = escapeHtml(opts.url);

  const text = [
    `Hi ${opts.name.split(" ")[0] ?? "there"},`,
    "",
    `Welcome to ${BUSINESS.appName}.`,
    "",
    "Confirm your email address by opening this link. It expires in 7 days:",
    opts.url,
    "",
    "Confirming your address lets us reach you about your account, and is",
    "required before you subscribe to a paid plan.",
    "",
    "If you did not create this account, you can ignore this email.",
    "",
    BUSINESS.appName,
    BUSINESS.supportEmail,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en-AU">
  <body style="margin:0;padding:24px;background:#f7f9fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1c2230;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e9f0;border-radius:12px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px;font-size:20px;font-weight:800;">${escapeHtml(BUSINESS.appName)}</p>
          <p style="margin:0 0 14px;font-size:15px;">Hi ${name},</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
            Welcome to ${escapeHtml(BUSINESS.appName)}. Confirm your email address
            so we can reach you about your account.
          </p>
          <p style="margin:0 0 22px;">
            <a href="${url}"
               style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:15px;">
              Confirm my email
            </a>
          </p>
          <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#576e90;">
            If the button does not work, copy this link into your browser:<br>
            <span style="word-break:break-all;">${url}</span>
          </p>
          <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#576e90;">
            This link expires in 7 days. If you did not create this account, you
            can ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #e3e9f0;margin:22px 0 14px;">
          <p style="margin:0;font-size:12px;color:#576e90;">
            ${escapeHtml(BUSINESS.appName)} ·
            <a href="mailto:${escapeHtml(BUSINESS.supportEmail)}" style="color:#059669;">${escapeHtml(BUSINESS.supportEmail)}</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `Confirm your email for ${BUSINESS.appName}`,
    text,
    html,
  };
}

/**
 * The money digest — what changed since we last wrote.
 *
 * Kept deliberately plain: a person skimming this on a phone needs to see the
 * numbers, not a newsletter. Each line is one finding, in the order it was
 * raised.
 */
export function alertDigestEmail(opts: {
  name: string;
  appUrl: string;
  items: Array<{ title: string; body: string; severity: string }>;
  availableCents: number | null;
  pendingCents: number | null;
}) {
  const first = opts.name.split(" ")[0] ?? "there";
  const money = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
      cents / 100,
    );

  const summaryLine =
    opts.availableCents === null
      ? null
      : `Safe to spend right now: ${money(opts.availableCents)}` +
        (opts.pendingCents ? ` (${money(opts.pendingCents)} still pending)` : "");

  const text = [
    `Hi ${first},`,
    "",
    "Here is what has moved on your accounts:",
    "",
    ...opts.items.map((item) => `• ${item.title}\n  ${item.body}`),
    "",
    ...(summaryLine ? [summaryLine, ""] : []),
    `See the detail: ${opts.appUrl}/app`,
    "",
    BUSINESS.appName,
  ].join("\n");

  const rows = opts.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e3e9f0;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${
              item.severity === "critical"
                ? "#b42318"
                : item.severity === "warning"
                  ? "#a15c07"
                  : "#1c2230"
            };">${escapeHtml(item.title)}</p>
            <p style="margin:0;font-size:14px;line-height:1.55;color:#576e90;">${escapeHtml(item.body)}</p>
          </td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en-AU">
  <body style="margin:0;padding:24px;background:#f7f9fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1c2230;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e9f0;border-radius:12px;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 18px;font-size:20px;font-weight:800;">${escapeHtml(BUSINESS.appName)}</p>
          <p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(first)}, here is what has moved on your accounts.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;">${rows}</table>
          ${
            summaryLine
              ? `<p style="margin:18px 0 0;font-size:15px;font-weight:700;">${escapeHtml(summaryLine)}</p>`
              : ""
          }
          <p style="margin:22px 0 0;">
            <a href="${escapeHtml(opts.appUrl)}/app"
               style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:15px;">
              Open your dashboard
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #e3e9f0;margin:22px 0 14px;">
          <p style="margin:0;font-size:12px;color:#576e90;">
            ${escapeHtml(BUSINESS.appName)} · You are receiving this because you have alerts turned on.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject:
      opts.items.length === 1
        ? opts.items[0].title
        : `${opts.items.length} updates on your accounts`,
    text,
    html,
  };
}
