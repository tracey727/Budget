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
