/**
 * Mission 12: apply the news_items and email_subscribers tables + RLS
 * to Supabase.
 *
 * Supabase's PostgREST does not expose a generic SQL endpoint, so this
 * script cannot run DDL itself. It probes for the tables and, if either
 * is missing, prints the exact SQL you need to paste into the Supabase
 * SQL editor at https://supabase.com/dashboard/project/_/sql.
 *
 * Run: npx tsx scripts/apply-news-schema.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function probe(table: string): Promise<boolean> {
  const { error } = await sb.from(table).select("*").limit(1);
  if (!error) return true;
  console.error(`  ${table}: ${error.message}`);
  return false;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Supabase credentials missing from .env.local");
  }

  console.log("Probing news_items and email_subscribers...");
  const okNews = await probe("news_items");
  const okSubs = await probe("email_subscribers");

  if (okNews && okSubs) {
    console.log("\nBoth tables exist. Nothing to do.");
    return;
  }

  const sqlPath = path.join(__dirname, "mission-12-migration.sql");
  const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf8") : "";

  console.error(
    "\nOne or both tables are missing. Paste the following SQL into the\n" +
      "Supabase SQL editor:\n" +
      "  https://supabase.com/dashboard/project/_/sql\n\n" +
      "---- begin mission-12-migration.sql ----\n" +
      sql +
      "\n---- end mission-12-migration.sql ----\n"
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
