/**
 * One-off: replace em dashes in the `content` table (city summaries,
 * chemical explainers, action items) with simpler punctuation. The site
 * is a journalism tool and em dashes read as AI-generated.
 *
 * Strategy: collapse `\s*—\s*` to `, ` (a comma and a space). This works
 * for parenthetical clauses, dash-list separators, and mid-sentence breaks.
 * Re-runs are no-ops once em dashes are gone.
 *
 * Run: npx tsx scripts/dedash-content.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Supabase env vars missing");

const sb = createClient(url, key, { auth: { persistSession: false } });

function dedash(s: string | null): string | null {
  if (s === null || s === undefined) return s;
  if (!s.includes("\u2014")) return s;
  // Replace " — " or "—" anywhere with ", " then tidy.
  let out = s.replace(/\s*\u2014\s*/g, ", ");
  // Collapse accidental ",, " sequences and ", ." artifacts.
  out = out.replace(/, ,/g, ",").replace(/, \./g, ".");
  return out;
}

async function main() {
  const { data, error } = await sb
    .from("content")
    .select("id, content_type, reference_key, title, body");
  if (error) throw error;
  if (!data) {
    console.log("no rows");
    return;
  }
  console.log(`scanning ${data.length} content rows`);

  let touched = 0;
  for (const row of data) {
    const oldTitle = (row.title as string | null) ?? null;
    const oldBody = (row.body as string | null) ?? null;
    const newTitle = dedash(oldTitle);
    const newBody = dedash(oldBody);
    if (newTitle === oldTitle && newBody === oldBody) continue;

    const update: Record<string, string | null> = {};
    if (newTitle !== oldTitle) update.title = newTitle;
    if (newBody !== oldBody) update.body = newBody;

    const { error: upErr } = await sb
      .from("content")
      .update(update)
      .eq("id", row.id);
    if (upErr) {
      console.error(`  [${row.content_type}/${row.reference_key}] FAILED: ${upErr.message}`);
      continue;
    }
    touched++;
    console.log(`  [${row.content_type}/${row.reference_key}] updated`);
  }
  console.log(`done. updated ${touched} of ${data.length} rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
