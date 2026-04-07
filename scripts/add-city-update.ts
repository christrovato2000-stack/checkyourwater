/**
 * CLI: insert a single row into city_updates.
 *
 * Usage:
 *   npx tsx scripts/add-city-update.ts \
 *     --city parkersburg-wv \
 *     --date 2026-03-15 \
 *     --title "WV legislature considers PFAS monitoring bill" \
 *     --description "A bill requiring quarterly PFAS reporting by water utilities serving over 10,000 residents advanced through the state Senate." \
 *     --source-url "https://example.com/article" \
 *     --source-name "Mountain State Spotlight" \
 *     --category government-action
 *
 * Categories: government-action, utility-response, legal, community-action, media-coverage
 */
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

type Category =
  | "government-action"
  | "utility-response"
  | "legal"
  | "community-action"
  | "media-coverage";

const VALID_CATEGORIES: Category[] = [
  "government-action",
  "utility-response",
  "legal",
  "community-action",
  "media-coverage",
];

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = "true";
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function required(args: Record<string, string>, key: string): string {
  const v = args[key];
  if (!v) {
    console.error(`Missing required --${key}`);
    process.exit(1);
  }
  return v;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const city_slug = required(args, "city");
  const update_date = required(args, "date");
  const title = required(args, "title");
  const description = required(args, "description");
  const category = required(args, "category") as Category;

  if (!VALID_CATEGORIES.includes(category)) {
    console.error(
      `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`
    );
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(update_date)) {
    console.error(`Invalid date "${update_date}". Use YYYY-MM-DD.`);
    process.exit(1);
  }

  const source_url = args["source-url"] || null;
  const source_name = args["source-name"] || null;

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb
    .from("city_updates")
    .insert({
      city_slug,
      update_date,
      title,
      description,
      source_url,
      source_name,
      category,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted city_update ${data.id} for ${city_slug} (${update_date})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
