import { Resend } from "resend";

/**
 * Best-effort notification email to the campaign team via Resend.
 * Never throws — a failed email must not fail the form submission.
 * Configure RESEND_API_KEY and NOTIFY_EMAIL to enable; otherwise it no-ops.
 */
export async function notifyCampaign(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      // Uses Resend's shared sending domain until a campaign domain is verified.
      from: "Lanky Campaign <onboarding@resend.dev>",
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("[notifyCampaign] email send failed:", err);
  }
}
