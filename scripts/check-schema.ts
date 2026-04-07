/**
 * Probe Supabase to verify the schema is in place.
 * Run: npx tsx scripts/check-schema.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const TABLES = [
  "water_systems",
  "detections",
  "zip_to_water_system",
  "chemicals",
  "content",
  "cities",
];

async function main() {
  let allOk = true;
  for (const t of TABLES) {
    const { count, error } = await sb
      .from(t)
      .select("*", { head: true, count: "exact" });
    if (error) {
      console.log(`  ${t}: MISSING (${error.message})`);
      allOk = false;
    } else {
      console.log(`  ${t}: OK (${count ?? 0} rows)`);
    }
  }
  if (!allOk) {
    console.error("\nApply scripts/schema.sql in the Supabase SQL editor first.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
