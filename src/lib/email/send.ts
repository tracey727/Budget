/**
 * Transactional email.
 *
 * Uses Resend's HTTP API, which is a plain `fetch` call and therefore works
 * inside Cloudflare Workers (SMTP is not available there).
 *
 * When RESEND_API_KEY is not configured the send is skipped and the message is
 * logged instead, so local development and preview deployments keep working
 * without an email account. That fallback never runs silently in production —
 * `emailConfigured()` drives a visible warning on the forgot-password page.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  // Must be a domain verified in Resend.
  return process.env.EMAIL_FROM ?? "Genevieve App <noreply@genevieveapp.com.au>";
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development fallback — surface the message rather than dropping it.
    console.warn(
      `[email] RESEND_API_KEY not set; not sending.\n` +
        `  to: ${opts.to}\n  subject: ${opts.subject}\n\n${opts.text}`,
    );
    return { ok: false, error: "not-configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[email] send failed ${response.status}: ${body.slice(0, 400)}`);
      return { ok: false, error: `provider-${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] send threw", error);
    return { ok: false, error: "network" };
  }
}
