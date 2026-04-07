/**
 * Comprehensive validation report for the seeded checkyourwater.org database.
 *
 * Run: npm run data:validate
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { LAUNCH_CITIES } from "../src/lib/constants";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = sb.from(table).select("*", { head: true, count: "exact" });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  console.log("=== checkyourwater.org validation report ===\n");

  console.log("ROW COUNTS");
  console.log(`  water_systems:       ${(await count("water_systems")).toLocaleString()}`);
  console.log(`  detections:          ${(await count("detections")).toLocaleString()}`);
  console.log(`  zip_to_water_system: ${(await count("zip_to_water_system")).toLocaleString()}`);
  console.log(`  chemicals:           ${(await count("chemicals")).toLocaleString()}`);
  console.log(`  cities:              ${(await count("cities")).toLocaleString()}`);

  console.log("\nGRADE DISTRIBUTION");
  for (const g of ["A", "B", "C", "D", "F"] as const) {
    const c = await count("water_systems", (q) => q.eq("grade", g));
    console.log(`  ${g}: ${c.toLocaleString()}`);
  }

  console.log("\nTOP 20 WORST-GRADED SYSTEMS");
  const { data: worst } = await sb
    .from("water_systems")
    .select("pwsid,pws_name,state_code,grade,worst_compound,worst_ratio")
    .not("worst_ratio", "is", null)
    .order("worst_ratio", { ascending: false })
    .limit(20);
  console.log(
    "  Rank | PWSID     | State | Grade | Worst    | Ratio    | Name"
  );
  worst?.forEach((w, i) =>
    console.log(
      `  ${(i + 1).toString().padStart(4)} | ${w.pwsid} | ${w.state_code.padEnd(5)} | ${(w.grade ?? "?").padEnd(5)} | ${(w.worst_compound ?? "-").padEnd(8)} | ${(w.worst_ratio ?? 0).toString().padEnd(8)} | ${w.pws_name}`
    )
  );

  console.log("\nCHEMICAL COVERAGE");
  const chemsWithCid = await count("chemicals", (q) => q.not("pubchem_cid", "is", null));
  const totalChems = await count("chemicals");
  console.log(`  ${chemsWithCid}/${totalChems} compounds have a PubChem CID`);

  console.log("\nLAUNCH CITIES");
  console.log(
    "  City                 | PWSID     | Grade | Worst    | Ratio    | Detects | Excd"
  );
  for (const city of LAUNCH_CITIES) {
    const { data } = await sb
      .from("cities")
      .select("primary_pwsid,grade,worst_compound,worst_ratio,total_detections,total_exceedances")
      .eq("slug", city.slug)
      .single();
    if (!data) {
      console.log(`  ${city.slug.padEnd(20)} | (missing)`);
      continue;
    }
    console.log(
      `  ${city.city.padEnd(20)} | ${data.primary_pwsid?.padEnd(9) ?? "-"} | ${(data.grade ?? "?").padEnd(5)} | ${(data.worst_compound ?? "-").padEnd(8)} | ${(data.worst_ratio ?? "-").toString().padEnd(8)} | ${data.total_detections ?? "-".toString().padStart(7)} | ${data.total_exceedances ?? "-"}`
    );
  }

  console.log("\nINTEGRITY CHECKS");

  // Orphan detections: pwsid not in water_systems
  const { data: pwsRows } = await sb.from("water_systems").select("pwsid");
  const allPwsids = new Set((pwsRows ?? []).map((r) => r.pwsid));
  console.log(`  water_systems known PWSIDs: ${allPwsids.size.toLocaleString()}`);
  // Sampling 1000 detections
  const { data: sampleDet } = await sb
    .from("detections")
    .select("pwsid")
    .limit(2000);
  const orphanDet = (sampleDet ?? []).filter((d) => !allPwsids.has(d.pwsid));
  console.log(
    `  detections sample orphans: ${orphanDet.length}/${sampleDet?.length ?? 0}`
  );

  // Orphan zip mappings
  const { data: sampleZip } = await sb
    .from("zip_to_water_system")
    .select("pwsid")
    .limit(2000);
  const orphanZip = (sampleZip ?? []).filter((z) => !allPwsids.has(z.pwsid));
  console.log(
    `  zip mapping sample orphans: ${orphanZip.length}/${sampleZip?.length ?? 0}`
  );

  // Systems with no detections (expected: these are grade A)
  const noDetSystems = await count("water_systems", (q) =>
    q.eq("total_pfas_detected", 0)
  );
  console.log(`  water_systems with no PFAS detected (grade A expected): ${noDetSystems.toLocaleString()}`);

  console.log("\n=== Validation complete ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
