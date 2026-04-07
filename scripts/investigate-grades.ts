/**
 * Diagnostic: investigate why several known PFAS-contaminated cities are
 * showing A grades. For each city we report:
 *   - the city row as stored (grade, primary_pwsid, totals)
 *   - the primary_pwsid system row + any detections
 *   - alternative water_systems matching by city_served name in the state
 *   - water_systems reachable from the city's known zips via zip_to_water_system
 *   - any system in the state whose name mentions the city
 *
 * Read-only. No writes.
 *
 * Run: npx tsx scripts/investigate-grades.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(url, key, { auth: { persistSession: false } });

interface Target {
  slug: string;
  knownZips: string[];
  nameTokens: string[]; // case-insensitive substrings to search pws_name
}

const TARGETS: Target[] = [
  { slug: "merrimack-nh", knownZips: ["03054"], nameTokens: ["merrimack"] },
  { slug: "hoosick-falls-ny", knownZips: ["12090"], nameTokens: ["hoosick"] },
  { slug: "bennington-vt", knownZips: ["05201"], nameTokens: ["bennington"] },
  { slug: "newburgh-ny", knownZips: ["12550", "12551"], nameTokens: ["newburgh"] },
  { slug: "marinette-wi", knownZips: ["54143"], nameTokens: ["marinette"] },
  { slug: "peshtigo-wi", knownZips: ["54157"], nameTokens: ["peshtigo"] },
  { slug: "oscoda-mi", knownZips: ["48750"], nameTokens: ["oscoda", "au sable", "ausable"] },
];

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  return String(v);
}

async function loadDetections(pwsid: string) {
  const { data } = await sb
    .from("detections")
    .select(
      "compound_abbrev, avg_concentration, max_concentration, mcl, mcl_ratio, has_mcl, detection_count, sample_count"
    )
    .eq("pwsid", pwsid)
    .order("mcl_ratio", { ascending: false, nullsFirst: false });
  return data ?? [];
}

async function loadSystem(pwsid: string) {
  const { data } = await sb
    .from("water_systems")
    .select(
      "pwsid, pws_name, city_served, state_code, population_served, source_type, grade, worst_compound, worst_ratio, total_pfas_detected"
    )
    .eq("pwsid", pwsid)
    .maybeSingle();
  return data;
}

async function investigate(t: Target) {
  console.log("\n" + "=".repeat(80));
  console.log(`CITY: ${t.slug}`);
  console.log("=".repeat(80));

  // 1. City row
  const { data: cityRow } = await sb
    .from("cities")
    .select(
      "slug, city_name, state_code, state_name, population, primary_pwsid, grade, worst_compound, worst_ratio, total_detections, total_exceedances, contamination_source, settlement_status, launch_wave"
    )
    .eq("slug", t.slug)
    .maybeSingle();

  if (!cityRow) {
    console.log(`  !!! no row in cities table for slug ${t.slug}`);
    return;
  }

  console.log(`  city_name        : ${cityRow.city_name}, ${cityRow.state_code}`);
  console.log(`  population       : ${fmt(cityRow.population)}`);
  console.log(`  primary_pwsid    : ${fmt(cityRow.primary_pwsid)}`);
  console.log(`  grade            : ${fmt(cityRow.grade)}`);
  console.log(`  worst_compound   : ${fmt(cityRow.worst_compound)}`);
  console.log(`  worst_ratio      : ${fmt(cityRow.worst_ratio)}`);
  console.log(`  total_detections : ${fmt(cityRow.total_detections)}`);
  console.log(`  total_exceedances: ${fmt(cityRow.total_exceedances)}`);
  console.log(`  contamination    : ${fmt(cityRow.contamination_source)}`);
  console.log(`  settlement       : ${fmt(cityRow.settlement_status)}`);

  // 2. Primary PWSID system row + detections
  if (cityRow.primary_pwsid) {
    console.log(`\n  --- primary_pwsid lookup: ${cityRow.primary_pwsid} ---`);
    const sys = await loadSystem(cityRow.primary_pwsid as string);
    if (!sys) {
      console.log(`    !!! NOT FOUND in water_systems`);
    } else {
      console.log(
        `    ${sys.pwsid}  ${sys.pws_name}  pop=${fmt(sys.population_served)}  grade=${fmt(sys.grade)}  total_pfas_detected=${fmt(sys.total_pfas_detected)}  worst=${fmt(sys.worst_compound)}@${fmt(sys.worst_ratio)}x`
      );
      const dets = await loadDetections(sys.pwsid as string);
      console.log(`    detections rows: ${dets.length}`);
      for (const d of dets.slice(0, 12)) {
        console.log(
          `      ${String(d.compound_abbrev).padEnd(14)}  avg=${fmt(d.avg_concentration)}  max=${fmt(d.max_concentration)}  MCL=${fmt(d.mcl)}  ratio=${fmt(d.mcl_ratio)}  det=${fmt(d.detection_count)}/${fmt(d.sample_count)}`
        );
      }
    }
  }

  // 3. Alt water_systems matching city_served
  console.log(`\n  --- water_systems where city_served ilike "${cityRow.city_name}" in ${cityRow.state_code} ---`);
  const { data: byCity } = await sb
    .from("water_systems")
    .select(
      "pwsid, pws_name, city_served, population_served, grade, total_pfas_detected, worst_compound, worst_ratio"
    )
    .eq("state_code", cityRow.state_code)
    .ilike("city_served", `%${cityRow.city_name}%`);
  if (!byCity || byCity.length === 0) {
    console.log(`    (none)`);
  } else {
    for (const s of byCity) {
      console.log(
        `    ${s.pwsid}  ${s.pws_name}  city=${s.city_served}  pop=${fmt(s.population_served)}  grade=${fmt(s.grade)}  det=${fmt(s.total_pfas_detected)}  worst=${fmt(s.worst_compound)}@${fmt(s.worst_ratio)}x`
      );
    }
  }

  // 4. Alt water_systems whose pws_name contains a token
  for (const tok of t.nameTokens) {
    console.log(`\n  --- water_systems where pws_name ilike "%${tok}%" in ${cityRow.state_code} ---`);
    const { data: byName } = await sb
      .from("water_systems")
      .select(
        "pwsid, pws_name, city_served, population_served, grade, total_pfas_detected, worst_compound, worst_ratio"
      )
      .eq("state_code", cityRow.state_code)
      .ilike("pws_name", `%${tok}%`);
    if (!byName || byName.length === 0) {
      console.log(`    (none)`);
    } else {
      for (const s of byName) {
        console.log(
          `    ${s.pwsid}  ${s.pws_name}  city=${s.city_served}  pop=${fmt(s.population_served)}  grade=${fmt(s.grade)}  det=${fmt(s.total_pfas_detected)}  worst=${fmt(s.worst_compound)}@${fmt(s.worst_ratio)}x`
        );
      }
    }
  }

  // 5. zip_to_water_system mappings for the known zips
  for (const zip of t.knownZips) {
    console.log(`\n  --- zip_to_water_system for zip ${zip} ---`);
    const { data: zipRows } = await sb
      .from("zip_to_water_system")
      .select("pwsid, is_primary, population_served, mapping_tier, confidence")
      .eq("zip_code", zip)
      .order("is_primary", { ascending: false });
    if (!zipRows || zipRows.length === 0) {
      console.log(`    (no mappings)`);
      continue;
    }
    for (const z of zipRows) {
      const sys = await loadSystem(z.pwsid as string);
      const det = sys ? await loadDetections(sys.pwsid as string) : [];
      const detCount = det.length;
      const exceedCount = det.filter((d) => (d.mcl_ratio ?? 0) >= 1).length;
      console.log(
        `    ${z.pwsid}  primary=${z.is_primary}  tier=${z.mapping_tier}  ${
          sys ? `${sys.pws_name} grade=${fmt(sys.grade)} det_rows=${detCount} exc=${exceedCount}` : "NOT in water_systems"
        }`
      );
    }
  }
}

async function main() {
  for (const t of TARGETS) {
    await investigate(t);
  }
  console.log("\n" + "=".repeat(80));
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
