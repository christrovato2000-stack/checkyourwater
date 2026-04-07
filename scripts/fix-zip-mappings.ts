/**
 * Manual fix-ups for known launch-city zip mapping issues:
 *
 *   1. Newburgh NY: zip 12551 has no PWSIDs in UCMR 5 (PO-box-only zip).
 *      Copy mappings from 12550.
 *   2. Stuart FL: zip 34995 has no PWSIDs in UCMR 5 (PO-box-only zip).
 *      Copy mappings from 34994.
 *   3. Calhoun GA: zip 30703 erroneously maps to MS0440003 (Columbus
 *      Light & Water in Mississippi). Delete that row, then copy the
 *      correct Calhoun mappings from zip 30701.
 *
 * Idempotent. Re-run safely.
 *
 * Run: npx tsx scripts/fix-zip-mappings.ts
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

interface Copy {
  from_zip: string;
  to_zip: string;
  reason: string;
}

const COPIES: Copy[] = [
  {
    from_zip: "12550",
    to_zip: "12551",
    reason: "Newburgh NY 12551 is a PO-box-only zip; same systems as 12550",
  },
  {
    from_zip: "34994",
    to_zip: "34995",
    reason: "Stuart FL 34995 is a PO-box-only zip; same systems as 34994",
  },
  {
    from_zip: "30701",
    to_zip: "30703",
    reason: "Calhoun GA 30703 should map to Calhoun systems, not Mississippi",
  },
];

async function main() {
  // 1. Delete the bad Mississippi mapping for Calhoun GA's 30703 zip.
  console.log("Deleting bad mapping: 30703 -> MS0440003 (Mississippi)");
  const { error: delErr, count: delCount } = await sb
    .from("zip_to_water_system")
    .delete({ count: "exact" })
    .eq("zip_code", "30703")
    .eq("pwsid", "MS0440003");
  if (delErr) {
    console.error(`  delete failed: ${delErr.message}`);
  } else {
    console.log(`  deleted ${delCount ?? 0} row(s)`);
  }

  // 2. Copy mappings from source zip -> target zip for each fix.
  for (const c of COPIES) {
    console.log(`\nCopying ${c.from_zip} -> ${c.to_zip} (${c.reason})`);

    const { data: source, error: srcErr } = await sb
      .from("zip_to_water_system")
      .select("*")
      .eq("zip_code", c.from_zip);
    if (srcErr) {
      console.error(`  read source failed: ${srcErr.message}`);
      continue;
    }
    if (!source?.length) {
      console.error(`  source zip ${c.from_zip} has no mappings, skipping`);
      continue;
    }

    const newRows = source.map((s) => ({
      zip_code: c.to_zip,
      pwsid: s.pwsid,
      pws_name: s.pws_name,
      population_served: s.population_served,
      source_type: s.source_type,
      mapping_tier: 2, // manually copied; lower than the Tier-1 source
      confidence: "medium",
      is_primary: s.is_primary,
      manually_verified: true,
    }));

    const { error: upErr } = await sb
      .from("zip_to_water_system")
      .upsert(newRows, { onConflict: "zip_code,pwsid" });
    if (upErr) {
      console.error(`  upsert failed: ${upErr.message}`);
    } else {
      console.log(
        `  upserted ${newRows.length} row(s): ${newRows.map((r) => r.pwsid).join(", ")}`
      );
    }
  }

  // 3. Verify the result for each fixed zip.
  console.log("\n=== Verification ===");
  for (const z of ["12551", "34995", "30703"]) {
    const { data } = await sb
      .from("zip_to_water_system")
      .select("pwsid")
      .eq("zip_code", z);
    console.log(
      `  ${z}: ${(data ?? []).map((r) => r.pwsid).join(", ") || "(none)"}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
