/**
 * One-off: correct the Newburgh, NY city row.
 *
 * The cities.grade was set to A based on primary_pwsid (NY3503549, City of
 * Newburgh, which now tests clean after switching sources and installing
 * GAC treatment). But NY3503578 (Town of Newburgh Consolidated Water
 * District) serves the same zips and tests above the federal PFOA limit
 * at ~1.08x MCL, which should make the city-level grade D.
 *
 * primary_pwsid is left as NY3503549 because the page renders both systems
 * already via city_served name match. Only the headline grade needs fixing.
 *
 * Run: npx tsx scripts/fix-newburgh-grade.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: before, error: readErr } = await sb
    .from("cities")
    .select("slug, grade, worst_compound, worst_ratio, total_detections, total_exceedances")
    .eq("slug", "newburgh-ny")
    .maybeSingle();
  if (readErr) throw readErr;
  if (!before) {
    console.error("newburgh-ny not found in cities");
    process.exit(1);
  }
  console.log("before:", before);

  const { error: upErr } = await sb
    .from("cities")
    .update({
      grade: "D",
      worst_compound: "PFOA",
      worst_ratio: 1.0833,
    })
    .eq("slug", "newburgh-ny");
  if (upErr) throw upErr;

  const { data: after } = await sb
    .from("cities")
    .select("slug, grade, worst_compound, worst_ratio, total_detections, total_exceedances")
    .eq("slug", "newburgh-ny")
    .maybeSingle();
  console.log("after :", after);
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
