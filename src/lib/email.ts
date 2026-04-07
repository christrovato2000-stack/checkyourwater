/**
 * Email sending helper for CheckYourWater notifications.
 *
 * Uses the `resend` npm package. If RESEND_API_KEY is not set,
 * sendEmail() logs what would have been sent and returns success.
 * This keeps the signup/confirmation flow working in local dev
 * without requiring a key.
 *
 * TODO: Verify the checkyourwater.org sending domain in the Resend
 * dashboard and set RESEND_FROM_EMAIL to
 * "CheckYourWater <notifications@checkyourwater.org>" in production.
 * Until then, we fall back to Resend's shared sending domain.
 */
import { Resend } from "resend";

export const NOTIFY_FROM =
  process.env.RESEND_FROM_EMAIL ?? "CheckYourWater <onboarding@resend.dev>";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkyourwater.org";

interface SendArgs {
  to: string;
  subject: string;
  text: string;
}

let client: Resend | null = null;
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendArgs): Promise<{ ok: true } | { ok: false; message: string }> {
  const resend = getClient();

  if (!resend) {
    // Stub for local dev when RESEND_API_KEY is not configured.
    console.log("[email stub] to:", to);
    console.log("[email stub] subject:", subject);
    console.log("[email stub] body:\n", text);
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: [to],
      subject,
      text,
    });
    if (error) {
      console.error("[email] resend error", error);
      return { ok: false, message: error.message ?? "resend error" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] network error", e);
    return { ok: false, message: "network error" };
  }
}

export function confirmEmailBody(confirmUrl: string): string {
  return [
    "Thanks for signing up for CheckYourWater notifications.",
    "",
    "Click the link below to confirm your subscription. We will only email",
    "you when new EPA PFAS data is released or we publish a new city",
    "investigation. No newsletters, no marketing.",
    "",
    confirmUrl,
    "",
    "If you did not sign up, you can ignore this email.",
    "",
    "- CheckYourWater",
  ].join("\n");
}

export function notificationFooter(unsubscribeUrl: string): string {
  return [
    "",
    "---",
    "You are receiving this because you signed up for CheckYourWater",
    "notifications at checkyourwater.org. We only email when new EPA data",
    "is released or we publish a new investigation.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
}
