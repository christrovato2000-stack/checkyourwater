/**
 * Populate the cities table with the 10 Wave 2 launch cities.
 *
 * Wave 2 brings the site from 10 -> 20 monitored cities. Each city is joined
 * to the primary water system identified during the discover-wave2 sweep.
 *
 * Run: npx tsx scripts/seed-wave2-cities.ts
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

interface Wave2 {
  slug: string;
  city: string;
  state: string;
  stateName: string;
  zips: string[];
  population: number;
  primaryPwsid: string;
  contamination_source: string;
  settlement_status: string | null;
  news_hook: string;
}

/**
 * Primary PWSID picks come from `npx tsx scripts/discover-wave2.ts`. We
 * choose the system that matches the city government's water utility, even
 * if a larger neighboring system shows up in the same zip code.
 *
 * Notes on the picks:
 *  - Rockford MI: Plainfield Township is the system that absorbed the
 *    Wolverine Worldwide PFAS plume; the small Rockford-only system shows
 *    no detections.
 *  - Security-Widefield CO: Widefield WSD is the AFFF-impacted system
 *    (Peterson SFB), grade D, PFOS @ 2.5× MCL.
 *  - French Island WI: La Crosse Waterworks is what residents were moved
 *    onto after AFFF contamination from La Crosse Regional Airport.
 *  - Parkersburg WV: Parkersburg Utility Board is the city utility (grade
 *    F, PFOA @ 7.3×); Lubeck PSD is even worse (44.9× MCL) and is mentioned
 *    in the news hook.
 */
const WAVE2_CITIES: Wave2[] = [
  {
    slug: "marinette-wi",
    city: "Marinette",
    state: "WI",
    stateName: "Wisconsin",
    zips: ["54143"],
    population: 10800,
    primaryPwsid: "WI4380395",
    contamination_source: "Tyco/Johnson Controls manufacturing",
    settlement_status: "Tyco/Johnson Controls settlement funds flowing; paired with Peshtigo",
    news_hook: "Tyco settlement funds flowing",
  },
  {
    slug: "rockford-mi",
    city: "Rockford",
    state: "MI",
    stateName: "Michigan",
    zips: ["49341"],
    population: 6300,
    primaryPwsid: "MI0005370",
    contamination_source: "Wolverine World Wide shoe manufacturing",
    settlement_status: "Wolverine Worldwide litigation; ongoing remediation",
    news_hook: "Wolverine Worldwide litigation",
  },
  {
    slug: "security-widefield-co",
    city: "Security-Widefield",
    state: "CO",
    stateName: "Colorado",
    zips: ["80911", "80925"],
    population: 38000,
    primaryPwsid: "CO0121900",
    contamination_source: "Peterson Space Force Base (AFFF)",
    settlement_status: "DoD remediation; community on alternate supply",
    news_hook: "Military base cleanup",
  },
  {
    slug: "french-island-wi",
    city: "French Island",
    state: "WI",
    stateName: "Wisconsin",
    zips: ["54603"],
    population: 4200,
    primaryPwsid: "WI6320309",
    contamination_source: "La Crosse Regional Airport (AFFF)",
    settlement_status: "Town of Campbell residents connected to La Crosse municipal supply",
    news_hook: "AFFF airport contamination",
  },
  {
    slug: "hastings-mn",
    city: "Hastings",
    state: "MN",
    stateName: "Minnesota",
    zips: ["55033"],
    population: 22600,
    primaryPwsid: "MN1190012",
    contamination_source: "3M manufacturing facilities",
    settlement_status: "3M Washington County settlement funds available",
    news_hook: "3M Washington County settlement",
  },
  {
    slug: "airway-heights-wa",
    city: "Airway Heights",
    state: "WA",
    stateName: "Washington",
    zips: ["99001"],
    population: 9500,
    primaryPwsid: "WA5300650",
    contamination_source: "Fairchild Air Force Base (AFFF)",
    settlement_status: "DoD remediation; alternate supply since 2017",
    news_hook: "Fairchild AFB remediation",
  },
  {
    slug: "decatur-al",
    city: "Decatur",
    state: "AL",
    stateName: "Alabama",
    zips: ["35601", "35602", "35603"],
    population: 57000,
    primaryPwsid: "AL0001084",
    contamination_source: "3M/Daikin manufacturing",
    settlement_status: "3M $98M settlement; environmental justice community",
    news_hook: "3M $98M settlement, environmental justice",
  },
  {
    slug: "paulsboro-nj",
    city: "Paulsboro",
    state: "NJ",
    stateName: "New Jersey",
    zips: ["08066"],
    population: 6000,
    primaryPwsid: "NJ0814001",
    contamination_source: "Industrial contamination",
    settlement_status: "Subject to NJ's 13 ppt PFNA / 14 ppt PFOA standards (strictest in nation)",
    news_hook: "NJ strictest PFAS standards in nation",
  },
  {
    slug: "rhinelander-wi",
    city: "Rhinelander",
    state: "WI",
    stateName: "Wisconsin",
    zips: ["54501"],
    population: 7700,
    primaryPwsid: "WI7440126",
    contamination_source: "Industrial/municipal sources",
    settlement_status: "Active WI DNR investigation; part of statewide PFAS cluster",
    news_hook: "Wisconsin PFAS cluster",
  },
  {
    slug: "parkersburg-wv",
    city: "Parkersburg",
    state: "WV",
    stateName: "West Virginia",
    zips: ["26101", "26102", "26104"],
    population: 29000,
    primaryPwsid: "WV3305407",
    contamination_source: "DuPont Washington Works plant",
    settlement_status: "DuPont/Chemours settlement; C8 Health Project legacy",
    news_hook: "Dark Waters film, DuPont C8 origin story (Lubeck PSD nearby at 44.9× MCL)",
  },
];

async function main() {
  for (const city of WAVE2_CITIES) {
    const { data: sys } = await sb
      .from("water_systems")
      .select("pwsid, pws_name, grade, worst_compound, worst_ratio, total_pfas_detected, latitude, longitude")
      .eq("pwsid", city.primaryPwsid)
      .single();

    if (!sys) {
      console.warn(`  ${city.slug}: primary PWSID ${city.primaryPwsid} not found`);
      continue;
    }

    // Count detections + exceedances across all systems serving the city's zips.
    const { data: maps } = await sb
      .from("zip_to_water_system")
      .select("pwsid")
      .in("zip_code", city.zips);
    const pwsids = [...new Set((maps ?? []).map((m) => m.pwsid))];
    if (!pwsids.includes(city.primaryPwsid)) pwsids.push(city.primaryPwsid);

    let total_detections = 0;
    let total_exceedances = 0;
    if (pwsids.length) {
      const { data: dets } = await sb
        .from("detections")
        .select("detection_count, mcl_ratio")
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
      primary_pwsid: city.primaryPwsid,
      grade: sys.grade ?? null,
      worst_compound: sys.worst_compound ?? null,
      worst_ratio: sys.worst_ratio ?? null,
      total_detections,
      total_exceedances,
      latitude: sys.latitude ?? null,
      longitude: sys.longitude ?? null,
      contamination_source: city.contamination_source,
      settlement_status: city.settlement_status,
      news_hook: city.news_hook,
      launch_wave: 2,
    };

    const { error } = await sb.from("cities").upsert(row, { onConflict: "slug" });
    if (error) {
      console.error(`  ${city.slug}: ${error.message}`);
    } else {
      console.log(
        `  ${city.slug.padEnd(22)} -> ${city.primaryPwsid} grade=${sys.grade ?? "?"} systems=${pwsids.length} detects=${total_detections} excd=${total_exceedances}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
