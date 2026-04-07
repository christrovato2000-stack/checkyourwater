/**
 * Seed Supabase from the parsed JSON files.
 *
 * Order (foreign key dependencies):
 *   1. chemicals
 *   2. water_systems
 *   3. detections
 *   4. zip_to_water_system
 *
 * Idempotent: uses upserts. Re-run safely.
 *
 * Run: npm run data:seed
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DATA_DIR = path.join(__dirname, "..", "data");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Supabase credentials missing from .env.local");
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const BATCH = 500;

async function upsertChunked(
  table: string,
  rows: any[],
  conflict: string
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb
      .from(table)
      .upsert(chunk, { onConflict: conflict });
    if (error) {
      console.error(
        `  ${table} upsert chunk ${i}-${i + chunk.length} failed:`,
        error.message
      );
      throw error;
    }
    if ((i / BATCH) % 10 === 0) {
      console.log(
        `    ${table}: ${(i + chunk.length).toLocaleString()}/${rows.length.toLocaleString()}`
      );
    }
  }
}

interface SdwisSystem {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string | null;
  county: string | null;
  population_served: number | null;
  source_type: string | null;
  pws_type: string | null;
  pws_active: boolean;
}

interface GradedSystem {
  pwsid: string;
  pws_name: string;
  grade: string;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number;
}

async function main() {
  // ---- 1. CHEMICALS ----
  console.log("Loading chemicals...");
  const chemicals = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "chemicals.json"), "utf-8")
  );
  await upsertChunked("chemicals", chemicals, "compound_abbrev");
  console.log(`  ${chemicals.length} chemicals upserted`);

  // ---- 2. WATER SYSTEMS ----
  console.log("Loading water systems...");
  const graded: GradedSystem[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "graded-systems.json"), "utf-8")
  );

  // Try to enrich with SDWIS metadata if available
  const sdwisPath = path.join(DATA_DIR, "sdwis-water-systems.json");
  let sdwisMap = new Map<string, SdwisSystem>();
  if (fs.existsSync(sdwisPath)) {
    const sdwis: SdwisSystem[] = JSON.parse(fs.readFileSync(sdwisPath, "utf-8"));
    for (const s of sdwis) sdwisMap.set(s.pwsid, s);
    console.log(`  loaded SDWIS metadata for ${sdwisMap.size.toLocaleString()} systems`);
  } else {
    console.log("  WARNING: no SDWIS metadata file (will seed without city/state/pop)");
  }

  // Pull state from PWSID prefix as a fallback (first 2 chars of standard SDWIS PWSID)
  const fallbackState = (pwsid: string) => {
    const prefix = pwsid.slice(0, 2);
    return /^[A-Z]{2}$/.test(prefix) ? prefix : null;
  };

  const systemsRows = graded.map((g) => {
    const sd = sdwisMap.get(g.pwsid);
    return {
      pwsid: g.pwsid,
      pws_name: sd?.pws_name || g.pws_name,
      city_served: sd?.city_served ?? null,
      state_code: sd?.state_code ?? fallbackState(g.pwsid) ?? "ZZ",
      county: sd?.county ?? null,
      population_served: sd?.population_served ?? null,
      source_type: sd?.source_type ?? null,
      latitude: null,
      longitude: null,
      grade: g.grade,
      worst_compound: g.worst_compound,
      worst_ratio: g.worst_ratio,
      total_pfas_detected: g.total_pfas_detected,
      data_release: 2026,
    };
  });

  await upsertChunked("water_systems", systemsRows, "pwsid");
  console.log(`  ${systemsRows.length.toLocaleString()} water systems upserted`);

  // Update PostGIS geom column for any rows that have lat/lng
  // (Done separately because supabase-js can't pass ST_MakePoint via upsert.)
  const withCoords = systemsRows.filter(
    (r) => r.latitude !== null && r.longitude !== null
  );
  if (withCoords.length) {
    console.log(`  setting geom for ${withCoords.length} systems`);
    // Run via RPC if available; skipped here.
  }

  // ---- 3. DETECTIONS ----
  console.log("Loading detections...");
  const aggs: any[] = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "aggregated-detections.json"), "utf-8")
  );

  // Only seed system-compound pairs that actually have a real PWSID in
  // water_systems (above), since they all do (both come from UCMR 5).
  const detectionRows = aggs.map((a) => ({
    pwsid: a.pwsid,
    compound_name: a.compound_name,
    compound_abbrev: a.compound_abbrev,
    cas_number: a.cas_number,
    avg_concentration: a.avg_concentration,
    max_concentration: a.max_concentration,
    min_concentration: a.min_concentration,
    sample_count: a.sample_count,
    detection_count: a.detection_count,
    mrl: a.mrl,
    mcl: a.mcl,
    mcl_ratio: a.mcl_ratio,
    has_mcl: a.has_mcl,
  }));

  await upsertChunked("detections", detectionRows, "pwsid,compound_abbrev");
  console.log(`  ${detectionRows.length.toLocaleString()} detections upserted`);

  // ---- 4. ZIP CROSSWALK ----
  console.log("Loading zip crosswalk...");
  const zipRows: any[] = [];

  // Use UCMR 5's own ZIP file as a Tier-1 source (it's the cleanest mapping
  // for systems we actually have data for).
  const ucmrZipPath = path.join(DATA_DIR, "UCMR5_ZIPCodes.txt");
  if (fs.existsSync(ucmrZipPath)) {
    const lines = fs.readFileSync(ucmrZipPath, "utf-8").split(/\r?\n/);
    for (let i = 1; i < lines.length; i++) {
      const [pwsid, zip] = lines[i].split("\t");
      if (!pwsid || !zip) continue;
      if (!/^\d{5}$/.test(zip)) continue;
      zipRows.push({
        zip_code: zip,
        pwsid: pwsid.trim(),
        pws_name: null,
        population_served: null,
        source_type: null,
        mapping_tier: 1,
        confidence: "high",
        is_primary: false,
        manually_verified: false,
      });
    }
    console.log(`  loaded ${zipRows.length.toLocaleString()} UCMR-5 zip mappings`);
  }

  // Layer SDWIS zip mappings on top (Tier 1, 'high' confidence) if available
  const sdwisZipPath = path.join(DATA_DIR, "sdwis-zip-crosswalk.json");
  if (fs.existsSync(sdwisZipPath)) {
    const sdwisZips: { zip_code: string; pwsid: string }[] = JSON.parse(
      fs.readFileSync(sdwisZipPath, "utf-8")
    );
    const seen = new Set(zipRows.map((r) => `${r.zip_code}|${r.pwsid}`));
    let added = 0;
    for (const z of sdwisZips) {
      const key = `${z.zip_code}|${z.pwsid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      zipRows.push({
        zip_code: z.zip_code,
        pwsid: z.pwsid,
        pws_name: null,
        population_served: null,
        source_type: null,
        mapping_tier: 1,
        confidence: "high",
        is_primary: false,
        manually_verified: false,
      });
      added++;
    }
    console.log(`  added ${added.toLocaleString()} additional SDWIS zip mappings`);
  }

  // Filter out zip mappings whose PWSID is not in our water_systems table
  const validPwsids = new Set(systemsRows.map((s) => s.pwsid));
  const before = zipRows.length;
  const filtered = zipRows.filter((z) => validPwsids.has(z.pwsid));
  console.log(
    `  filtered to ${filtered.length.toLocaleString()} mappings with known PWSIDs (dropped ${before - filtered.length})`
  );

  // Determine is_primary per zip: largest population_served wins.
  // Without population data we mark the first PWSID seen per zip.
  const byZip = new Map<string, any[]>();
  for (const z of filtered) {
    if (!byZip.has(z.zip_code)) byZip.set(z.zip_code, []);
    byZip.get(z.zip_code)!.push(z);
  }
  const popLookup = new Map(systemsRows.map((s) => [s.pwsid, s.population_served ?? 0]));
  for (const [, mappings] of byZip) {
    mappings.sort(
      (a, b) => (popLookup.get(b.pwsid) ?? 0) - (popLookup.get(a.pwsid) ?? 0)
    );
    mappings[0].is_primary = true;
  }

  await upsertChunked("zip_to_water_system", filtered, "zip_code,pwsid");
  console.log(`  ${filtered.length.toLocaleString()} zip mappings upserted`);

  console.log(`\nSeed complete. Loaded ${systemsRows.length} water systems, ${detectionRows.length} detections, ${filtered.length} zip mappings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
