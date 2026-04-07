/**
 * Pull real PFAS data for the 6 city-investigation articles.
 *
 * Writes one JSON file per city under scripts/blog-data/.
 * The article-generation script (generate-blog-articles.ts) reads these
 * and feeds the real numbers into the Claude prompt so nothing is hallucinated.
 *
 * Run: npx tsx scripts/pull-blog-city-data.ts
 */
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Supabase env vars missing");

const sb = createClient(url, key, { auth: { persistSession: false } });

const CITY_SLUGS = [
  "parkersburg-wv",
  "calhoun-ga",
  "security-widefield-co",
  "parchment-mi",
  "merrimack-nh",
  "newburgh-ny",
];

interface CityRow {
  slug: string;
  city_name: string;
  state_code: string;
  state_name: string;
  population: number | null;
  primary_pwsid: string | null;
  grade: string | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_detections: number | null;
  total_exceedances: number | null;
  contamination_source: string | null;
  settlement_status: string | null;
  news_hook: string | null;
}

interface SystemRow {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string;
  population_served: number | null;
  source_type: string | null;
  grade: string | null;
}

interface DetectionRow {
  pwsid: string;
  compound_abbrev: string;
  compound_name: string;
  avg_concentration: number | null;
  max_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
  sample_count: number | null;
  detection_count: number | null;
}

interface ChemicalRow {
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  mcl_ppt: number | null;
  health_effects: string | null;
  common_sources: string | null;
}

async function pullForCity(slug: string) {
  const { data: cityRows, error: cityErr } = await sb
    .from("cities")
    .select("*")
    .eq("slug", slug);
  if (cityErr) throw cityErr;
  if (!cityRows || cityRows.length === 0) {
    console.log(`  ${slug}: NOT FOUND`);
    return null;
  }
  const city = cityRows[0] as unknown as CityRow;

  const orParts: string[] = [];
  orParts.push(`city_served.ilike.${city.city_name}`);
  if (city.primary_pwsid) orParts.push(`pwsid.eq.${city.primary_pwsid}`);
  const { data: sysRows } = await sb
    .from("water_systems")
    .select("pwsid, pws_name, city_served, state_code, population_served, source_type, grade")
    .eq("state_code", city.state_code)
    .or(orParts.join(","));

  let systems = (sysRows ?? []) as unknown as SystemRow[];
  if (city.primary_pwsid && !systems.find((s) => s.pwsid === city.primary_pwsid)) {
    const { data: extra } = await sb
      .from("water_systems")
      .select("pwsid, pws_name, city_served, state_code, population_served, source_type, grade")
      .eq("pwsid", city.primary_pwsid)
      .maybeSingle();
    if (extra) systems.push(extra as unknown as SystemRow);
  }

  const allDetections: DetectionRow[] = [];
  for (const s of systems) {
    const { data: dets } = await sb
      .from("detections")
      .select("pwsid, compound_abbrev, compound_name, avg_concentration, max_concentration, mcl, mcl_ratio, has_mcl, sample_count, detection_count")
      .eq("pwsid", s.pwsid);
    for (const d of dets ?? []) allDetections.push(d as unknown as DetectionRow);
  }

  const abbrevs = Array.from(new Set(allDetections.map((d) => d.compound_abbrev)));
  let chemicals: ChemicalRow[] = [];
  if (abbrevs.length > 0) {
    const { data: chems } = await sb
      .from("chemicals")
      .select("compound_abbrev, compound_name, cas_number, mcl_ppt, health_effects, common_sources")
      .in("compound_abbrev", abbrevs);
    chemicals = (chems ?? []) as unknown as ChemicalRow[];
  }

  const totalPopulation = systems.reduce((acc, s) => acc + (s.population_served ?? 0), 0);

  return {
    city,
    systems,
    detections: allDetections,
    chemicals,
    totals: {
      systems: systems.length,
      population_served: totalPopulation || city.population || null,
      detections: allDetections.length,
      exceedances: allDetections.filter((d) => (d.mcl_ratio ?? 0) >= 1).length,
    },
  };
}

async function main() {
  const outDir = path.join(__dirname, "blog-data");
  fs.mkdirSync(outDir, { recursive: true });

  for (const slug of CITY_SLUGS) {
    console.log(`Pulling ${slug}...`);
    const payload = await pullForCity(slug);
    if (!payload) continue;
    const outPath = path.join(outDir, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(
      `  ${slug}: ${payload.systems.length} systems, ${payload.detections.length} detections, ${payload.totals.exceedances} exceedances`
    );
  }

  // Also dump the chemicals table once for the explainer prompts.
  const { data: allChems } = await sb
    .from("chemicals")
    .select("compound_abbrev, compound_name, cas_number, mcl_ppt, mcl_status, mrl_ppt, chain_length, health_effects, common_sources");
  fs.writeFileSync(
    path.join(outDir, "_chemicals.json"),
    JSON.stringify(allChems ?? [], null, 2)
  );
  console.log(`Wrote ${(allChems ?? []).length} chemicals to _chemicals.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
