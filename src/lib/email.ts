import { Resend } from "resend";

const FROM = "Lanky Campaign <onboarding@resend.dev>";

function resend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

/**
 * Sends a hierarchy-scoped broadcast message to one leader. Returns whether
 * it actually sent — callers use this to report an accurate emailed/total
 * count rather than assuming success.
 */
export async function notifyLeader({
  to,
  name,
  subject,
  body,
}: {
  to: string;
  name: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const client = resend();
  if (!client) return false;

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to,
      subject,
      text: `Dear ${name},\n\n${body}\n\n— The Lanky Campaign Team`,
    });
    return !error;
  } catch (err) {
    console.error("[notifyLeader] email send failed:", err);
    return false;
  }
}

/**
 * Best-effort notification email to the campaign team via Resend.
 * Never throws — a failed email must not fail the form submission.
 * Configure RESEND_API_KEY and NOTIFY_EMAIL to enable; otherwise it no-ops.
 */
export async function notifyCampaign(subject: string, text: string): Promise<void> {
  const client = resend();
  const to = process.env.NOTIFY_EMAIL;
  if (!client || !to) return;

  try {
    await client.emails.send({ from: FROM, to, subject, text });
  } catch (err) {
    console.error("[notifyCampaign] email send failed:", err);
  }
}

/**
 * Best-effort receipt email sent to the donor after a successful payment.
 * Critical for bank-transfer donors who never return to the callback page.
 */
export async function sendDonorReceipt({
  name,
  email,
  amount,
  txRef,
}: {
  name: string;
  email: string;
  amount: number;
  txRef: string;
}): Promise<void> {
  const client = resend();
  if (!client) return;

  const naira = `₦${amount.toLocaleString("en-NG")}`;
  const date = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    await client.emails.send({
      from: FROM,
      to: email,
      subject: `Your donation to the Lanky Campaign — ${naira} confirmed`,
      text: [
        `Dear ${name},`,
        "",
        `Thank you for donating ${naira} to the Lanky for Federal House of Representatives Campaign. Your support is making a real difference.`,
        "",
        "Every naira you contribute goes directly towards ward consultations, town halls, and the community programs that will transform the Ibadan Southwest/Northwest constituency.",
        "",
        "Donation details:",
        `  Amount:    ${naira}`,
        `  Reference: ${txRef}`,
        `  Date:      ${date}`,
        "",
        "If you have any questions, visit votelanky.com/contact.",
        "",
        "Together, we are building a better constituency.",
        "",
        "— The Lanky Campaign Team",
        "votelanky.com",
      ].join("\n"),
    });
  } catch (err) {
    console.error("[sendDonorReceipt] email send failed:", err);
  }
}
