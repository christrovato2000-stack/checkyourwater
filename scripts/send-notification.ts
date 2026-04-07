/**
 * Manually send a notification to confirmed CheckYourWater subscribers.
 *
 * Usage:
 *   npx tsx scripts/send-notification.ts \
 *     --subject "New EPA PFAS data released" \
 *     --body ./notifications/epa-ucmr5-update.txt \
 *     [--state NH] [--zip-prefix 030]
 *
 * Flags:
 *   --subject     Required. The email subject line.
 *   --body        Required. Path to a plain-text file for the body.
 *   --state       Optional. Only send to subscribers whose zip_code
 *                 starts with a prefix known to be in this state.
 *                 (Simpler filter: use --zip-prefix instead.)
 *   --zip-prefix  Optional. Only send to subscribers whose zip_code
 *                 starts with this string (e.g. "030" for southern NH).
 *   --dry-run     Don't send. Print who would be emailed.
 *
 * Every email includes an unsubscribe link in the footer.
 *
 * This script is manual on purpose. It should only run when you have
 * something real to say, like new EPA data or a new investigation.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://checkyourwater.org";
const FROM =
  process.env.RESEND_FROM_EMAIL ?? "CheckYourWater <onboarding@resend.dev>";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface Args {
  subject?: string;
  body?: string;
  state?: string;
  zipPrefix?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--subject") out.subject = argv[++i];
    else if (a === "--body") out.body = argv[++i];
    else if (a === "--state") out.state = argv[++i];
    else if (a === "--zip-prefix") out.zipPrefix = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function buildBody(baseBody: string, unsubscribeToken: string): string {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;
  return [
    baseBody.trim(),
    "",
    "---",
    "You are receiving this because you signed up for CheckYourWater",
    "notifications. We only email when new EPA data is released or we",
    "publish a new investigation.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
}

async function sendOne(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[stub] would send to ${to}: ${subject}`);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error(`  ${to}: resend ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.subject || !args.body) {
    console.error(
      "usage: npx tsx scripts/send-notification.ts --subject <subject> --body <path> [--state XX] [--zip-prefix 030] [--dry-run]"
    );
    process.exit(1);
  }
  const bodyPath = path.resolve(args.body);
  if (!fs.existsSync(bodyPath)) {
    console.error(`Body file not found: ${bodyPath}`);
    process.exit(1);
  }
  const baseBody = fs.readFileSync(bodyPath, "utf8");

  let query = sb
    .from("email_subscribers")
    .select("email, zip_code, unsubscribe_token")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);

  if (args.zipPrefix) {
    query = query.like("zip_code", `${args.zipPrefix}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("query error:", error.message);
    process.exit(1);
  }

  let recipients = data ?? [];

  // --state is a soft filter: require a zip_code if --state is passed.
  // We do not do zip-to-state mapping here (that lives in the zip
  // lookup tables); use --zip-prefix for precise targeting.
  if (args.state) {
    recipients = recipients.filter((r) => r.zip_code);
    console.warn(
      `Note: --state ${args.state} only keeps subscribers who provided a zip. Use --zip-prefix for precise targeting.`
    );
  }

  console.log(
    `\nReady to send: subject="${args.subject}" to ${recipients.length} recipients` +
      (args.dryRun ? " [DRY RUN]" : "")
  );

  if (args.dryRun) {
    for (const r of recipients) {
      console.log(`  ${r.email}${r.zip_code ? ` (${r.zip_code})` : ""}`);
    }
    return;
  }

  let sent = 0;
  for (const r of recipients) {
    const text = buildBody(baseBody, r.unsubscribe_token);
    const ok = await sendOne(r.email, args.subject, text);
    if (ok) sent++;
    // Stay well under the Resend free-tier rate limit (2/sec).
    await new Promise((res) => setTimeout(res, 600));
  }

  console.log(`\nSent ${sent}/${recipients.length} notifications.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
