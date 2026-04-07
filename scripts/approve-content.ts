/**
 * Bulk-approve generated content after human review.
 *
 *   npm run content:approve -- --type=chemical_explainer
 *   npm run content:approve -- --type=city_summary
 *   npm run content:approve -- --all
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function parseArgs(): { type: string | null; all: boolean } {
  let type: string | null = null;
  let all = false;
  for (const a of process.argv.slice(2)) {
    if (a === "--all") all = true;
    else if (a.startsWith("--type=")) type = a.slice("--type=".length);
  }
  return { type, all };
}

async function approve(filter: { content_type?: string }) {
  let q = sb
    .from("content")
    .update({
      review_status: "approved",
      approved_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("review_status", "pending");
  if (filter.content_type) q = q.eq("content_type", filter.content_type);
  const { data, error } = await q.select("content_type, reference_key");
  if (error) throw error;
  return data ?? [];
}

async function main() {
  const { type, all } = parseArgs();
  if (!type && !all) {
    console.error("Usage: --type=chemical_explainer | --type=city_summary | --all");
    process.exit(1);
  }
  const updated = await approve(all ? {} : { content_type: type! });
  console.log(`Approved ${updated.length} content rows.`);
  for (const u of updated) {
    console.log(`  ${u.content_type} :: ${u.reference_key}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
