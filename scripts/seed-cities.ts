/**
 * Populate the cities table with the 10 Wave 1 launch cities, joining
 * each city to the best primary water system identified during launch
 * city verification.
 *
 * Run: npm run data:seed-cities
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

/**
 * Manual primary-PWSID assignments for the 10 launch cities, derived from
 * Mission 2 research + launch-city verification. We hard-code the primary
 * system rather than guessing from population_served because (a) we don't
 * yet have SDWIS population data and (b) the "right" primary system for
 * the page is the one that matches the city government's water utility,
 * not necessarily the largest PWSID serving any of its zip codes.
 */
const PRIMARY_PWSID: Record<string, string> = {
  "calhoun-ga": "GA1290000", // CALHOUN
  "merrimack-nh": "NH1531010", // MERRIMACK VILLAGE DIST
  "oscoda-mi": "MI0005040", // OSCODA TOWNSHIP
  "peshtigo-wi": "WI4380442", // PESHTIGO WATERWORKS
  "newburgh-ny": "NY3503549", // NEWBURGH CITY
  "stuart-fl": "FL4430259", // STUART, CITY OF - WATER PLANT
  "hoosick-falls-ny": "NY4100041", // HOOSICK FALLS (V) PWS
  "bennington-vt": "VT0005016", // BENNINGTON WATER DEPT
  "parchment-mi": "MI0003520", // KALAMAZOO (Parchment now on Kalamazoo system)
  "warminster-pa": "PA1090069", // WARMINSTER MUNICIPAL AUTHORITY
};

/** Approximate city centroids (lat/lng) for the 10 launch cities. */
const CITY_COORDS: Record<string, [number, number]> = {
  "calhoun-ga": [34.5026, -84.9510],
  "merrimack-nh": [42.8651, -71.4937],
  "oscoda-mi": [44.4350, -83.3308],
  "peshtigo-wi": [45.0541, -87.7472],
  "newburgh-ny": [41.5034, -74.0104],
  "stuart-fl": [27.1973, -80.2528],
  "hoosick-falls-ny": [42.9020, -73.3540],
  "bennington-vt": [42.8781, -73.1968],
  "parchment-mi": [42.3267, -85.5694],
  "warminster-pa": [40.2065, -75.0899],
};

async function main() {
  for (const city of LAUNCH_CITIES) {
    const primary = PRIMARY_PWSID[city.slug];
    const coords = CITY_COORDS[city.slug];

    // Look up primary system grade/worst compound
    const { data: sys } = await sb
      .from("water_systems")
      .select("pwsid,pws_name,grade,worst_compound,worst_ratio,total_pfas_detected")
      .eq("pwsid", primary)
      .single();

    if (!sys) {
      console.warn(`  ${city.slug}: primary PWSID ${primary} not found`);
    }

    // Count total detections + exceedances across all PWSIDs serving the city's zips
    const { data: maps } = await sb
      .from("zip_to_water_system")
      .select("pwsid")
      .in("zip_code", city.zips as unknown as string[]);
    const pwsids = [...new Set((maps ?? []).map((m) => m.pwsid))];

    let total_detections = 0;
    let total_exceedances = 0;
    if (pwsids.length) {
      const { data: dets } = await sb
        .from("detections")
        .select("detection_count,mcl_ratio")
        .in("pwsid", pwsids);
      for (const d of dets ?? []) {
        if ((d.detection_count ?? 0) > 0) total_detections++;
        if ((d.mcl_ratio ?? 0) > 1) total_exceedances++;
      }
    }

    const row = {
      slug: city.slug,
      city_name: city.city,
      state_code: city.state,
      state_name: city.stateName,
      population: city.population,
      systems_count: pwsids.length,
      primary_pwsid: primary,
      grade: sys?.grade ?? null,
      worst_compound: sys?.worst_compound ?? null,
      worst_ratio: sys?.worst_ratio ?? null,
      total_detections,
      total_exceedances,
      latitude: coords?.[0] ?? null,
      longitude: coords?.[1] ?? null,
      contamination_source: city.contaminationSource,
      settlement_status: city.settlementStatus,
      news_hook: city.newsHook,
      launch_wave: 1,
    };

    const { error } = await sb.from("cities").upsert(row, { onConflict: "slug" });
    if (error) {
      console.error(`  ${city.slug}: ${error.message}`);
    } else {
      console.log(
        `  ${city.slug.padEnd(20)} -> ${primary} grade=${sys?.grade ?? "?"} systems=${pwsids.length} detects=${total_detections} excd=${total_exceedances}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
